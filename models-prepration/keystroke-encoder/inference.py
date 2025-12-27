import torch
import pandas as pd
import numpy as np
import argparse
import logging
import pickle
import os
from typing import List, Dict, Union, Optional
from tqdm import tqdm

from config import Config
from model import KeystrokeLSTMEncoder
from data_processor import DataProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KeystrokeEncoder:
    """Inference class for keystroke dynamics encoder"""
    
    def __init__(self, model_path: str, metadata_path: str = None, config_path: str = None):
        """
        Initialize the encoder
        
        Args:
            model_path: Path to the trained model checkpoint
            metadata_path: Path to metadata file (optional, will try to find automatically)
            config_path: Path to config file (optional, will try to find automatically)
        """
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Load model and metadata
        self.model_dir = os.path.dirname(model_path)
        self._load_model(model_path)
        self._load_metadata(metadata_path)
        self._load_config(config_path)
        
        # Initialize data processor for preprocessing
        self.data_processor = DataProcessor(self.config)
        self.data_processor.char_to_idx = self.metadata['char_to_idx']
        self.data_processor.idx_to_char = self.metadata['idx_to_char']
        self.data_processor.scaler = self.metadata['scaler']
        self.data_processor.vocab_size = self.metadata['vocab_size']
        
        logger.info("Keystroke encoder initialized successfully")
    
    def _load_model(self, model_path: str):
        """Load the trained model"""
        logger.info(f"Loading model from {model_path}")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        checkpoint = torch.load(model_path, map_location=self.device)
        
        # Extract config from checkpoint if available
        self.checkpoint_config = checkpoint.get('config', {})
        
        # Store checkpoint for later model initialization
        self.checkpoint = checkpoint
    
    def _load_metadata(self, metadata_path: str = None):
        """Load metadata (vocabulary, scaler, etc.)"""
        if metadata_path is None:
            metadata_path = os.path.join(self.model_dir, 'metadata.pkl')
        
        logger.info(f"Loading metadata from {metadata_path}")
        
        if not os.path.exists(metadata_path):
            raise FileNotFoundError(f"Metadata file not found: {metadata_path}")
        
        with open(metadata_path, 'rb') as f:
            self.metadata = pickle.load(f)
        
        logger.info(f"Loaded metadata with vocabulary size: {self.metadata['vocab_size']}")
    
    def _load_config(self, config_path: str = None):
        """Load configuration"""
        if config_path is None:
            config_path = os.path.join(self.model_dir, 'config.yaml')
        
        if os.path.exists(config_path):
            logger.info(f"Loading config from {config_path}")
            self.config = Config(config_path)
        else:
            logger.info("Config file not found, using checkpoint config")
            self.config = Config()
            if self.checkpoint_config:
                self.config.config = self.checkpoint_config
        
        # Initialize model now that we have config and metadata
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the model with loaded weights"""
        self.model = KeystrokeLSTMEncoder(self.config, self.metadata['vocab_size'])
        self.model.load_state_dict(self.checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        logger.info("Model initialized and set to evaluation mode")
    
    def preprocess_csv(self, csv_path: str) -> List[List[Dict]]:
        """Preprocess CSV data for inference"""
        logger.info(f"Preprocessing CSV data from {csv_path}")
        
        # Load CSV
        df = self.data_processor.load_csv_data(csv_path)
        
        # Preprocess data
        sequences = self.data_processor.preprocess_data(df)
        
        # Normalize features using the saved scaler
        normalized_sequences = []
        for sequence in sequences:
            normalized_sequence = []
            for keystroke in sequence:
                features = np.array([[
                    keystroke['dwellTime'],
                    keystroke['flightTime'],
                    keystroke['x'],
                    keystroke['y']
                ]])
                
                normalized_features = self.data_processor.scaler.transform(features)[0]
                
                normalized_keystroke = keystroke.copy()
                normalized_keystroke.update({
                    'dwellTime': float(normalized_features[0]),
                    'flightTime': float(normalized_features[1]),
                    'x': float(normalized_features[2]),
                    'y': float(normalized_features[3])
                })
                
                normalized_sequence.append(normalized_keystroke)
            
            normalized_sequences.append(normalized_sequence)
        
        return normalized_sequences
    
    def sequence_to_tensor(self, sequence: List[Dict]) -> Dict[str, torch.Tensor]:
        """Convert a single sequence to tensor format"""
        max_length = self.config.get('data.max_sequence_length', 500)
        
        # Prepare character indices and numerical features
        char_indices = []
        numerical_features = []
        
        for keystroke in sequence:
            char = keystroke['character']
            char_idx = self.data_processor.char_to_idx.get(char, self.data_processor.char_to_idx['<UNK>'])
            char_indices.append(char_idx)
            
            features = [
                keystroke['dwellTime'],
                keystroke['flightTime'],
                keystroke['x'],
                keystroke['y']
            ]
            numerical_features.append(features)
        
        # Handle sequence length
        seq_len = len(char_indices)
        if seq_len > max_length:
            char_indices = char_indices[:max_length]
            numerical_features = numerical_features[:max_length]
            seq_len = max_length
        else:
            # Pad with zeros
            pad_length = max_length - seq_len
            char_indices.extend([self.data_processor.char_to_idx['<PAD>']] * pad_length)
            numerical_features.extend([[0.0, 0.0, 0.0, 0.0]] * pad_length)
        
        # Convert to tensors
        char_tensor = torch.tensor([char_indices], dtype=torch.long)  # Add batch dimension
        features_tensor = torch.tensor([numerical_features], dtype=torch.float32)
        length_tensor = torch.tensor([seq_len], dtype=torch.long)
        
        return {
            'char_indices': char_tensor.to(self.device),
            'numerical_features': features_tensor.to(self.device),
            'sequence_length': length_tensor.to(self.device)
        }
    
    def encode_sequence(self, sequence: List[Dict]) -> np.ndarray:
        """Encode a single keystroke sequence to vector representation"""
        batch = self.sequence_to_tensor(sequence)
        
        with torch.no_grad():
            embeddings = self.model.encode(batch)
            return embeddings.cpu().numpy()[0]  # Remove batch dimension
    
    def encode_sequences(self, sequences: List[List[Dict]], batch_size: int = 32) -> np.ndarray:
        """Encode multiple keystroke sequences"""
        logger.info(f"Encoding {len(sequences)} sequences")
        
        all_embeddings = []
        
        # Process in batches
        for i in tqdm(range(0, len(sequences), batch_size), desc="Encoding sequences"):
            batch_sequences = sequences[i:i + batch_size]
            batch_embeddings = []
            
            for sequence in batch_sequences:
                embedding = self.encode_sequence(sequence)
                batch_embeddings.append(embedding)
            
            all_embeddings.extend(batch_embeddings)
        
        return np.array(all_embeddings)
    
    def encode_csv(self, csv_path: str, output_path: str = None, batch_size: int = 32) -> np.ndarray:
        """Encode keystroke data from CSV file"""
        # Preprocess CSV data
        sequences = self.preprocess_csv(csv_path)
        
        if not sequences:
            logger.warning("No valid sequences found in CSV file")
            return np.array([])
        
        # Encode sequences
        embeddings = self.encode_sequences(sequences, batch_size)
        
        # Save embeddings if output path is provided
        if output_path:
            logger.info(f"Saving embeddings to {output_path}")
            np.save(output_path, embeddings)
        
        logger.info(f"Generated {len(embeddings)} embeddings of dimension {embeddings.shape[1]}")
        return embeddings
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of output embeddings"""
        return self.model.get_embedding_dim()
    
    def get_vocabulary(self) -> Dict[str, int]:
        """Get the character vocabulary"""
        return self.metadata['char_to_idx']
    
    def similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Compute cosine similarity between two embeddings"""
        # Normalize embeddings
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # Compute cosine similarity
        similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
        return float(similarity)
    
    def find_similar_sequences(self, query_embedding: np.ndarray, 
                             candidate_embeddings: np.ndarray, 
                             top_k: int = 5) -> List[Tuple[int, float]]:
        """Find most similar sequences to a query embedding"""
        similarities = []
        
        for i, candidate in enumerate(candidate_embeddings):
            sim = self.similarity(query_embedding, candidate)
            similarities.append((i, sim))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]

def main():
    """Main inference function"""
    parser = argparse.ArgumentParser(description='Generate embeddings for keystroke dynamics')
    parser.add_argument('--model', type=str, required=True, help='Path to trained model')
    parser.add_argument('--input', type=str, required=True, help='Path to input CSV file')
    parser.add_argument('--output', type=str, help='Path to save embeddings (.npy file)')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size for inference')
    parser.add_argument('--metadata', type=str, help='Path to metadata file')
    parser.add_argument('--config', type=str, help='Path to config file')
    
    args = parser.parse_args()
    
    # Initialize encoder
    encoder = KeystrokeEncoder(
        model_path=args.model,
        metadata_path=args.metadata,
        config_path=args.config
    )
    
    # Generate embeddings
    embeddings = encoder.encode_csv(
        csv_path=args.input,
        output_path=args.output,
        batch_size=args.batch_size
    )
    
    # Print summary
    logger.info(f"Successfully generated {len(embeddings)} embeddings")
    logger.info(f"Embedding dimension: {embeddings.shape[1]}")
    
    if args.output:
        logger.info(f"Embeddings saved to: {args.output}")
    else:
        logger.info("Embeddings not saved (no output path specified)")

if __name__ == '__main__':
    main()
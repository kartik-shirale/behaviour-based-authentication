import torch
import numpy as np
import pandas as pd
import pickle
import argparse
import logging
import json
from typing import List, Dict, Union
from pathlib import Path

from config import Config
from model import TouchLSTMEncoder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TouchEncoder:
    """High-level interface for touch dynamics encoding"""
    
    def __init__(self, model_path: str, metadata_path: str = None, 
                 config_path: str = None, device: str = None):
        """
        Initialize the touch encoder
        
        Args:
            model_path: Path to trained model checkpoint
            metadata_path: Path to metadata file (auto-detected if None)
            config_path: Path to config file (auto-detected if None)
            device: Device to use ('cuda', 'cpu', or None for auto)
        """
        self.model_dir = Path(model_path).parent
        
        # Auto-detect paths if not provided
        if metadata_path is None:
            metadata_path = self.model_dir / 'metadata.pkl'
        if config_path is None:
            config_path = self.model_dir / 'config.yaml'
        
        # Determine device
        if device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self.device = torch.device(device)
        
        logger.info(f"Using device: {self.device}")
        
        # Load config
        self.config = Config(str(config_path) if config_path.exists() else None)
        
        # Load metadata
        if Path(metadata_path).exists():
            with open(metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
            self.scaler = self.metadata.get('scaler')
            self.feature_names = self.metadata.get('feature_names', [
                'startX', 'startY', 'endX', 'endY', 
                'duration', 'distance', 'velocity'
            ])
            self.max_length = self.metadata.get('max_length', 100)
        else:
            logger.warning("Metadata file not found, using defaults")
            self.scaler = None
            self.feature_names = [
                'startX', 'startY', 'endX', 'endY', 
                'duration', 'distance', 'velocity'
            ]
            self.max_length = 100
        
        # Load model
        self.model = TouchLSTMEncoder(self.config)
        checkpoint = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        logger.info(f"Loaded model from {model_path}")
    
    def _preprocess_sequence(self, sequence: List[Dict]) -> Dict[str, torch.Tensor]:
        """Preprocess a single gesture sequence"""
        seq_len = min(len(sequence), self.max_length)
        
        # Extract features
        features = np.zeros((1, self.max_length, len(self.feature_names)))
        for i, gesture in enumerate(sequence[:self.max_length]):
            for j, feature_name in enumerate(self.feature_names):
                features[0, i, j] = gesture.get(feature_name, 0.0)
        
        # Normalize if scaler is available
        if self.scaler is not None:
            original_shape = features.shape
            features_flat = features.reshape(-1, len(self.feature_names))
            features_normalized = self.scaler.transform(features_flat)
            features = features_normalized.reshape(original_shape)
        
        # Create mask
        mask = np.zeros((1, self.max_length), dtype=np.bool_)
        mask[0, :seq_len] = True
        
        return {
            'features': torch.tensor(features, dtype=torch.float32).to(self.device),
            'sequence_length': torch.tensor([seq_len], dtype=torch.long).to(self.device),
            'mask': torch.tensor(mask, dtype=torch.bool).to(self.device)
        }
    
    def encode_sequence(self, sequence: List[Dict]) -> np.ndarray:
        """
        Encode a single gesture sequence
        
        Args:
            sequence: List of gesture dictionaries
        
        Returns:
            embedding: 1D numpy array of shape (output_dim,)
        """
        batch = self._preprocess_sequence(sequence)
        
        with torch.no_grad():
            embedding = self.model.encode(batch)
        
        return embedding.cpu().numpy().squeeze()
    
    def encode_sequences(self, sequences: List[List[Dict]], 
                         batch_size: int = 32) -> np.ndarray:
        """
        Encode multiple gesture sequences
        
        Args:
            sequences: List of gesture sequences
            batch_size: Batch size for processing
        
        Returns:
            embeddings: 2D numpy array of shape (num_sequences, output_dim)
        """
        all_embeddings = []
        
        for i in range(0, len(sequences), batch_size):
            batch_sequences = sequences[i:i + batch_size]
            batch_embeddings = []
            
            for seq in batch_sequences:
                embedding = self.encode_sequence(seq)
                batch_embeddings.append(embedding)
            
            all_embeddings.extend(batch_embeddings)
        
        return np.array(all_embeddings)
    
    def encode_csv(self, csv_path: str, session_column: str = 'session_id') -> np.ndarray:
        """
        Encode gesture sequences from a CSV file
        
        Args:
            csv_path: Path to CSV file
            session_column: Column name for session grouping
        
        Returns:
            embeddings: 2D numpy array
        """
        df = pd.read_csv(csv_path)
        
        sequences = []
        if session_column in df.columns:
            for _, group in df.groupby(session_column):
                sequence = []
                for _, row in group.iterrows():
                    gesture = {f: float(row.get(f, 0)) for f in self.feature_names}
                    sequence.append(gesture)
                sequences.append(sequence)
        else:
            sequence = []
            for _, row in df.iterrows():
                gesture = {f: float(row.get(f, 0)) for f in self.feature_names}
                sequence.append(gesture)
            sequences.append(sequence)
        
        return self.encode_sequences(sequences)
    
    def encode_json(self, json_path: str) -> np.ndarray:
        """
        Encode gesture sequences from a JSON file
        
        Args:
            json_path: Path to JSON file
        
        Returns:
            embeddings: 2D numpy array
        """
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        if isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], list):
                # List of sequences
                return self.encode_sequences(data)
            else:
                # Single sequence
                return self.encode_sequence(data).reshape(1, -1)
        
        return np.array([])
    
    def find_similar_sequences(self, query_embedding: np.ndarray, 
                                database_embeddings: np.ndarray,
                                top_k: int = 5) -> np.ndarray:
        """
        Find most similar sequences using cosine similarity
        
        Args:
            query_embedding: Query embedding (1D array)
            database_embeddings: Database of embeddings (2D array)
            top_k: Number of similar sequences to return
        
        Returns:
            indices: Indices of top-k similar sequences
        """
        # Normalize embeddings
        query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
        db_norms = database_embeddings / (np.linalg.norm(database_embeddings, axis=1, keepdims=True) + 1e-8)
        
        # Compute similarities
        similarities = np.dot(db_norms, query_norm)
        
        # Get top-k indices
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        return top_indices
    
    def get_embedding_dim(self) -> int:
        """Get the dimension of output embeddings"""
        return self.model.get_embedding_dim()


def main():
    parser = argparse.ArgumentParser(description='Touch Dynamics Inference')
    parser.add_argument('--model', type=str, required=True,
                        help='Path to trained model checkpoint')
    parser.add_argument('--input', type=str, required=True,
                        help='Path to input data (CSV or JSON)')
    parser.add_argument('--output', type=str, default=None,
                        help='Path to save embeddings as .npy file')
    parser.add_argument('--batch_size', type=int, default=32,
                        help='Batch size for inference')
    args = parser.parse_args()
    
    # Initialize encoder
    encoder = TouchEncoder(args.model)
    
    # Process input
    if args.input.endswith('.json'):
        embeddings = encoder.encode_json(args.input)
    else:
        embeddings = encoder.encode_csv(args.input)
    
    logger.info(f"Generated {len(embeddings)} embeddings of dimension {embeddings.shape[1]}")
    
    # Save embeddings
    if args.output:
        np.save(args.output, embeddings)
        logger.info(f"Saved embeddings to {args.output}")
    
    return embeddings


if __name__ == '__main__':
    main()

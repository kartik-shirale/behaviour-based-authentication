import torch
import numpy as np
import pandas as pd
from typing import Union, List, Dict, Tuple, Optional
import os
import pickle
from sklearn.metrics.pairwise import cosine_similarity

from model import MotionSensorEncoder, create_model
from data_processor import MotionSensorProcessor
from config import Config

class MotionSensorInference:
    """Inference class for motion sensor fraud detection."""
    
    def __init__(
        self,
        model_path: str,
        processor_path: str = None,
        device: torch.device = None
    ):
        """Initialize inference engine.
        
        Args:
            model_path: Path to trained model file
            processor_path: Path to data processor file
            device: Device to run inference on
        """
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_path = model_path
        self.processor_path = processor_path or model_path.replace('.pt', '_processor.pkl')
        
        # Load model and processor
        self.model = self._load_model()
        self.processor = self._load_processor()
        
        # Set model to evaluation mode
        self.model.eval()
        
        print(f"Loaded model from {model_path}")
        print(f"Loaded processor from {self.processor_path}")
        print(f"Using device: {self.device}")
    
    def _load_model(self) -> MotionSensorEncoder:
        """Load trained model from checkpoint.
        
        Returns:
            Loaded MotionSensorEncoder model
        """
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found: {self.model_path}")
        
        # Load checkpoint
        checkpoint = torch.load(self.model_path, map_location=self.device)
        
        # Create model from configuration
        model_config = checkpoint.get('model_config', {})
        model = create_model(model_config)
        
        # Load model state
        model.load_state_dict(checkpoint['model_state_dict'])
        model.to(self.device)
        
        return model
    
    def _load_processor(self) -> MotionSensorProcessor:
        """Load data processor from file.
        
        Returns:
            Loaded MotionSensorProcessor
        """
        if not os.path.exists(self.processor_path):
            raise FileNotFoundError(f"Processor file not found: {self.processor_path}")
        
        return MotionSensorProcessor.load_processor(self.processor_path)
    
    def _prepare_input(
        self, 
        data: Union[pd.DataFrame, np.ndarray, List[Dict]]
    ) -> torch.Tensor:
        """Prepare input data for inference.
        
        Args:
            data: Input motion sensor data
            
        Returns:
            Prepared tensor for model input
        """
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            # Convert list of dictionaries to DataFrame
            df = pd.DataFrame(data)
        elif isinstance(data, np.ndarray):
            # Convert numpy array to DataFrame
            if data.shape[1] != len(self.processor.required_columns):
                raise ValueError(
                    f"Input array must have {len(self.processor.required_columns)} columns, "
                    f"got {data.shape[1]}"
                )
            df = pd.DataFrame(data, columns=self.processor.required_columns)
            df['user_id'] = 'unknown'  # Add dummy user_id
        elif isinstance(data, pd.DataFrame):
            df = data.copy()
        else:
            raise ValueError("Input data must be DataFrame, numpy array, or list of dictionaries")
        
        # Ensure user_id column exists
        if 'user_id' not in df.columns:
            df['user_id'] = 'unknown'
        
        # Process data using the loaded processor
        sequences, labels, user_ids = self.processor.process_data(df)
        
        if not sequences:
            raise ValueError("No valid sequences could be created from input data")
        
        # Convert to tensor
        sequences_tensor = torch.FloatTensor(np.array(sequences))
        
        return sequences_tensor
    
    def get_embedding(
        self, 
        data: Union[pd.DataFrame, np.ndarray, List[Dict]]
    ) -> np.ndarray:
        """Get embeddings for input motion sensor data.
        
        Args:
            data: Input motion sensor data
            
        Returns:
            Normalized embeddings as numpy array
        """
        # Prepare input
        input_tensor = self._prepare_input(data).to(self.device)
        
        # Get embeddings
        with torch.no_grad():
            embeddings = self.model.get_embedding(input_tensor)
        
        return embeddings.cpu().numpy()
    
    def get_single_embedding(
        self, 
        sequence: Union[np.ndarray, List[Dict]]
    ) -> np.ndarray:
        """Get embedding for a single motion sensor sequence.
        
        Args:
            sequence: Single motion sensor sequence
            
        Returns:
            Single embedding vector
        """
        if isinstance(sequence, list):
            # Convert list of sensor readings to DataFrame
            df = pd.DataFrame(sequence)
        else:
            # Assume numpy array
            df = pd.DataFrame(sequence, columns=self.processor.required_columns)
        
        df['user_id'] = 'single'
        
        embeddings = self.get_embedding(df)
        
        # Return mean embedding if multiple sequences were created
        return np.mean(embeddings, axis=0)
    
    def compute_similarity(
        self, 
        embedding1: np.ndarray, 
        embedding2: np.ndarray
    ) -> float:
        """Compute cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score
        """
        # Ensure embeddings are 2D
        if embedding1.ndim == 1:
            embedding1 = embedding1.reshape(1, -1)
        if embedding2.ndim == 1:
            embedding2 = embedding2.reshape(1, -1)
        
        similarity = cosine_similarity(embedding1, embedding2)[0, 0]
        return float(similarity)
    
    def predict_authenticity(
        self, 
        data: Union[pd.DataFrame, np.ndarray, List[Dict]],
        user_profile: np.ndarray,
        threshold: float = 0.7
    ) -> Dict[str, Union[bool, float, np.ndarray]]:
        """Predict if motion sensor data is authentic for a user.
        
        Args:
            data: Input motion sensor data
            user_profile: User's reference embedding profile
            threshold: Similarity threshold for authentication
            
        Returns:
            Dictionary containing prediction results
        """
        # Get embedding for input data
        embedding = self.get_embedding(data)
        
        # Compute similarity with user profile
        if embedding.shape[0] == 1:
            # Single sequence
            similarity = self.compute_similarity(embedding[0], user_profile)
            is_authentic = similarity >= threshold
        else:
            # Multiple sequences - use average similarity
            similarities = []
            for emb in embedding:
                sim = self.compute_similarity(emb, user_profile)
                similarities.append(sim)
            
            similarity = np.mean(similarities)
            is_authentic = similarity >= threshold
        
        return {
            'is_authentic': is_authentic,
            'similarity_score': float(similarity),
            'threshold': threshold,
            'embedding': embedding,
            'confidence': float(abs(similarity - threshold))
        }
    
    def create_user_profile(
        self, 
        user_data: Union[pd.DataFrame, List[pd.DataFrame]],
        method: str = 'mean'
    ) -> np.ndarray:
        """Create user profile from multiple motion sensor sessions.
        
        Args:
            user_data: User's motion sensor data (single or multiple sessions)
            method: Method to aggregate embeddings ('mean', 'median')
            
        Returns:
            User profile embedding
        """
        if isinstance(user_data, list):
            # Multiple sessions
            all_embeddings = []
            for session_data in user_data:
                embeddings = self.get_embedding(session_data)
                all_embeddings.append(embeddings)
            
            # Concatenate all embeddings
            all_embeddings = np.vstack(all_embeddings)
        else:
            # Single session
            all_embeddings = self.get_embedding(user_data)
        
        # Aggregate embeddings
        if method == 'mean':
            profile = np.mean(all_embeddings, axis=0)
        elif method == 'median':
            profile = np.median(all_embeddings, axis=0)
        else:
            raise ValueError(f"Unknown aggregation method: {method}")
        
        # Normalize profile
        profile = profile / np.linalg.norm(profile)
        
        return profile
    
    def batch_inference(
        self, 
        data_list: List[Union[pd.DataFrame, np.ndarray, List[Dict]]]
    ) -> List[np.ndarray]:
        """Perform batch inference on multiple data samples.
        
        Args:
            data_list: List of motion sensor data samples
            
        Returns:
            List of embedding arrays
        """
        embeddings_list = []
        
        for data in data_list:
            try:
                embedding = self.get_embedding(data)
                embeddings_list.append(embedding)
            except Exception as e:
                print(f"Error processing sample: {e}")
                embeddings_list.append(None)
        
        return embeddings_list
    
    def get_model_info(self) -> Dict[str, Union[str, int, Dict]]:
        """Get information about the loaded model.
        
        Returns:
            Dictionary containing model information
        """
        # Load checkpoint to get metadata
        checkpoint = torch.load(self.model_path, map_location='cpu')
        
        info = {
            'model_path': self.model_path,
            'processor_path': self.processor_path,
            'device': str(self.device),
            'model_config': checkpoint.get('model_config', {}),
            'training_history': checkpoint.get('training_history', {}),
            'best_loss': checkpoint.get('best_loss', None),
            'epoch': checkpoint.get('epoch', None),
            'processor_stats': self.processor.get_stats()
        }
        
        return info
    
    def save_embeddings(
        self, 
        embeddings: np.ndarray, 
        filepath: str, 
        metadata: Dict = None
    ):
        """Save embeddings to file.
        
        Args:
            embeddings: Embeddings array to save
            filepath: Path to save embeddings
            metadata: Optional metadata dictionary
        """
        save_data = {
            'embeddings': embeddings,
            'metadata': metadata or {},
            'model_path': self.model_path,
            'processor_path': self.processor_path
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(save_data, f)
        
        print(f"Embeddings saved to {filepath}")
    
    @staticmethod
    def load_embeddings(filepath: str) -> Tuple[np.ndarray, Dict]:
        """Load embeddings from file.
        
        Args:
            filepath: Path to embeddings file
            
        Returns:
            Tuple of (embeddings, metadata)
        """
        with open(filepath, 'rb') as f:
            save_data = pickle.load(f)
        
        return save_data['embeddings'], save_data.get('metadata', {})

def main():
    """Example usage of MotionSensorInference."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Motion sensor fraud detection inference')
    parser.add_argument('--model', type=str, required=True,
                       help='Path to trained model file')
    parser.add_argument('--data', type=str, required=True,
                       help='Path to test data CSV file')
    parser.add_argument('--output', type=str, default='embeddings.pkl',
                       help='Path to save embeddings')
    
    args = parser.parse_args()
    
    # Initialize inference engine
    inference = MotionSensorInference(args.model)
    
    # Load test data
    test_data = pd.read_csv(args.data)
    
    # Get embeddings
    embeddings = inference.get_embedding(test_data)
    
    print(f"Generated {len(embeddings)} embeddings of dimension {embeddings.shape[1]}")
    
    # Save embeddings
    inference.save_embeddings(embeddings, args.output)
    
    # Print model info
    model_info = inference.get_model_info()
    print("\nModel Information:")
    for key, value in model_info.items():
        if key not in ['training_history', 'model_config']:
            print(f"  {key}: {value}")

if __name__ == '__main__':
    main()
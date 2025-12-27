import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from typing import List, Tuple, Dict, Optional, Union
import pickle
import os
from collections import defaultdict

class MotionSensorDataset(Dataset):
    """Dataset class for motion sensor fraud detection."""
    
    def __init__(
        self,
        sequences: List[np.ndarray],
        labels: List[int],
        user_ids: List[str],
        transform: Optional[callable] = None
    ):
        """Initialize motion sensor dataset.
        
        Args:
            sequences: List of motion sensor sequences
            labels: List of user labels
            user_ids: List of user identifiers
            transform: Optional data transformation function
        """
        self.sequences = sequences
        self.labels = labels
        self.user_ids = user_ids
        self.transform = transform
        
        assert len(sequences) == len(labels) == len(user_ids), \
            "Sequences, labels, and user_ids must have the same length"
    
    def __len__(self) -> int:
        return len(self.sequences)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int, str]:
        sequence = self.sequences[idx]
        label = self.labels[idx]
        user_id = self.user_ids[idx]
        
        if self.transform:
            sequence = self.transform(sequence)
        
        # Convert to tensor
        sequence_tensor = torch.FloatTensor(sequence)
        
        return sequence_tensor, label, user_id

class MotionSensorProcessor:
    """Data processor for motion sensor fraud detection."""
    
    def __init__(
        self,
        sequence_length: int = 100,
        overlap: float = 0.5,
        required_columns: List[str] = None,
        normalization: str = 'standard',
        min_sequence_length: int = 50
    ):
        """Initialize motion sensor data processor.
        
        Args:
            sequence_length: Length of each motion sensor sequence
            overlap: Overlap ratio between consecutive sequences
            required_columns: List of required sensor data columns
            normalization: Normalization method ('standard', 'minmax', or 'none')
            min_sequence_length: Minimum sequence length to keep
        """
        self.sequence_length = sequence_length
        self.overlap = overlap
        self.normalization = normalization
        self.min_sequence_length = min_sequence_length
        
        # Default required columns for motion sensor data
        self.required_columns = required_columns or [
            'accel_x', 'accel_y', 'accel_z',
            'gyro_x', 'gyro_y', 'gyro_z',
            'mag_x', 'mag_y', 'mag_z',
            'motion_magnitude', 'rotation_rate'
        ]
        
        # Initialize scalers
        self.scaler = None
        self.is_fitted = False
        
        # Statistics for monitoring
        self.stats = {
            'total_sequences': 0,
            'users': set(),
            'feature_stats': {}
        }
    
    def _validate_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate and clean input data.
        
        Args:
            df: Input dataframe
            
        Returns:
            Validated and cleaned dataframe
        """
        # Check required columns
        missing_columns = set(self.required_columns) - set(df.columns)
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Check for user_id column
        if 'user_id' not in df.columns:
            raise ValueError("Missing 'user_id' column")
        
        # Remove rows with missing values
        initial_rows = len(df)
        df = df.dropna(subset=self.required_columns + ['user_id'])
        dropped_rows = initial_rows - len(df)
        
        if dropped_rows > 0:
            print(f"Dropped {dropped_rows} rows with missing values")
        
        # Remove infinite values
        df = df.replace([np.inf, -np.inf], np.nan).dropna()
        
        return df
    
    def _create_sequences(
        self, 
        df: pd.DataFrame
    ) -> Tuple[List[np.ndarray], List[int], List[str]]:
        """Create overlapping sequences from motion sensor data.
        
        Args:
            df: Input dataframe with motion sensor data
            
        Returns:
            Tuple of (sequences, labels, user_ids)
        """
        sequences = []
        labels = []
        user_ids = []
        
        # Create user label mapping
        unique_users = sorted(df['user_id'].unique())
        user_to_label = {user: idx for idx, user in enumerate(unique_users)}
        
        # Calculate step size for overlapping windows
        step_size = max(1, int(self.sequence_length * (1 - self.overlap)))
        
        # Group by user and create sequences
        for user_id, user_data in df.groupby('user_id'):
            user_data = user_data.sort_index()  # Ensure temporal order
            sensor_data = user_data[self.required_columns].values
            
            # Skip users with insufficient data
            if len(sensor_data) < self.min_sequence_length:
                continue
            
            # Create overlapping sequences
            for start_idx in range(0, len(sensor_data) - self.sequence_length + 1, step_size):
                end_idx = start_idx + self.sequence_length
                sequence = sensor_data[start_idx:end_idx]
                
                sequences.append(sequence)
                labels.append(user_to_label[user_id])
                user_ids.append(user_id)
        
        return sequences, labels, user_ids
    
    def _normalize_data(self, sequences: List[np.ndarray]) -> List[np.ndarray]:
        """Normalize motion sensor sequences.
        
        Args:
            sequences: List of motion sensor sequences
            
        Returns:
            List of normalized sequences
        """
        if self.normalization == 'none':
            return sequences
        
        # Flatten sequences for fitting scaler
        flattened_data = np.vstack(sequences)
        
        # Initialize scaler if not fitted
        if not self.is_fitted:
            if self.normalization == 'standard':
                self.scaler = StandardScaler()
            elif self.normalization == 'minmax':
                self.scaler = MinMaxScaler()
            else:
                raise ValueError(f"Unknown normalization method: {self.normalization}")
            
            self.scaler.fit(flattened_data)
            self.is_fitted = True
        
        # Normalize each sequence
        normalized_sequences = []
        for sequence in sequences:
            original_shape = sequence.shape
            flattened = sequence.reshape(-1, sequence.shape[-1])
            normalized = self.scaler.transform(flattened)
            normalized_sequences.append(normalized.reshape(original_shape))
        
        return normalized_sequences
    
    def _compute_statistics(self, sequences: List[np.ndarray], user_ids: List[str]):
        """Compute and store data statistics.
        
        Args:
            sequences: List of motion sensor sequences
            user_ids: List of user identifiers
        """
        self.stats['total_sequences'] = len(sequences)
        self.stats['users'] = set(user_ids)
        
        # Compute feature statistics
        all_data = np.vstack(sequences)
        for i, col_name in enumerate(self.required_columns):
            self.stats['feature_stats'][col_name] = {
                'mean': float(np.mean(all_data[:, i])),
                'std': float(np.std(all_data[:, i])),
                'min': float(np.min(all_data[:, i])),
                'max': float(np.max(all_data[:, i]))
            }
    
    def process_data(
        self, 
        df: pd.DataFrame
    ) -> Tuple[List[np.ndarray], List[int], List[str]]:
        """Process motion sensor data into sequences.
        
        Args:
            df: Input dataframe with motion sensor data
            
        Returns:
            Tuple of (sequences, labels, user_ids)
        """
        # Validate data
        df = self._validate_data(df)
        
        # Create sequences
        sequences, labels, user_ids = self._create_sequences(df)
        
        if not sequences:
            raise ValueError("No valid sequences created from input data")
        
        # Normalize data
        sequences = self._normalize_data(sequences)
        
        # Compute statistics
        self._compute_statistics(sequences, user_ids)
        
        print(f"Processed {len(sequences)} sequences from {len(set(user_ids))} users")
        
        return sequences, labels, user_ids
    
    def create_dataset(
        self, 
        df: pd.DataFrame, 
        transform: Optional[callable] = None
    ) -> MotionSensorDataset:
        """Create motion sensor dataset from dataframe.
        
        Args:
            df: Input dataframe with motion sensor data
            transform: Optional data transformation function
            
        Returns:
            MotionSensorDataset instance
        """
        sequences, labels, user_ids = self.process_data(df)
        return MotionSensorDataset(sequences, labels, user_ids, transform)
    
    def create_dataloader(
        self,
        dataset: MotionSensorDataset,
        batch_size: int = 32,
        shuffle: bool = True,
        num_workers: int = 0
    ) -> DataLoader:
        """Create data loader for motion sensor dataset.
        
        Args:
            dataset: MotionSensorDataset instance
            batch_size: Batch size for data loader
            shuffle: Whether to shuffle data
            num_workers: Number of worker processes
            
        Returns:
            DataLoader instance
        """
        return DataLoader(
            dataset,
            batch_size=batch_size,
            shuffle=shuffle,
            num_workers=num_workers,
            collate_fn=self._collate_fn
        )
    
    def _collate_fn(self, batch: List[Tuple]) -> Tuple[torch.Tensor, torch.Tensor, List[str]]:
        """Custom collate function for batching sequences.
        
        Args:
            batch: List of (sequence, label, user_id) tuples
            
        Returns:
            Batched tensors and user IDs
        """
        sequences, labels, user_ids = zip(*batch)
        
        # Stack sequences and labels
        sequences_tensor = torch.stack(sequences)
        labels_tensor = torch.LongTensor(labels)
        
        return sequences_tensor, labels_tensor, list(user_ids)
    
    def save_processor(self, filepath: str):
        """Save processor state to file.
        
        Args:
            filepath: Path to save processor state
        """
        processor_state = {
            'sequence_length': self.sequence_length,
            'overlap': self.overlap,
            'required_columns': self.required_columns,
            'normalization': self.normalization,
            'min_sequence_length': self.min_sequence_length,
            'scaler': self.scaler,
            'is_fitted': self.is_fitted,
            'stats': self.stats
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(processor_state, f)
    
    @classmethod
    def load_processor(cls, filepath: str) -> 'MotionSensorProcessor':
        """Load processor state from file.
        
        Args:
            filepath: Path to load processor state from
            
        Returns:
            MotionSensorProcessor instance
        """
        with open(filepath, 'rb') as f:
            processor_state = pickle.load(f)
        
        processor = cls(
            sequence_length=processor_state['sequence_length'],
            overlap=processor_state['overlap'],
            required_columns=processor_state['required_columns'],
            normalization=processor_state['normalization'],
            min_sequence_length=processor_state['min_sequence_length']
        )
        
        processor.scaler = processor_state['scaler']
        processor.is_fitted = processor_state['is_fitted']
        processor.stats = processor_state['stats']
        
        return processor
    
    def get_stats(self) -> Dict:
        """Get data processing statistics.
        
        Returns:
            Dictionary containing processing statistics
        """
        return self.stats.copy()

def load_motion_data(filepath: str) -> pd.DataFrame:
    """Load motion sensor data from CSV file.
    
    Args:
        filepath: Path to CSV file
        
    Returns:
        DataFrame containing motion sensor data
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Data file not found: {filepath}")
    
    df = pd.read_csv(filepath)
    
    # Ensure user_id column exists
    if 'user_id' not in df.columns:
        raise ValueError("CSV file must contain 'user_id' column")
    
    return df

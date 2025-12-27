import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from typing import List, Tuple, Dict, Optional
import json
import logging
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TouchDataset(Dataset):
    """Dataset class for touch/gesture dynamics data"""
    
    def __init__(self, sequences: List[List[Dict]], scaler: StandardScaler, 
                 max_length: int, feature_names: List[str]):
        self.sequences = sequences
        self.scaler = scaler
        self.max_length = max_length
        self.feature_names = feature_names
    
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        sequence = self.sequences[idx]
        seq_len = min(len(sequence), self.max_length)
        
        # Extract numerical features
        features = np.zeros((self.max_length, len(self.feature_names)))
        for i, gesture in enumerate(sequence[:self.max_length]):
            for j, feature_name in enumerate(self.feature_names):
                features[i, j] = gesture.get(feature_name, 0.0)
        
        # Create mask for valid positions
        mask = np.zeros(self.max_length, dtype=np.float32)
        mask[:seq_len] = 1.0
        
        return {
            'features': torch.tensor(features, dtype=torch.float32),
            'sequence_length': torch.tensor(seq_len, dtype=torch.long),
            'mask': torch.tensor(mask, dtype=torch.bool)
        }


class DataProcessor:
    """Data processor for touch/gesture dynamics data"""
    
    def __init__(self, config: Config):
        self.config = config
        self.scaler = StandardScaler()
        self.feature_names = [
            'startX', 'startY', 'endX', 'endY', 
            'duration', 'distance', 'velocity'
        ]
    
    def load_json_data(self, json_path: str) -> List[List[Dict]]:
        """Load touch data from JSON file"""
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        logger.info(f"Loaded {len(data)} sessions from JSON")
        return data
    
    def load_csv_data(self, csv_path: str) -> pd.DataFrame:
        """Load touch data from CSV file"""
        df = pd.read_csv(csv_path)
        logger.info(f"Loaded {len(df)} touch events from CSV")
        return df
    
    def preprocess_csv_to_sequences(self, df: pd.DataFrame, 
                                     session_column: str = 'session_id') -> List[List[Dict]]:
        """Convert CSV data to sequences grouped by session"""
        sequences = []
        
        if session_column in df.columns:
            for session_id, group in df.groupby(session_column):
                sequence = []
                for _, row in group.iterrows():
                    gesture = {}
                    for feature in self.feature_names:
                        if feature in row:
                            gesture[feature] = float(row[feature])
                        else:
                            gesture[feature] = 0.0
                    sequence.append(gesture)
                
                if len(sequence) >= self.config.get('data.min_sequence_length', 5):
                    sequences.append(sequence)
        else:
            # Treat entire CSV as one sequence
            sequence = []
            for _, row in df.iterrows():
                gesture = {}
                for feature in self.feature_names:
                    if feature in row:
                        gesture[feature] = float(row[feature])
                    else:
                        gesture[feature] = 0.0
                sequence.append(gesture)
            sequences.append(sequence)
        
        logger.info(f"Created {len(sequences)} gesture sequences")
        return sequences
    
    def normalize_features(self, sequences: List[List[Dict]]) -> List[List[Dict]]:
        """Normalize numerical features using StandardScaler"""
        # Flatten all features for fitting scaler
        all_features = []
        for sequence in sequences:
            for gesture in sequence:
                features = [gesture.get(f, 0.0) for f in self.feature_names]
                all_features.append(features)
        
        if len(all_features) == 0:
            logger.warning("No features to normalize")
            return sequences
        
        # Fit scaler
        all_features = np.array(all_features)
        self.scaler.fit(all_features)
        
        # Normalize each sequence
        normalized_sequences = []
        for sequence in sequences:
            normalized_seq = []
            for gesture in sequence:
                features = np.array([[gesture.get(f, 0.0) for f in self.feature_names]])
                normalized = self.scaler.transform(features)[0]
                
                normalized_gesture = gesture.copy()
                for i, feature_name in enumerate(self.feature_names):
                    normalized_gesture[feature_name] = float(normalized[i])
                normalized_seq.append(normalized_gesture)
            normalized_sequences.append(normalized_seq)
        
        logger.info(f"Normalized features for {len(normalized_sequences)} sequences")
        return normalized_sequences
    
    def create_datasets(self, sequences: List[List[Dict]]) -> Tuple[TouchDataset, TouchDataset]:
        """Create train and validation datasets"""
        max_length = self.config.get('data.max_sequence_length', 100)
        val_split = self.config.get('training.validation_split', 0.2)
        seed = self.config.get('training.random_seed', 42)
        
        # Split data
        train_seq, val_seq = train_test_split(
            sequences, 
            test_size=val_split, 
            random_state=seed
        )
        
        logger.info(f"Split data: {len(train_seq)} train, {len(val_seq)} validation")
        
        # Create datasets
        train_dataset = TouchDataset(train_seq, self.scaler, max_length, self.feature_names)
        val_dataset = TouchDataset(val_seq, self.scaler, max_length, self.feature_names)
        
        return train_dataset, val_dataset
    
    def create_dataloaders(self, train_dataset: TouchDataset, 
                           val_dataset: TouchDataset) -> Tuple[DataLoader, DataLoader]:
        """Create data loaders"""
        batch_size = self.config.get('training.batch_size', 32)
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=batch_size,
            shuffle=True,
            num_workers=0,
            pin_memory=True
        )
        
        val_loader = DataLoader(
            val_dataset,
            batch_size=batch_size,
            shuffle=False,
            num_workers=0,
            pin_memory=True
        )
        
        logger.info(f"Created dataloaders with batch size {batch_size}")
        return train_loader, val_loader
    
    def process_csv(self, csv_path: str) -> Tuple[DataLoader, DataLoader, Dict]:
        """Complete data processing pipeline for CSV"""
        # Load data
        df = self.load_csv_data(csv_path)
        
        # Convert to sequences
        sequences = self.preprocess_csv_to_sequences(df)
        
        # Normalize
        if self.config.get('data.normalize_features', True):
            sequences = self.normalize_features(sequences)
        
        # Create datasets
        train_dataset, val_dataset = self.create_datasets(sequences)
        
        # Create dataloaders
        train_loader, val_loader = self.create_dataloaders(train_dataset, val_dataset)
        
        # Metadata for saving
        metadata = {
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'max_length': self.config.get('data.max_sequence_length', 100)
        }
        
        return train_loader, val_loader, metadata
    
    def process_json(self, json_path: str) -> Tuple[DataLoader, DataLoader, Dict]:
        """Complete data processing pipeline for JSON"""
        # Load data
        sequences = self.load_json_data(json_path)
        
        # Normalize
        if self.config.get('data.normalize_features', True):
            sequences = self.normalize_features(sequences)
        
        # Create datasets
        train_dataset, val_dataset = self.create_datasets(sequences)
        
        # Create dataloaders
        train_loader, val_loader = self.create_dataloaders(train_dataset, val_dataset)
        
        # Metadata for saving
        metadata = {
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'max_length': self.config.get('data.max_sequence_length', 100)
        }
        
        return train_loader, val_loader, metadata

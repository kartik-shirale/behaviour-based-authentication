import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from typing import List, Tuple, Dict, Optional
import logging
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KeystrokeDataset(Dataset):
    """Dataset class for keystroke dynamics data"""
    
    def __init__(self, sequences: List[List[Dict]], char_to_idx: Dict[str, int], 
                 scaler: StandardScaler, max_length: int):
        self.sequences = sequences
        self.char_to_idx = char_to_idx
        self.scaler = scaler
        self.max_length = max_length
    
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        sequence = self.sequences[idx]
        
        # Prepare character indices
        char_indices = []
        numerical_features = []
        
        for keystroke in sequence:
            char = keystroke['character']
            char_idx = self.char_to_idx.get(char, self.char_to_idx['<UNK>'])
            char_indices.append(char_idx)
            
            # Extract numerical features
            features = [
                keystroke['dwellTime'],
                keystroke['flightTime'],
                keystroke['x'],
                keystroke['y']
            ]
            numerical_features.append(features)
        
        # Pad or truncate sequences
        seq_len = len(char_indices)
        if seq_len > self.max_length:
            char_indices = char_indices[:self.max_length]
            numerical_features = numerical_features[:self.max_length]
            seq_len = self.max_length
        else:
            # Pad with zeros
            pad_length = self.max_length - seq_len
            char_indices.extend([self.char_to_idx['<PAD>']] * pad_length)
            numerical_features.extend([[0.0, 0.0, 0.0, 0.0]] * pad_length)
        
        # Convert to tensors
        char_tensor = torch.tensor(char_indices, dtype=torch.long)
        features_tensor = torch.tensor(numerical_features, dtype=torch.float32)
        length_tensor = torch.tensor(seq_len, dtype=torch.long)
        
        return {
            'char_indices': char_tensor,
            'numerical_features': features_tensor,
            'sequence_length': length_tensor
        }

class DataProcessor:
    """Data processor for keystroke dynamics data"""
    
    def __init__(self, config: Config):
        self.config = config
        self.char_to_idx = {}
        self.idx_to_char = {}
        self.scaler = StandardScaler()
        self.vocab_size = 0
    
    def load_csv_data(self, csv_path: str) -> pd.DataFrame:
        """Load keystroke data from CSV file"""
        logger.info(f"Loading data from {csv_path}")
        
        try:
            df = pd.read_csv(csv_path)
            required_columns = ['character', 'dwellTime', 'flightTime', 'x', 'y', 'action']
            
            if not all(col in df.columns for col in required_columns):
                raise ValueError(f"CSV must contain columns: {required_columns}")
            
            logger.info(f"Loaded {len(df)} keystroke records")
            return df
        
        except Exception as e:
            logger.error(f"Error loading CSV data: {e}")
            raise
    
    def preprocess_data(self, df: pd.DataFrame) -> List[List[Dict]]:
        """Preprocess keystroke data into sequences"""
        logger.info("Preprocessing keystroke data")
        
        # Handle special characters
        df['character'] = df['character'].fillna('<UNK>')
        df['character'] = df['character'].astype(str)
        
        # Replace special character representations
        char_mapping = {
            'Space': ' ',
            'space': ' ',
            'Backspace': 'backspace',
            'Enter': 'enter',
            'Return': 'enter'
        }
        
        for old_char, new_char in char_mapping.items():
            df.loc[df['character'] == old_char, 'character'] = new_char
        
        # Fill missing numerical values
        numerical_cols = ['dwellTime', 'flightTime', 'x', 'y']
        for col in numerical_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        # Group by sessions (assuming consecutive keystrokes form a session)
        # For this implementation, we'll treat each continuous sequence as a session
        sequences = []
        current_sequence = []
        
        for _, row in df.iterrows():
            keystroke = {
                'character': row['character'],
                'dwellTime': float(row['dwellTime']),
                'flightTime': float(row['flightTime']),
                'x': float(row['x']),
                'y': float(row['y']),
                'action': int(row['action']) if pd.notna(row['action']) else 0
            }
            
            current_sequence.append(keystroke)
            
            # Simple session boundary detection (can be improved)
            # For now, we'll create sessions of reasonable length
            if len(current_sequence) >= self.config.get('data.max_sequence_length', 500):
                if len(current_sequence) >= self.config.get('data.min_sequence_length', 10):
                    sequences.append(current_sequence.copy())
                current_sequence = []
        
        # Add the last sequence if it's long enough
        if len(current_sequence) >= self.config.get('data.min_sequence_length', 10):
            sequences.append(current_sequence)
        
        logger.info(f"Created {len(sequences)} typing sessions")
        return sequences
    
    def build_vocabulary(self, sequences: List[List[Dict]]) -> None:
        """Build character vocabulary from sequences"""
        logger.info("Building character vocabulary")
        
        # Start with special characters
        special_chars = self.config.get('data.special_chars', ['<PAD>', '<UNK>', 'backspace', 'enter', ' '])
        chars = set(special_chars)
        
        # Add characters from sequences
        for sequence in sequences:
            for keystroke in sequence:
                chars.add(keystroke['character'])
        
        # Create mappings
        self.char_to_idx = {char: idx for idx, char in enumerate(sorted(chars))}
        self.idx_to_char = {idx: char for char, idx in self.char_to_idx.items()}
        self.vocab_size = len(self.char_to_idx)
        
        logger.info(f"Built vocabulary with {self.vocab_size} characters")
    
    def normalize_features(self, sequences: List[List[Dict]]) -> List[List[Dict]]:
        """Normalize numerical features"""
        if not self.config.get('data.normalize_features', True):
            return sequences
        
        logger.info("Normalizing numerical features")
        
        # Collect all numerical features
        all_features = []
        for sequence in sequences:
            for keystroke in sequence:
                features = [
                    keystroke['dwellTime'],
                    keystroke['flightTime'],
                    keystroke['x'],
                    keystroke['y']
                ]
                all_features.append(features)
        
        # Fit scaler
        all_features = np.array(all_features)
        self.scaler.fit(all_features)
        
        # Transform features in sequences
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
                
                normalized_features = self.scaler.transform(features)[0]
                
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
    
    def create_datasets(self, sequences: List[List[Dict]]) -> Tuple[KeystrokeDataset, KeystrokeDataset]:
        """Create train and validation datasets"""
        logger.info("Creating train/validation datasets")
        
        validation_split = self.config.get('training.validation_split', 0.2)
        random_seed = self.config.get('training.random_seed', 42)
        max_length = self.config.get('data.max_sequence_length', 500)
        
        # Split sequences
        train_sequences, val_sequences = train_test_split(
            sequences, 
            test_size=validation_split, 
            random_state=random_seed
        )
        
        # Create datasets
        train_dataset = KeystrokeDataset(
            train_sequences, self.char_to_idx, self.scaler, max_length
        )
        
        val_dataset = KeystrokeDataset(
            val_sequences, self.char_to_idx, self.scaler, max_length
        )
        
        logger.info(f"Created train dataset with {len(train_dataset)} sequences")
        logger.info(f"Created validation dataset with {len(val_dataset)} sequences")
        
        return train_dataset, val_dataset
    
    def create_dataloaders(self, train_dataset: KeystrokeDataset, 
                          val_dataset: KeystrokeDataset) -> Tuple[DataLoader, DataLoader]:
        """Create data loaders"""
        batch_size = self.config.get('training.batch_size', 32)
        
        train_loader = DataLoader(
            train_dataset, 
            batch_size=batch_size, 
            shuffle=True, 
            num_workers=0  # Set to 0 for Windows compatibility
        )
        
        val_loader = DataLoader(
            val_dataset, 
            batch_size=batch_size, 
            shuffle=False, 
            num_workers=0
        )
        
        return train_loader, val_loader
    
    def process_csv(self, csv_path: str) -> Tuple[DataLoader, DataLoader, Dict]:
        """Complete data processing pipeline"""
        # Load and preprocess data
        df = self.load_csv_data(csv_path)
        sequences = self.preprocess_data(df)
        
        # Build vocabulary
        self.build_vocabulary(sequences)
        
        # Normalize features
        sequences = self.normalize_features(sequences)
        
        # Create datasets and dataloaders
        train_dataset, val_dataset = self.create_datasets(sequences)
        train_loader, val_loader = self.create_dataloaders(train_dataset, val_dataset)
        
        # Return metadata
        metadata = {
            'vocab_size': self.vocab_size,
            'char_to_idx': self.char_to_idx,
            'idx_to_char': self.idx_to_char,
            'scaler': self.scaler,
            'num_train_samples': len(train_dataset),
            'num_val_samples': len(val_dataset)
        }
        
        return train_loader, val_loader, metadata
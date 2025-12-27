import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Union
import os
import json
from datetime import datetime
from tqdm import tqdm
import matplotlib.pyplot as plt
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')

# Import our custom modules
from model import MotionLSTMEncoder, ContrastiveLoss, TripletLoss
from data_processor import MotionDataProcessor, create_sample_data
from utils import AuthenticationMetrics, EmbeddingAnalyzer, cosine_similarity

class MotionDataset(Dataset):
    """
    PyTorch Dataset for motion sensor data.
    """
    
    def __init__(self, sequences: np.ndarray, labels: np.ndarray, 
                 user_ids: Optional[np.ndarray] = None):
        """
        Initialize the dataset.
        
        Args:
            sequences: Motion sequences of shape (n_samples, seq_len, n_features)
            labels: Labels for each sequence
            user_ids: Optional user IDs for each sequence
        """
        self.sequences = torch.FloatTensor(sequences)
        self.labels = torch.LongTensor(labels)
        self.user_ids = user_ids
        
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        sample = {
            'sequence': self.sequences[idx],
            'label': self.labels[idx]
        }
        
        if self.user_ids is not None:
            sample['user_id'] = self.user_ids[idx]
            
        return sample


class MotionTrainer:
    """
    Trainer class for motion-based authentication models.
    """
    
    def __init__(self, 
                 model: MotionLSTMEncoder,
                 device: str = 'cpu',
                 learning_rate: float = 0.001,
                 weight_decay: float = 1e-4,
                 loss_type: str = 'contrastive'):
        """
        Initialize the trainer.
        
        Args:
            model: MotionLSTMEncoder model to train
            device: Device to train on ('cpu' or 'cuda')
            learning_rate: Learning rate for optimizer
            weight_decay: Weight decay for regularization
            loss_type: Type of loss function ('contrastive', 'triplet', or 'crossentropy')
        """
        self.model = model.to(device)
        self.device = device
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
        self.loss_type = loss_type
        
        # Initialize optimizer
        self.optimizer = optim.AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay
        )
        
        # Initialize loss function
        if loss_type == 'contrastive':
            self.criterion = ContrastiveLoss(margin=1.0, temperature=0.1)
        elif loss_type == 'triplet':
            self.criterion = TripletLoss(margin=0.3)
        elif loss_type == 'crossentropy':
            self.criterion = nn.CrossEntropyLoss()
        else:
            raise ValueError(f"Unknown loss type: {loss_type}")
        
        # Initialize scheduler
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.5, patience=10, verbose=True
        )
        
        # Training history
        self.train_losses = []
        self.val_losses = []
        self.train_accuracies = []
        self.val_accuracies = []
        self.learning_rates = []
        
        # Best model tracking
        self.best_val_loss = float('inf')
        self.best_model_state = None
        self.patience_counter = 0
        self.early_stopping_patience = 20
    
    def train_epoch(self, train_loader: DataLoader) -> Tuple[float, float]:
        """
        Train for one epoch.
        
        Args:
            train_loader: Training data loader
            
        Returns:
            Tuple of (average_loss, accuracy)
        """
        self.model.train()
        total_loss = 0.0
        correct_predictions = 0
        total_samples = 0
        
        progress_bar = tqdm(train_loader, desc='Training')
        
        for batch in progress_bar:
            sequences = batch['sequence'].to(self.device)
            labels = batch['label'].to(self.device)
            
            # Zero gradients
            self.optimizer.zero_grad()
            
            # Forward pass
            embeddings = self.model(sequences)
            
            # Compute loss
            if self.loss_type in ['contrastive', 'triplet']:
                loss = self.criterion(embeddings, labels)
            else:  # crossentropy
                # For cross-entropy, we need a classifier head
                # This is a simplified version - in practice, you'd add a classification layer
                loss = self.criterion(embeddings, labels)
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            
            # Update weights
            self.optimizer.step()
            
            # Update statistics
            total_loss += loss.item()
            
            # For metric learning, we compute accuracy based on similarity
            if self.loss_type in ['contrastive', 'triplet']:
                # Compute pairwise similarities and check if same-class pairs are more similar
                batch_size = embeddings.shape[0]
                similarities = torch.mm(embeddings, embeddings.t())
                
                # Create labels for pairs
                label_matrix = labels.unsqueeze(1) == labels.unsqueeze(0)
                
                # Count correct predictions (same class pairs should have high similarity)
                threshold = 0.5
                predictions = similarities > threshold
                correct = (predictions == label_matrix).float().mean()
                correct_predictions += correct.item() * batch_size
            else:
                # Standard classification accuracy
                _, predicted = torch.max(embeddings, 1)
                correct_predictions += (predicted == labels).sum().item()
            
            total_samples += sequences.shape[0]
            
            # Update progress bar
            progress_bar.set_postfix({
                'Loss': f'{loss.item():.4f}',
                'Acc': f'{correct_predictions/total_samples:.4f}'
            })
        
        avg_loss = total_loss / len(train_loader)
        accuracy = correct_predictions / total_samples
        
        return avg_loss, accuracy
    
    def validate_epoch(self, val_loader: DataLoader) -> Tuple[float, float, Dict]:
        """
        Validate for one epoch.
        
        Args:
            val_loader: Validation data loader
            
        Returns:
            Tuple of (average_loss, accuracy, detailed_metrics)
        """
        self.model.eval()
        total_loss = 0.0
        all_embeddings = []
        all_labels = []
        
        with torch.no_grad():
            for batch in tqdm(val_loader, desc='Validation'):
                sequences = batch['sequence'].to(self.device)
                labels = batch['label'].to(self.device)
                
                # Forward pass
                embeddings = self.model(sequences)
                
                # Compute loss
                if self.loss_type in ['contrastive', 'triplet']:
                    loss = self.criterion(embeddings, labels)
                else:
                    loss = self.criterion(embeddings, labels)
                
                total_loss += loss.item()
                
                # Store embeddings and labels for detailed analysis
                all_embeddings.append(embeddings.cpu())
                all_labels.append(labels.cpu())
        
        # Concatenate all embeddings and labels
        all_embeddings = torch.cat(all_embeddings, dim=0)
        all_labels = torch.cat(all_labels, dim=0)
        
        # Compute detailed metrics
        detailed_metrics = self._compute_validation_metrics(all_embeddings, all_labels)
        
        avg_loss = total_loss / len(val_loader)
        accuracy = detailed_metrics.get('accuracy', 0.0)
        
        return avg_loss, accuracy, detailed_metrics
    
    def _compute_validation_metrics(self, embeddings: torch.Tensor, 
                                  labels: torch.Tensor) -> Dict[str, float]:
        """
        Compute detailed validation metrics.
        
        Args:
            embeddings: Validation embeddings
            labels: Validation labels
            
        Returns:
            Dictionary with detailed metrics
        """
        embeddings_np = embeddings.numpy()
        labels_np = labels.numpy()
        
        # Compute pairwise similarities
        n_samples = len(embeddings_np)
        similarities = []
        pair_labels = []
        
        for i in range(n_samples):
            for j in range(i + 1, n_samples):
                sim = cosine_similarity(embeddings_np[i], embeddings_np[j])
                similarities.append(sim)
                # Same user = positive pair, different user = negative pair
                pair_labels.append(labels_np[i] == labels_np[j])
        
        similarities = np.array(similarities)
        pair_labels = np.array(pair_labels)
        
        # Compute metrics using different thresholds
        thresholds = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9]
        metrics = {}
        
        for threshold in thresholds:
            predictions = similarities >= threshold
            
            # Compute basic metrics
            tp = np.sum((predictions == 1) & (pair_labels == 1))
            fp = np.sum((predictions == 1) & (pair_labels == 0))
            tn = np.sum((predictions == 0) & (pair_labels == 0))
            fn = np.sum((predictions == 0) & (pair_labels == 1))
            
            accuracy = (tp + tn) / (tp + fp + tn + fn) if (tp + fp + tn + fn) > 0 else 0
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            
            # Authentication-specific metrics
            far = fp / (fp + tn) if (fp + tn) > 0 else 0  # False Acceptance Rate
            frr = fn / (fn + tp) if (fn + tp) > 0 else 0  # False Rejection Rate
            
            metrics[f'threshold_{threshold}'] = {
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1': f1,
                'far': far,
                'frr': frr
            }
        
        # Use threshold 0.75 as default
        default_metrics = metrics.get('threshold_0.75', {})
        
        # Add overall statistics
        metrics.update({
            'accuracy': default_metrics.get('accuracy', 0.0),
            'precision': default_metrics.get('precision', 0.0),
            'recall': default_metrics.get('recall', 0.0),
            'f1': default_metrics.get('f1', 0.0),
            'far': default_metrics.get('far', 0.0),
            'frr': default_metrics.get('frr', 0.0),
            'mean_positive_similarity': float(np.mean(similarities[pair_labels == 1])) if np.any(pair_labels == 1) else 0.0,
            'mean_negative_similarity': float(np.mean(similarities[pair_labels == 0])) if np.any(pair_labels == 0) else 0.0,
            'similarity_separation': float(np.mean(similarities[pair_labels == 1]) - np.mean(similarities[pair_labels == 0])) if np.any(pair_labels == 1) and np.any(pair_labels == 0) else 0.0
        })
        
        return metrics
    
    def train(self, 
              train_loader: DataLoader,
              val_loader: DataLoader,
              num_epochs: int = 100,
              save_dir: str = 'checkpoints',
              save_best: bool = True,
              verbose: bool = True) -> Dict[str, List]:
        """
        Train the model.
        
        Args:
            train_loader: Training data loader
            val_loader: Validation data loader
            num_epochs: Number of epochs to train
            save_dir: Directory to save checkpoints
            save_best: Whether to save the best model
            verbose: Whether to print training progress
            
        Returns:
            Training history dictionary
        """
        # Create save directory
        os.makedirs(save_dir, exist_ok=True)
        
        if verbose:
            print(f"Starting training for {num_epochs} epochs...")
            print(f"Model parameters: {sum(p.numel() for p in self.model.parameters()):,}")
            print(f"Device: {self.device}")
            print(f"Loss type: {self.loss_type}")
        
        for epoch in range(num_epochs):
            if verbose:
                print(f"\nEpoch {epoch + 1}/{num_epochs}")
                print("-" * 50)
            
            # Train
            train_loss, train_acc = self.train_epoch(train_loader)
            
            # Validate
            val_loss, val_acc, detailed_metrics = self.validate_epoch(val_loader)
            
            # Update learning rate
            self.scheduler.step(val_loss)
            current_lr = self.optimizer.param_groups[0]['lr']
            
            # Store history
            self.train_losses.append(train_loss)
            self.val_losses.append(val_loss)
            self.train_accuracies.append(train_acc)
            self.val_accuracies.append(val_acc)
            self.learning_rates.append(current_lr)
            
            if verbose:
                print(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
                print(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
                print(f"FAR: {detailed_metrics.get('far', 0):.4f}, FRR: {detailed_metrics.get('frr', 0):.4f}")
                print(f"Similarity Separation: {detailed_metrics.get('similarity_separation', 0):.4f}")
                print(f"Learning Rate: {current_lr:.6f}")
            
            # Save best model
            if val_loss < self.best_val_loss:
                self.best_val_loss = val_loss
                self.best_model_state = self.model.state_dict().copy()
                self.patience_counter = 0
                
                if save_best:
                    checkpoint = {
                        'epoch': epoch + 1,
                        'model_state_dict': self.model.state_dict(),
                        'optimizer_state_dict': self.optimizer.state_dict(),
                        'scheduler_state_dict': self.scheduler.state_dict(),
                        'train_loss': train_loss,
                        'val_loss': val_loss,
                        'val_metrics': detailed_metrics,
                        'config': {
                            'input_size': self.model.input_size,
                            'hidden_size': self.model.hidden_size,
                            'num_layers': self.model.num_layers,
                            'embedding_dim': self.model.embedding_dim,
                            'loss_type': self.loss_type
                        }
                    }
                    
                    torch.save(checkpoint, os.path.join(save_dir, 'best_model.pth'))
                    
                    if verbose:
                        print(f"✓ Saved best model (Val Loss: {val_loss:.4f})")
            else:
                self.patience_counter += 1
            
            # Early stopping
            if self.patience_counter >= self.early_stopping_patience:
                if verbose:
                    print(f"\nEarly stopping triggered after {epoch + 1} epochs")
                break
            
            # Save regular checkpoint every 10 epochs
            if (epoch + 1) % 10 == 0:
                checkpoint_path = os.path.join(save_dir, f'checkpoint_epoch_{epoch + 1}.pth')
                torch.save({
                    'epoch': epoch + 1,
                    'model_state_dict': self.model.state_dict(),
                    'optimizer_state_dict': self.optimizer.state_dict(),
                    'train_loss': train_loss,
                    'val_loss': val_loss
                }, checkpoint_path)
        
        # Load best model
        if self.best_model_state is not None:
            self.model.load_state_dict(self.best_model_state)
            if verbose:
                print(f"\nLoaded best model (Val Loss: {self.best_val_loss:.4f})")
        
        # Return training history
        history = {
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'train_accuracies': self.train_accuracies,
            'val_accuracies': self.val_accuracies,
            'learning_rates': self.learning_rates
        }
        
        return history
    
    def plot_training_history(self, save_path: Optional[str] = None):
        """
        Plot training history.
        
        Args:
            save_path: Optional path to save the plot
        """
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # Loss plot
        axes[0, 0].plot(self.train_losses, label='Train Loss', color='blue')
        axes[0, 0].plot(self.val_losses, label='Val Loss', color='red')
        axes[0, 0].set_title('Training and Validation Loss')
        axes[0, 0].set_xlabel('Epoch')
        axes[0, 0].set_ylabel('Loss')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)
        
        # Accuracy plot
        axes[0, 1].plot(self.train_accuracies, label='Train Accuracy', color='blue')
        axes[0, 1].plot(self.val_accuracies, label='Val Accuracy', color='red')
        axes[0, 1].set_title('Training and Validation Accuracy')
        axes[0, 1].set_xlabel('Epoch')
        axes[0, 1].set_ylabel('Accuracy')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
        
        # Learning rate plot
        axes[1, 0].plot(self.learning_rates, color='green')
        axes[1, 0].set_title('Learning Rate Schedule')
        axes[1, 0].set_xlabel('Epoch')
        axes[1, 0].set_ylabel('Learning Rate')
        axes[1, 0].set_yscale('log')
        axes[1, 0].grid(True, alpha=0.3)
        
        # Loss difference plot
        if len(self.train_losses) > 0 and len(self.val_losses) > 0:
            loss_diff = np.array(self.val_losses) - np.array(self.train_losses)
            axes[1, 1].plot(loss_diff, color='purple')
            axes[1, 1].set_title('Validation - Training Loss')
            axes[1, 1].set_xlabel('Epoch')
            axes[1, 1].set_ylabel('Loss Difference')
            axes[1, 1].axhline(y=0, color='black', linestyle='--', alpha=0.5)
            axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()


def prepare_training_data(data_dir: str, 
                         processor: MotionDataProcessor,
                         test_size: float = 0.2,
                         val_size: float = 0.1) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Prepare training, validation, and test data loaders.
    
    Args:
        data_dir: Directory containing motion data files
        processor: MotionDataProcessor instance
        test_size: Fraction of data to use for testing
        val_size: Fraction of training data to use for validation
        
    Returns:
        Tuple of (train_loader, val_loader, test_loader)
    """
    all_sequences = []
    all_labels = []
    all_user_ids = []
    
    label_encoder = LabelEncoder()
    
    # Load data from directory (assuming CSV files named by user_id)
    user_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    
    for file in user_files:
        user_id = file.replace('.csv', '')
        file_path = os.path.join(data_dir, file)
        
        # Load motion data
        data = pd.read_csv(file_path)
        
        # Process data
        sequences, _ = processor.create_sliding_windows(data)
        labels = [user_id] * len(sequences)
        
        all_sequences.extend(sequences)
        all_labels.extend(labels)
        all_user_ids.extend([user_id] * len(sequences))
    
    # Convert to numpy arrays
    all_sequences = np.array(all_sequences)
    all_user_ids = np.array(all_user_ids)
    
    # Encode labels
    all_labels_encoded = label_encoder.fit_transform(all_labels)
    
    # Split data
    X_temp, X_test, y_temp, y_test, users_temp, users_test = train_test_split(
        all_sequences, all_labels_encoded, all_user_ids, 
        test_size=test_size, stratify=all_labels_encoded, random_state=42
    )
    
    X_train, X_val, y_train, y_val, users_train, users_val = train_test_split(
        X_temp, y_temp, users_temp,
        test_size=val_size, stratify=y_temp, random_state=42
    )
    
    # Create datasets
    train_dataset = MotionDataset(X_train, y_train, users_train)
    val_dataset = MotionDataset(X_val, y_val, users_val)
    test_dataset = MotionDataset(X_test, y_test, users_test)
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False, num_workers=0)
    
    return train_loader, val_loader, test_loader


def create_synthetic_training_data(n_users: int = 10, 
                                 n_sequences_per_user: int = 50,
                                 sequence_length: int = 100,
                                 sampling_rate: int = 50) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Create synthetic training data for testing.
    
    Args:
        n_users: Number of synthetic users
        n_sequences_per_user: Number of sequences per user
        sequence_length: Length of each sequence
        sampling_rate: Sampling rate for motion data
        
    Returns:
        Tuple of (train_loader, val_loader, test_loader)
    """
    processor = MotionDataProcessor(
        sequence_length=sequence_length,
        sampling_rate=sampling_rate,
        normalize=True
    )
    
    all_sequences = []
    all_labels = []
    
    # Generate data for each user
    for user_id in range(n_users):
        # Create different motion patterns for each user
        patterns = ['normal', 'active', 'static']
        user_pattern = patterns[user_id % len(patterns)]
        
        for seq_id in range(n_sequences_per_user):
            # Generate motion data
            motion_data = create_sample_data(
                n_samples=sequence_length + 50,  # Extra samples for windowing
                sampling_rate=sampling_rate,
                user_pattern=user_pattern
            )
            
            # Add user-specific variations
            noise_scale = 0.1 + 0.05 * user_id  # Different noise levels per user
            for col in motion_data.columns:
                if col not in ['motion_magnitude', 'rotation_rate']:
                    motion_data[col] += np.random.normal(0, noise_scale, len(motion_data))
            
            # Process into sequences
            sequences, _ = processor.create_sliding_windows(motion_data)
            
            # Take one sequence per motion data sample
            if len(sequences) > 0:
                all_sequences.append(sequences[0])  # Take first sequence
                all_labels.append(user_id)
    
    # Convert to numpy arrays
    all_sequences = np.array(all_sequences)
    all_labels = np.array(all_labels)
    
    # Split data
    X_train, X_temp, y_train, y_temp = train_test_split(
        all_sequences, all_labels, test_size=0.3, stratify=all_labels, random_state=42
    )
    
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42
    )
    
    # Create datasets and loaders
    train_dataset = MotionDataset(X_train, y_train)
    val_dataset = MotionDataset(X_val, y_val)
    test_dataset = MotionDataset(X_test, y_test)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)
    
    return train_loader, val_loader, test_loader


if __name__ == "__main__":
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Create synthetic training data
    print("Creating synthetic training data...")
    train_loader, val_loader, test_loader = create_synthetic_training_data(
        n_users=5, n_sequences_per_user=100
    )
    
    print(f"Training samples: {len(train_loader.dataset)}")
    print(f"Validation samples: {len(val_loader.dataset)}")
    print(f"Test samples: {len(test_loader.dataset)}")
    
    # Create model
    model = MotionLSTMEncoder(
        input_size=10,
        hidden_size=256,
        num_layers=2,
        embedding_dim=256,
        dropout=0.2
    )
    
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Create trainer
    trainer = MotionTrainer(
        model=model,
        device=device,
        learning_rate=0.001,
        loss_type='contrastive'
    )
    
    # Train model
    print("\nStarting training...")
    history = trainer.train(
        train_loader=train_loader,
        val_loader=val_loader,
        num_epochs=20,  # Reduced for demo
        save_dir='checkpoints',
        verbose=True
    )
    
    # Plot training history
    trainer.plot_training_history('training_history.png')
    
    # Evaluate on test set
    print("\nEvaluating on test set...")
    test_loss, test_acc, test_metrics = trainer.validate_epoch(test_loader)
    
    print(f"Test Loss: {test_loss:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"Test FAR: {test_metrics.get('far', 0):.4f}")
    print(f"Test FRR: {test_metrics.get('frr', 0):.4f}")
    print(f"Similarity Separation: {test_metrics.get('similarity_separation', 0):.4f}")
    
    print("\nTraining completed successfully!")
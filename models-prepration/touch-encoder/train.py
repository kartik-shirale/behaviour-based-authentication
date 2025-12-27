import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.tensorboard import SummaryWriter
import numpy as np
import os
import argparse
import json
import pickle
import logging
from datetime import datetime
from tqdm import tqdm

from config import Config
from model import TouchLSTMEncoder, TouchAutoencoderLoss, create_model, count_parameters
from data_processor import DataProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EarlyStopping:
    """Early stopping utility to prevent overfitting"""
    
    def __init__(self, patience: int = 10, min_delta: float = 0.0):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False
    
    def __call__(self, val_loss: float) -> bool:
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0
        
        return self.early_stop


class Trainer:
    """Training manager for touch encoder"""
    
    def __init__(self, config: Config, model: TouchLSTMEncoder, 
                 train_loader, val_loader, device: torch.device):
        self.config = config
        self.model = model.to(device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        
        # Initialize optimizer
        self.optimizer = optim.Adam(
            model.parameters(),
            lr=config.get('training.learning_rate', 0.001)
        )
        
        # Initialize loss function
        self.criterion = TouchAutoencoderLoss()
        
        # Learning rate scheduler
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.5, patience=5
        )
        
        # Early stopping
        self.early_stopping = EarlyStopping(
            patience=config.get('training.early_stopping_patience', 10)
        )
        
        # Gradient clipping
        self.grad_clip_norm = config.get('training.gradient_clip_norm', 1.0)
        
        # Paths
        self.model_save_dir = config.get('paths.model_save_dir', './models')
        self.logs_dir = config.get('paths.logs_dir', './logs')
        os.makedirs(self.model_save_dir, exist_ok=True)
        os.makedirs(self.logs_dir, exist_ok=True)
        
        # Tensorboard writer
        self.writer = SummaryWriter(log_dir=self.logs_dir)
        
        # Training history
        self.history = {
            'train_loss': [],
            'val_loss': [],
            'learning_rate': []
        }
        
        self.best_val_loss = float('inf')
    
    def train_epoch(self, epoch: int) -> float:
        """Train for one epoch"""
        self.model.train()
        total_loss = 0.0
        num_batches = 0
        
        pbar = tqdm(self.train_loader, desc=f"Epoch {epoch} [Train]")
        for batch in pbar:
            # Move batch to device
            batch = {k: v.to(self.device) for k, v in batch.items()}
            
            # Forward pass
            self.optimizer.zero_grad()
            outputs = self.model(batch)
            
            # Compute loss
            loss = self.criterion(outputs['embeddings'])
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(
                self.model.parameters(), 
                self.grad_clip_norm
            )
            
            # Update weights
            self.optimizer.step()
            
            total_loss += loss.item()
            num_batches += 1
            
            pbar.set_postfix({'loss': loss.item()})
        
        avg_loss = total_loss / num_batches
        return avg_loss
    
    def validate(self, epoch: int) -> float:
        """Validate the model"""
        self.model.eval()
        total_loss = 0.0
        num_batches = 0
        
        with torch.no_grad():
            pbar = tqdm(self.val_loader, desc=f"Epoch {epoch} [Val]")
            for batch in pbar:
                batch = {k: v.to(self.device) for k, v in batch.items()}
                
                outputs = self.model(batch)
                loss = self.criterion(outputs['embeddings'])
                
                total_loss += loss.item()
                num_batches += 1
                
                pbar.set_postfix({'loss': loss.item()})
        
        avg_loss = total_loss / num_batches
        return avg_loss
    
    def save_checkpoint(self, epoch: int, is_best: bool = False):
        """Save model checkpoint"""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'config': self.config.config,
            'best_val_loss': self.best_val_loss
        }
        
        # Save latest checkpoint
        latest_path = os.path.join(self.model_save_dir, 'latest_model.pt')
        torch.save(checkpoint, latest_path)
        
        # Save best checkpoint
        if is_best:
            best_path = os.path.join(self.model_save_dir, 'best_model.pt')
            torch.save(checkpoint, best_path)
            logger.info(f"Saved best model with val_loss: {self.best_val_loss:.6f}")
    
    def train(self, num_epochs: int = None):
        """Main training loop"""
        if num_epochs is None:
            num_epochs = self.config.get('training.num_epochs', 100)
        
        logger.info(f"Starting training for {num_epochs} epochs")
        logger.info(f"Model parameters: {count_parameters(self.model):,}")
        
        for epoch in range(1, num_epochs + 1):
            # Train
            train_loss = self.train_epoch(epoch)
            
            # Validate
            val_loss = self.validate(epoch)
            
            # Get current learning rate
            current_lr = self.optimizer.param_groups[0]['lr']
            
            # Update history
            self.history['train_loss'].append(train_loss)
            self.history['val_loss'].append(val_loss)
            self.history['learning_rate'].append(current_lr)
            
            # Tensorboard logging
            self.writer.add_scalar('Loss/train', train_loss, epoch)
            self.writer.add_scalar('Loss/val', val_loss, epoch)
            self.writer.add_scalar('LearningRate', current_lr, epoch)
            
            # Update scheduler
            self.scheduler.step(val_loss)
            
            # Check for best model
            is_best = val_loss < self.best_val_loss
            if is_best:
                self.best_val_loss = val_loss
            
            # Save checkpoint
            self.save_checkpoint(epoch, is_best)
            
            # Log progress
            logger.info(
                f"Epoch {epoch}/{num_epochs} - "
                f"Train Loss: {train_loss:.6f} - "
                f"Val Loss: {val_loss:.6f} - "
                f"LR: {current_lr:.6f}"
            )
            
            # Early stopping
            if self.early_stopping(val_loss):
                logger.info(f"Early stopping triggered at epoch {epoch}")
                break
        
        # Save training history
        history_path = os.path.join(self.model_save_dir, 'training_history.json')
        with open(history_path, 'w') as f:
            json.dump(self.history, f)
        
        self.writer.close()
        logger.info("Training completed!")
        
        return self.history


def main():
    parser = argparse.ArgumentParser(description='Train Touch Dynamics Encoder')
    parser.add_argument('--data', type=str, required=True, 
                        help='Path to training data (CSV or JSON)')
    parser.add_argument('--config', type=str, default=None,
                        help='Path to configuration file')
    parser.add_argument('--model_dir', type=str, default='./models',
                        help='Directory to save models')
    parser.add_argument('--resume', type=str, default=None,
                        help='Path to checkpoint to resume training')
    parser.add_argument('--seed', type=int, default=42,
                        help='Random seed')
    args = parser.parse_args()
    
    # Set random seed
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    
    # Load config
    config = Config(args.config)
    config.set('paths.model_save_dir', args.model_dir)
    
    # Determine device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    # Process data
    processor = DataProcessor(config)
    
    if args.data.endswith('.json'):
        train_loader, val_loader, metadata = processor.process_json(args.data)
    else:
        train_loader, val_loader, metadata = processor.process_csv(args.data)
    
    # Save metadata
    os.makedirs(args.model_dir, exist_ok=True)
    metadata_path = os.path.join(args.model_dir, 'metadata.pkl')
    with open(metadata_path, 'wb') as f:
        pickle.dump(metadata, f)
    
    # Save config
    config.save_config(os.path.join(args.model_dir, 'config.yaml'))
    
    # Create model
    model = create_model(config)
    
    # Resume from checkpoint if specified
    if args.resume:
        logger.info(f"Resuming from checkpoint: {args.resume}")
        checkpoint = torch.load(args.resume, map_location=device)
        model.load_state_dict(checkpoint['model_state_dict'])
    
    # Create trainer and start training
    trainer = Trainer(config, model, train_loader, val_loader, device)
    trainer.train()


if __name__ == '__main__':
    main()

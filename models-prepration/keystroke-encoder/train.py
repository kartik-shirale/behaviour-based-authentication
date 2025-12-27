import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.tensorboard import SummaryWriter
import numpy as np
import os
import argparse
import logging
from tqdm import tqdm
from typing import Dict, Tuple, Optional
import pickle
import json
from datetime import datetime

from config import Config
from data_processor import DataProcessor
from model import create_model, ContrastiveLoss, ReconstructionLoss, count_parameters

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Trainer:
    """Trainer class for keystroke dynamics encoder"""
    
    def __init__(self, config: Config, model_save_dir: str = None):
        self.config = config
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Set up directories
        self.model_save_dir = model_save_dir or config.get('paths.model_save_dir', './models')
        self.logs_dir = config.get('paths.logs_dir', './logs')
        os.makedirs(self.model_save_dir, exist_ok=True)
        os.makedirs(self.logs_dir, exist_ok=True)
        
        # Initialize components
        self.model = None
        self.optimizer = None
        self.scheduler = None
        self.criterion = None
        self.writer = None
        
        # Training state
        self.current_epoch = 0
        self.best_val_loss = float('inf')
        self.patience_counter = 0
        self.training_history = {
            'train_loss': [],
            'val_loss': [],
            'learning_rate': []
        }
    
    def setup_model(self, vocab_size: int):
        """Initialize model and training components"""
        # Create model
        self.model = create_model(self.config, vocab_size)
        self.model.to(self.device)
        
        logger.info(f"Model created with {count_parameters(self.model):,} trainable parameters")
        
        # Setup optimizer
        learning_rate = self.config.get('training.learning_rate', 0.001)
        self.optimizer = optim.Adam(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=1e-5
        )
        
        # Setup learning rate scheduler
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='min',
            factor=0.5,
            patience=5,
            verbose=True
        )
        
        # Setup loss function
        loss_type = self.config.get('training.loss_type', 'contrastive')
        if loss_type == 'contrastive':
            self.criterion = ContrastiveLoss(
                margin=self.config.get('training.contrastive_margin', 1.0),
                temperature=self.config.get('training.temperature', 0.1)
            )
        else:
            self.criterion = ReconstructionLoss()
        
        # Setup tensorboard writer
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_dir = os.path.join(self.logs_dir, f'run_{timestamp}')
        self.writer = SummaryWriter(log_dir)
        
        logger.info(f"Training setup complete. Logs will be saved to {log_dir}")
    
    def train_epoch(self, train_loader) -> float:
        """Train for one epoch"""
        self.model.train()
        total_loss = 0.0
        num_batches = len(train_loader)
        
        progress_bar = tqdm(train_loader, desc=f'Epoch {self.current_epoch + 1}')
        
        for batch_idx, batch in enumerate(progress_bar):
            # Move batch to device
            batch = {k: v.to(self.device) for k, v in batch.items()}
            
            # Zero gradients
            self.optimizer.zero_grad()
            
            # Forward pass
            output = self.model(batch)
            embeddings = output['embeddings']
            
            # Compute loss
            loss = self.criterion(embeddings)
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            gradient_clip_norm = self.config.get('training.gradient_clip_norm', 1.0)
            if gradient_clip_norm > 0:
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), gradient_clip_norm)
            
            # Update parameters
            self.optimizer.step()
            
            # Update metrics
            total_loss += loss.item()
            avg_loss = total_loss / (batch_idx + 1)
            
            # Update progress bar
            progress_bar.set_postfix({
                'Loss': f'{avg_loss:.4f}',
                'LR': f'{self.optimizer.param_groups[0]["lr"]:.6f}'
            })
            
            # Log to tensorboard
            global_step = self.current_epoch * num_batches + batch_idx
            self.writer.add_scalar('Loss/Train_Batch', loss.item(), global_step)
        
        avg_loss = total_loss / num_batches
        return avg_loss
    
    def validate_epoch(self, val_loader) -> float:
        """Validate for one epoch"""
        self.model.eval()
        total_loss = 0.0
        num_batches = len(val_loader)
        
        with torch.no_grad():
            for batch in tqdm(val_loader, desc='Validation'):
                # Move batch to device
                batch = {k: v.to(self.device) for k, v in batch.items()}
                
                # Forward pass
                output = self.model(batch)
                embeddings = output['embeddings']
                
                # Compute loss
                loss = self.criterion(embeddings)
                total_loss += loss.item()
        
        avg_loss = total_loss / num_batches
        return avg_loss
    
    def save_checkpoint(self, epoch: int, val_loss: float, is_best: bool = False):
        """Save model checkpoint"""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'val_loss': val_loss,
            'config': self.config.config,
            'training_history': self.training_history
        }
        
        # Save regular checkpoint
        checkpoint_path = os.path.join(self.model_save_dir, f'checkpoint_epoch_{epoch}.pt')
        torch.save(checkpoint, checkpoint_path)
        
        # Save best model
        if is_best:
            best_model_path = os.path.join(self.model_save_dir, 'best_model.pt')
            torch.save(checkpoint, best_model_path)
            logger.info(f"New best model saved with validation loss: {val_loss:.4f}")
        
        # Save latest model
        latest_model_path = os.path.join(self.model_save_dir, 'latest_model.pt')
        torch.save(checkpoint, latest_model_path)
    
    def load_checkpoint(self, checkpoint_path: str):
        """Load model checkpoint"""
        logger.info(f"Loading checkpoint from {checkpoint_path}")
        
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        
        self.current_epoch = checkpoint['epoch']
        self.best_val_loss = checkpoint['val_loss']
        self.training_history = checkpoint.get('training_history', {
            'train_loss': [],
            'val_loss': [],
            'learning_rate': []
        })
        
        logger.info(f"Checkpoint loaded. Resuming from epoch {self.current_epoch}")
    
    def train(self, train_loader, val_loader, resume_from: str = None):
        """Main training loop"""
        # Load checkpoint if resuming
        if resume_from and os.path.exists(resume_from):
            self.load_checkpoint(resume_from)
        
        num_epochs = self.config.get('training.num_epochs', 100)
        early_stopping_patience = self.config.get('training.early_stopping_patience', 10)
        
        logger.info(f"Starting training for {num_epochs} epochs")
        logger.info(f"Early stopping patience: {early_stopping_patience}")
        
        for epoch in range(self.current_epoch, num_epochs):
            self.current_epoch = epoch
            
            # Train epoch
            train_loss = self.train_epoch(train_loader)
            
            # Validate epoch
            val_loss = self.validate_epoch(val_loader)
            
            # Update learning rate
            self.scheduler.step(val_loss)
            current_lr = self.optimizer.param_groups[0]['lr']
            
            # Update training history
            self.training_history['train_loss'].append(train_loss)
            self.training_history['val_loss'].append(val_loss)
            self.training_history['learning_rate'].append(current_lr)
            
            # Log to tensorboard
            self.writer.add_scalar('Loss/Train_Epoch', train_loss, epoch)
            self.writer.add_scalar('Loss/Validation_Epoch', val_loss, epoch)
            self.writer.add_scalar('Learning_Rate', current_lr, epoch)
            
            # Check for best model
            is_best = val_loss < self.best_val_loss
            if is_best:
                self.best_val_loss = val_loss
                self.patience_counter = 0
            else:
                self.patience_counter += 1
            
            # Save checkpoint
            self.save_checkpoint(epoch, val_loss, is_best)
            
            # Log progress
            logger.info(
                f"Epoch {epoch + 1}/{num_epochs} - "
                f"Train Loss: {train_loss:.4f}, "
                f"Val Loss: {val_loss:.4f}, "
                f"LR: {current_lr:.6f}, "
                f"Best Val Loss: {self.best_val_loss:.4f}"
            )
            
            # Early stopping
            if self.patience_counter >= early_stopping_patience:
                logger.info(f"Early stopping triggered after {epoch + 1} epochs")
                break
        
        # Save final training history
        history_path = os.path.join(self.model_save_dir, 'training_history.json')
        with open(history_path, 'w') as f:
            json.dump(self.training_history, f, indent=2)
        
        self.writer.close()
        logger.info("Training completed!")

def main():
    """Main training function"""
    parser = argparse.ArgumentParser(description='Train keystroke dynamics encoder')
    parser.add_argument('--data', type=str, required=True, help='Path to CSV data file')
    parser.add_argument('--config', type=str, help='Path to config file')
    parser.add_argument('--model_dir', type=str, default='./models', help='Model save directory')
    parser.add_argument('--resume', type=str, help='Path to checkpoint to resume from')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    
    args = parser.parse_args()
    
    # Set random seed
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(args.seed)
    
    # Load configuration
    config = Config(args.config)
    if args.seed != 42:
        config.set('training.random_seed', args.seed)
    
    # Process data
    logger.info("Processing data...")
    data_processor = DataProcessor(config)
    train_loader, val_loader, metadata = data_processor.process_csv(args.data)
    
    # Save metadata
    metadata_path = os.path.join(args.model_dir, 'metadata.pkl')
    os.makedirs(args.model_dir, exist_ok=True)
    with open(metadata_path, 'wb') as f:
        pickle.dump(metadata, f)
    
    # Save configuration
    config_path = os.path.join(args.model_dir, 'config.yaml')
    config.save_config(config_path)
    
    # Initialize trainer
    trainer = Trainer(config, args.model_dir)
    trainer.setup_model(metadata['vocab_size'])
    
    # Start training
    trainer.train(train_loader, val_loader, args.resume)
    
    logger.info(f"Training completed. Models saved to {args.model_dir}")
    logger.info(f"Best validation loss: {trainer.best_val_loss:.4f}")

if __name__ == '__main__':
    main()
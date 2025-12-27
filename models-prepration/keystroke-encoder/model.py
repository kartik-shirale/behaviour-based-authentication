import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Tuple
import logging
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KeystrokeLSTMEncoder(nn.Module):
    """LSTM-based encoder for keystroke dynamics"""
    
    def __init__(self, config: Config, vocab_size: int):
        super(KeystrokeLSTMEncoder, self).__init__()
        
        self.config = config
        self.vocab_size = vocab_size
        
        # Model parameters
        self.char_embedding_dim = config.get('model.char_embedding_dim', 64)
        self.lstm_hidden_dim = config.get('model.lstm_hidden_dim', 256)
        self.lstm_num_layers = config.get('model.lstm_num_layers', 2)
        self.bidirectional = config.get('model.bidirectional', True)
        self.output_dim = config.get('model.output_dim', 256)
        self.dropout = config.get('model.dropout', 0.3)
        self.numerical_features = config.get('model.numerical_features', 4)
        
        # Character embedding layer
        self.char_embedding = nn.Embedding(
            num_embeddings=vocab_size,
            embedding_dim=self.char_embedding_dim,
            padding_idx=0  # Assuming <PAD> is at index 0
        )
        
        # Input dimension for LSTM (character embedding + numerical features)
        self.lstm_input_dim = self.char_embedding_dim + self.numerical_features
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=self.lstm_input_dim,
            hidden_size=self.lstm_hidden_dim,
            num_layers=self.lstm_num_layers,
            batch_first=True,
            dropout=self.dropout if self.lstm_num_layers > 1 else 0,
            bidirectional=self.bidirectional
        )
        
        # Calculate LSTM output dimension
        lstm_output_dim = self.lstm_hidden_dim * (2 if self.bidirectional else 1)
        
        # Dropout layer
        self.dropout_layer = nn.Dropout(self.dropout)
        
        # Output projection layers
        self.output_projection = nn.Sequential(
            nn.Linear(lstm_output_dim, lstm_output_dim // 2),
            nn.ReLU(),
            nn.Dropout(self.dropout),
            nn.Linear(lstm_output_dim // 2, self.output_dim),
            nn.Tanh()  # Normalize output to [-1, 1]
        )
        
        # Initialize weights
        self._init_weights()
        
        logger.info(f"Initialized KeystrokeLSTMEncoder with:")
        logger.info(f"  - Vocab size: {vocab_size}")
        logger.info(f"  - Character embedding dim: {self.char_embedding_dim}")
        logger.info(f"  - LSTM hidden dim: {self.lstm_hidden_dim}")
        logger.info(f"  - LSTM layers: {self.lstm_num_layers}")
        logger.info(f"  - Bidirectional: {self.bidirectional}")
        logger.info(f"  - Output dim: {self.output_dim}")
    
    def _init_weights(self):
        """Initialize model weights"""
        # Initialize character embeddings
        nn.init.xavier_uniform_(self.char_embedding.weight)
        
        # Initialize LSTM weights
        for name, param in self.lstm.named_parameters():
            if 'weight_ih' in name:
                nn.init.xavier_uniform_(param.data)
            elif 'weight_hh' in name:
                nn.init.orthogonal_(param.data)
            elif 'bias' in name:
                param.data.fill_(0)
                # Set forget gate bias to 1
                n = param.size(0)
                param.data[(n//4):(n//2)].fill_(1)
        
        # Initialize linear layers
        for module in self.output_projection:
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                nn.init.zeros_(module.bias)
    
    def forward(self, batch: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
        """
        Forward pass of the model
        
        Args:
            batch: Dictionary containing:
                - char_indices: (batch_size, seq_len)
                - numerical_features: (batch_size, seq_len, num_features)
                - sequence_length: (batch_size,)
        
        Returns:
            Dictionary containing:
                - embeddings: (batch_size, output_dim)
                - lstm_output: (batch_size, seq_len, lstm_hidden_dim)
        """
        char_indices = batch['char_indices']  # (batch_size, seq_len)
        numerical_features = batch['numerical_features']  # (batch_size, seq_len, num_features)
        sequence_lengths = batch['sequence_length']  # (batch_size,)
        
        batch_size, seq_len = char_indices.shape
        
        # Character embeddings
        char_embeddings = self.char_embedding(char_indices)  # (batch_size, seq_len, char_embedding_dim)
        
        # Concatenate character embeddings with numerical features
        lstm_input = torch.cat([
            char_embeddings, 
            numerical_features
        ], dim=-1)  # (batch_size, seq_len, lstm_input_dim)
        
        # Pack sequences for efficient LSTM processing
        packed_input = nn.utils.rnn.pack_padded_sequence(
            lstm_input, 
            sequence_lengths.cpu(), 
            batch_first=True, 
            enforce_sorted=False
        )
        
        # LSTM forward pass
        packed_output, (hidden, cell) = self.lstm(packed_input)
        
        # Unpack sequences
        lstm_output, _ = nn.utils.rnn.pad_packed_sequence(
            packed_output, 
            batch_first=True
        )  # (batch_size, seq_len, lstm_output_dim)
        
        # Use the last hidden state for sequence representation
        if self.bidirectional:
            # Concatenate forward and backward final hidden states
            final_hidden = torch.cat([
                hidden[-2],  # Forward direction
                hidden[-1]   # Backward direction
            ], dim=-1)  # (batch_size, lstm_hidden_dim * 2)
        else:
            final_hidden = hidden[-1]  # (batch_size, lstm_hidden_dim)
        
        # Apply dropout
        final_hidden = self.dropout_layer(final_hidden)
        
        # Project to output dimension
        embeddings = self.output_projection(final_hidden)  # (batch_size, output_dim)
        
        return {
            'embeddings': embeddings,
            'lstm_output': lstm_output,
            'final_hidden': final_hidden
        }
    
    def encode(self, batch: Dict[str, torch.Tensor]) -> torch.Tensor:
        """
        Encode keystroke sequences to vector representations
        
        Args:
            batch: Input batch
        
        Returns:
            embeddings: (batch_size, output_dim)
        """
        with torch.no_grad():
            output = self.forward(batch)
            return output['embeddings']
    
    def get_embedding_dim(self) -> int:
        """Get the dimension of output embeddings"""
        return self.output_dim

class ContrastiveLoss(nn.Module):
    """Contrastive loss for learning discriminative embeddings"""
    
    def __init__(self, margin: float = 1.0, temperature: float = 0.1):
        super(ContrastiveLoss, self).__init__()
        self.margin = margin
        self.temperature = temperature
    
    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor = None) -> torch.Tensor:
        """
        Compute contrastive loss
        
        Args:
            embeddings: (batch_size, embedding_dim)
            labels: (batch_size,) - optional labels for supervised contrastive learning
        
        Returns:
            loss: scalar tensor
        """
        batch_size = embeddings.shape[0]
        
        # Normalize embeddings
        embeddings = F.normalize(embeddings, p=2, dim=1)
        
        # Compute pairwise similarities
        similarity_matrix = torch.matmul(embeddings, embeddings.T) / self.temperature
        
        # Create positive and negative pairs
        if labels is not None:
            # Supervised contrastive learning
            labels = labels.view(-1, 1)
            mask = torch.eq(labels, labels.T).float()
            
            # Remove diagonal (self-similarity)
            mask = mask - torch.eye(batch_size, device=embeddings.device)
            
            # Compute loss
            exp_sim = torch.exp(similarity_matrix)
            log_prob = similarity_matrix - torch.log(exp_sim.sum(dim=1, keepdim=True))
            
            # Mean log-likelihood over positive pairs
            mean_log_prob_pos = (mask * log_prob).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
            loss = -mean_log_prob_pos.mean()
        else:
            # Self-supervised contrastive learning (SimCLR-style)
            # For simplicity, we'll use a reconstruction-based approach
            # This can be extended to use data augmentation for positive pairs
            
            # Create targets (identity matrix for reconstruction)
            targets = torch.eye(batch_size, device=embeddings.device)
            
            # Compute cross-entropy loss
            loss = F.cross_entropy(similarity_matrix, torch.arange(batch_size, device=embeddings.device))
        
        return loss

class ReconstructionLoss(nn.Module):
    """Reconstruction loss for autoencoder-style training"""
    
    def __init__(self):
        super(ReconstructionLoss, self).__init__()
        self.mse_loss = nn.MSELoss()
    
    def forward(self, embeddings: torch.Tensor, targets: torch.Tensor = None) -> torch.Tensor:
        """
        Compute reconstruction loss
        
        Args:
            embeddings: (batch_size, embedding_dim)
            targets: (batch_size, embedding_dim) - target embeddings
        
        Returns:
            loss: scalar tensor
        """
        if targets is None:
            # Self-reconstruction: minimize the variance of embeddings
            # This encourages the model to produce consistent embeddings
            mean_embedding = embeddings.mean(dim=0, keepdim=True)
            loss = self.mse_loss(embeddings, mean_embedding.expand_as(embeddings))
        else:
            loss = self.mse_loss(embeddings, targets)
        
        return loss

def create_model(config: Config, vocab_size: int) -> KeystrokeLSTMEncoder:
    """Factory function to create the model"""
    model = KeystrokeLSTMEncoder(config, vocab_size)
    return model

def count_parameters(model: nn.Module) -> int:
    """Count the number of trainable parameters in the model"""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
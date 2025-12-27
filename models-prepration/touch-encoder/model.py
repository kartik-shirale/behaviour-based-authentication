import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Tuple
import logging
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TouchLSTMEncoder(nn.Module):
    """LSTM-based encoder for touch/gesture dynamics"""
    
    def __init__(self, config: Config):
        super(TouchLSTMEncoder, self).__init__()
        
        self.config = config
        
        # Model parameters
        self.input_features = config.get('model.input_features', 7)
        self.lstm_hidden_dim = config.get('model.lstm_hidden_dim', 256)
        self.lstm_num_layers = config.get('model.lstm_num_layers', 2)
        self.bidirectional = config.get('model.bidirectional', True)
        self.output_dim = config.get('model.output_dim', 256)
        self.dropout = config.get('model.dropout', 0.3)
        
        # Input projection layer
        self.input_projection = nn.Sequential(
            nn.Linear(self.input_features, 64),
            nn.ReLU(),
            nn.Dropout(self.dropout)
        )
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=64,
            hidden_size=self.lstm_hidden_dim,
            num_layers=self.lstm_num_layers,
            batch_first=True,
            dropout=self.dropout if self.lstm_num_layers > 1 else 0,
            bidirectional=self.bidirectional
        )
        
        # Calculate LSTM output dimension
        lstm_output_dim = self.lstm_hidden_dim * (2 if self.bidirectional else 1)
        
        # Attention layer for sequence aggregation
        self.attention = nn.Sequential(
            nn.Linear(lstm_output_dim, 64),
            nn.Tanh(),
            nn.Linear(64, 1)
        )
        
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
        
        logger.info(f"Initialized TouchLSTMEncoder with:")
        logger.info(f"  - Input features: {self.input_features}")
        logger.info(f"  - LSTM hidden dim: {self.lstm_hidden_dim}")
        logger.info(f"  - LSTM layers: {self.lstm_num_layers}")
        logger.info(f"  - Bidirectional: {self.bidirectional}")
        logger.info(f"  - Output dim: {self.output_dim}")
    
    def _init_weights(self):
        """Initialize model weights"""
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
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
    
    def forward(self, batch: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
        """
        Forward pass of the model
        
        Args:
            batch: Dictionary containing:
                - features: (batch_size, seq_len, num_features)
                - sequence_length: (batch_size,)
                - mask: (batch_size, seq_len) - optional
        
        Returns:
            Dictionary containing:
                - embeddings: (batch_size, output_dim)
                - lstm_output: (batch_size, seq_len, lstm_hidden_dim)
                - attention_weights: (batch_size, seq_len)
        """
        features = batch['features']  # (batch_size, seq_len, num_features)
        sequence_lengths = batch['sequence_length']  # (batch_size,)
        
        batch_size, seq_len, _ = features.shape
        
        # Project input features
        projected = self.input_projection(features)  # (batch_size, seq_len, 64)
        
        # Pack sequences for efficient LSTM processing
        packed_input = nn.utils.rnn.pack_padded_sequence(
            projected, 
            sequence_lengths.cpu(), 
            batch_first=True, 
            enforce_sorted=False
        )
        
        # LSTM forward pass
        packed_output, (hidden, cell) = self.lstm(packed_input)
        
        # Unpack sequences
        lstm_output, _ = nn.utils.rnn.pad_packed_sequence(
            packed_output, 
            batch_first=True,
            total_length=seq_len
        )  # (batch_size, seq_len, lstm_output_dim)
        
        # Attention mechanism
        attention_scores = self.attention(lstm_output).squeeze(-1)  # (batch_size, seq_len)
        
        # Mask padding positions
        if 'mask' in batch:
            mask = batch['mask']
            attention_scores = attention_scores.masked_fill(~mask, float('-inf'))
        
        attention_weights = F.softmax(attention_scores, dim=-1)  # (batch_size, seq_len)
        
        # Weighted sum of LSTM outputs
        context = torch.bmm(
            attention_weights.unsqueeze(1), 
            lstm_output
        ).squeeze(1)  # (batch_size, lstm_output_dim)
        
        # Apply dropout
        context = self.dropout_layer(context)
        
        # Project to output dimension
        embeddings = self.output_projection(context)  # (batch_size, output_dim)
        
        return {
            'embeddings': embeddings,
            'lstm_output': lstm_output,
            'attention_weights': attention_weights
        }
    
    def encode(self, batch: Dict[str, torch.Tensor]) -> torch.Tensor:
        """
        Encode touch sequences to vector representations
        
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


class TouchAutoencoderLoss(nn.Module):
    """Combined loss for touch gesture autoencoder training"""
    
    def __init__(self, reconstruction_weight: float = 1.0, contrastive_weight: float = 0.5):
        super(TouchAutoencoderLoss, self).__init__()
        self.reconstruction_weight = reconstruction_weight
        self.contrastive_weight = contrastive_weight
        self.mse_loss = nn.MSELoss()
        self.cosine_loss = nn.CosineEmbeddingLoss()
    
    def forward(self, embeddings: torch.Tensor, targets: torch.Tensor = None,
                labels: torch.Tensor = None) -> torch.Tensor:
        """
        Compute combined loss
        
        Args:
            embeddings: (batch_size, embedding_dim)
            targets: (batch_size, embedding_dim) - target embeddings for reconstruction
            labels: (batch_size,) - user labels for contrastive learning
        
        Returns:
            loss: scalar tensor
        """
        total_loss = torch.tensor(0.0, device=embeddings.device)
        
        # Reconstruction loss
        if targets is not None:
            recon_loss = self.mse_loss(embeddings, targets)
            total_loss = total_loss + self.reconstruction_weight * recon_loss
        
        # Contrastive loss (if labels provided)
        if labels is not None:
            batch_size = embeddings.shape[0]
            embeddings_norm = F.normalize(embeddings, p=2, dim=1)
            
            # Create pairs
            similarity_matrix = torch.matmul(embeddings_norm, embeddings_norm.T)
            
            # Positive pairs (same user)
            labels_matrix = labels.unsqueeze(0) == labels.unsqueeze(1)
            pos_mask = labels_matrix.float() - torch.eye(batch_size, device=embeddings.device)
            
            # Compute contrastive loss
            pos_sim = (similarity_matrix * pos_mask).sum() / pos_mask.sum().clamp(min=1)
            neg_mask = (~labels_matrix).float()
            neg_sim = (similarity_matrix * neg_mask).sum() / neg_mask.sum().clamp(min=1)
            
            contrastive_loss = -pos_sim + neg_sim + 1.0  # Margin of 1.0
            total_loss = total_loss + self.contrastive_weight * contrastive_loss
        
        return total_loss


def create_model(config: Config) -> TouchLSTMEncoder:
    """Factory function to create the model"""
    model = TouchLSTMEncoder(config)
    return model


def count_parameters(model: nn.Module) -> int:
    """Count the number of trainable parameters in the model"""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)

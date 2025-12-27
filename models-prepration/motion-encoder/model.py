import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional

class MotionSensorEncoder(nn.Module):
    """LSTM-based encoder for motion sensor fraud detection.
    
    Converts sequential motion sensor data into fixed-size embeddings
    for user authentication and fraud detection.
    """
    
    def __init__(
        self,
        input_dim: int = 10,
        embedding_dim: int = 64,
        hidden_dim: int = 256,
        num_layers: int = 2,
        output_dim: int = 256,
        bidirectional: bool = True,
        dropout: float = 0.2
    ):
        """Initialize the motion sensor encoder.
        
        Args:
            input_dim: Number of sensor features (10 for motion sensors)
            embedding_dim: Dimension of feature embeddings
            hidden_dim: Hidden dimension of LSTM layers
            num_layers: Number of LSTM layers
            output_dim: Dimension of output embeddings
            bidirectional: Whether to use bidirectional LSTM
            dropout: Dropout rate for regularization
        """
        super(MotionSensorEncoder, self).__init__()
        
        self.input_dim = input_dim
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.output_dim = output_dim
        self.bidirectional = bidirectional
        self.dropout = dropout
        
        # Feature embedding layer for continuous sensor values
        self.feature_embedding = nn.Linear(input_dim, embedding_dim)
        
        # LSTM encoder layers
        self.lstm = nn.LSTM(
            input_size=embedding_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=bidirectional,
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Calculate LSTM output dimension
        lstm_output_dim = hidden_dim * (2 if bidirectional else 1)
        
        # Output projection layers
        self.output_projection = nn.Sequential(
            nn.Linear(lstm_output_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, output_dim)
        )
        
        # Layer normalization
        self.layer_norm = nn.LayerNorm(embedding_dim)
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize model weights using Xavier initialization."""
        for name, param in self.named_parameters():
            if 'weight' in name:
                if 'lstm' in name:
                    # Initialize LSTM weights
                    nn.init.xavier_uniform_(param)
                else:
                    # Initialize linear layer weights
                    nn.init.xavier_uniform_(param)
            elif 'bias' in name:
                nn.init.constant_(param, 0)
    
    def forward(
        self, 
        x: torch.Tensor, 
        lengths: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """Forward pass through the encoder.
        
        Args:
            x: Input tensor of shape (batch_size, sequence_length, input_dim)
            lengths: Optional tensor of actual sequence lengths for padding
            
        Returns:
            Encoded embeddings of shape (batch_size, output_dim)
        """
        batch_size, seq_len, _ = x.shape
        
        # Feature embedding
        embedded = self.feature_embedding(x)  # (batch_size, seq_len, embedding_dim)
        embedded = self.layer_norm(embedded)
        embedded = F.relu(embedded)
        
        # Pack sequences if lengths are provided
        if lengths is not None:
            embedded = nn.utils.rnn.pack_padded_sequence(
                embedded, lengths, batch_first=True, enforce_sorted=False
            )
        
        # LSTM encoding
        lstm_out, (hidden, cell) = self.lstm(embedded)
        
        # Unpack sequences if they were packed
        if lengths is not None:
            lstm_out, _ = nn.utils.rnn.pad_packed_sequence(
                lstm_out, batch_first=True
            )
        
        # Use the last hidden state from each direction
        if self.bidirectional:
            # Concatenate forward and backward hidden states
            hidden = hidden.view(self.num_layers, 2, batch_size, self.hidden_dim)
            last_hidden = torch.cat([hidden[-1, 0], hidden[-1, 1]], dim=1)
        else:
            last_hidden = hidden[-1]  # Use last layer's hidden state
        
        # Project to output dimension
        output = self.output_projection(last_hidden)
        
        # L2 normalize the output embeddings
        output = F.normalize(output, p=2, dim=1)
        
        return output
    
    def get_embedding(
        self, 
        x: torch.Tensor, 
        lengths: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """Get normalized embeddings for input sequences.
        
        Args:
            x: Input tensor of shape (batch_size, sequence_length, input_dim)
            lengths: Optional tensor of actual sequence lengths
            
        Returns:
            L2-normalized embeddings of shape (batch_size, output_dim)
        """
        with torch.no_grad():
            return self.forward(x, lengths)

class ContrastiveLoss(nn.Module):
    """Contrastive loss for learning discriminative user representations."""
    
    def __init__(self, margin: float = 1.0, temperature: float = 0.1):
        """Initialize contrastive loss.
        
        Args:
            margin: Margin for contrastive loss
            temperature: Temperature parameter for similarity scaling
        """
        super(ContrastiveLoss, self).__init__()
        self.margin = margin
        self.temperature = temperature
    
    def forward(
        self, 
        embeddings: torch.Tensor, 
        labels: torch.Tensor
    ) -> torch.Tensor:
        """Compute contrastive loss.
        
        Args:
            embeddings: Normalized embeddings of shape (batch_size, embedding_dim)
            labels: User labels of shape (batch_size,)
            
        Returns:
            Contrastive loss value
        """
        batch_size = embeddings.size(0)
        
        # Compute pairwise cosine similarities
        similarities = torch.matmul(embeddings, embeddings.t()) / self.temperature
        
        # Create masks for positive and negative pairs
        labels = labels.unsqueeze(1)
        mask_positive = (labels == labels.t()).float()
        mask_negative = (labels != labels.t()).float()
        
        # Remove self-similarities
        mask_positive = mask_positive - torch.eye(batch_size, device=embeddings.device)
        
        # Compute positive and negative losses
        positive_loss = -similarities * mask_positive
        negative_loss = torch.clamp(self.margin - similarities, min=0) * mask_negative
        
        # Average over valid pairs
        num_positive_pairs = mask_positive.sum()
        num_negative_pairs = mask_negative.sum()
        
        if num_positive_pairs > 0:
            positive_loss = positive_loss.sum() / num_positive_pairs
        else:
            positive_loss = torch.tensor(0.0, device=embeddings.device)
        
        if num_negative_pairs > 0:
            negative_loss = negative_loss.sum() / num_negative_pairs
        else:
            negative_loss = torch.tensor(0.0, device=embeddings.device)
        
        return positive_loss + negative_loss

def create_model(config: dict) -> MotionSensorEncoder:
    """Create motion sensor encoder model from configuration.
    
    Args:
        config: Model configuration dictionary
        
    Returns:
        Initialized MotionSensorEncoder model
    """
    return MotionSensorEncoder(
        input_dim=config.get('input_dim', 10),
        embedding_dim=config.get('embedding_dim', 64),
        hidden_dim=config.get('hidden_dim', 256),
        num_layers=config.get('num_layers', 2),
        output_dim=config.get('output_dim', 256),
        bidirectional=config.get('bidirectional', True),
        dropout=config.get('dropout', 0.2)
    )

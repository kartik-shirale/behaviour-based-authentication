# Keystroke Dynamics Encoder

A PyTorch-based LSTM encoder for converting keystroke dynamics data into vector representations. This system processes CSV data containing keystroke timing and position features, trains an LSTM encoder, and generates embeddings for typing sessions that can be used for user authentication, behavioral analysis, and fraud detection.

## Features

- **LSTM-based Architecture**: Bidirectional LSTM with character embeddings and numerical feature processing
- **Flexible Data Processing**: Handles variable-length typing sessions with proper padding/truncation
- **Comprehensive Training**: Includes validation monitoring, early stopping, and model checkpointing
- **Easy Inference**: Simple API for generating embeddings from new typing sessions
- **Evaluation Tools**: Built-in utilities for model evaluation and visualization
- **Configurable**: YAML-based configuration system for easy hyperparameter tuning

## Installation

### Prerequisites

- Python 3.7 or higher
- CUDA-compatible GPU (optional, but recommended for training)

### Setup

1. Clone or download this repository
2. Install dependencies:

```bash
pip install -r requirements.txt
```

### Dependencies

- PyTorch >= 1.9.0
- pandas >= 1.3.0
- numpy >= 1.21.0
- scikit-learn >= 1.0.0
- tensorboard >= 2.7.0
- matplotlib >= 3.4.0
- seaborn >= 0.11.0
- tqdm >= 4.62.0
- pyyaml >= 5.4.0

## Data Format

The system expects CSV files with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| character | string | The character typed (including special chars like 'backspace', 'enter', ' ') |
| dwellTime | float | Time between key press and release (ms) |
| flightTime | float | Time between releasing previous key and pressing current key (ms) |
| x | float | X coordinate of keystroke |
| y | float | Y coordinate of keystroke |
| action | int | Action type (0 = key down, 1 = key up) |

### Example CSV Data

```csv
character,dwellTime,flightTime,x,y,action
a,120,80,145,672,1
b,100,90,146,670,0
c,150,70,143,669,1
backspace,200,120,147,671,1
enter,180,100,148,672,0
 ,90,85,149,670,1
```

## Quick Start

### 1. Training a Model

```bash
python train.py --data path/to/your/data.csv --model_dir ./models
```

### 2. Generating Embeddings

```bash
python inference.py --model ./models/best_model.pt --input new_session.csv --output embeddings.npy
```

### 3. Using the Python API

```python
from inference import KeystrokeEncoder

# Load trained model
encoder = KeystrokeEncoder('./models/best_model.pt')

# Generate embeddings for new data
embeddings = encoder.encode_csv('new_typing_session.csv')

# Get embedding for a single sequence
sequence = [  # List of keystroke dictionaries
    {'character': 'h', 'dwellTime': 120, 'flightTime': 80, 'x': 145, 'y': 672, 'action': 1},
    {'character': 'e', 'dwellTime': 100, 'flightTime': 90, 'x': 146, 'y': 670, 'action': 0},
    # ... more keystrokes
]
embedding = encoder.encode_sequence(sequence)
```

## Configuration

The system uses a YAML configuration file for hyperparameters. You can create a custom config file or use the default settings:

```yaml
model:
  char_embedding_dim: 64
  lstm_hidden_dim: 256
  lstm_num_layers: 2
  bidirectional: true
  output_dim: 256
  dropout: 0.3

training:
  batch_size: 32
  learning_rate: 0.001
  num_epochs: 100
  early_stopping_patience: 10
  validation_split: 0.2

data:
  max_sequence_length: 500
  min_sequence_length: 10
  normalize_features: true
```

## Detailed Usage

### Training

The training script supports various options:

```bash
python train.py \
    --data path/to/training_data.csv \
    --config custom_config.yaml \
    --model_dir ./models \
    --resume ./models/checkpoint_epoch_50.pt \
    --seed 42
```

**Arguments:**
- `--data`: Path to CSV training data (required)
- `--config`: Path to custom configuration file (optional)
- `--model_dir`: Directory to save models (default: ./models)
- `--resume`: Path to checkpoint to resume training (optional)
- `--seed`: Random seed for reproducibility (default: 42)

### Inference

Generate embeddings for new typing sessions:

```bash
python inference.py \
    --model ./models/best_model.pt \
    --input new_typing_data.csv \
    --output embeddings.npy \
    --batch_size 64
```

**Arguments:**
- `--model`: Path to trained model checkpoint (required)
- `--input`: Path to input CSV file (required)
- `--output`: Path to save embeddings as .npy file (optional)
- `--batch_size`: Batch size for inference (default: 32)
- `--metadata`: Path to metadata file (optional, auto-detected)
- `--config`: Path to config file (optional, auto-detected)

### Model Evaluation

```python
from utils import ModelEvaluator
import numpy as np

# Load embeddings
embeddings = np.load('embeddings.npy')

# Create evaluator
evaluator = ModelEvaluator('./evaluation_results')

# Perform comprehensive evaluation
results = evaluator.evaluate_model_performance(embeddings)

# Visualize embeddings
fig = evaluator.visualize_embeddings_2d(embeddings, method='tsne')

# Analyze clustering
clustering_results = evaluator.analyze_clustering(embeddings)
fig = evaluator.plot_clustering_analysis(clustering_results)
```

## Model Architecture

The keystroke dynamics encoder consists of:

1. **Character Embedding Layer**: Converts characters to dense vectors (32-64 dimensions)
2. **Feature Concatenation**: Combines character embeddings with normalized numerical features
3. **Bidirectional LSTM**: Processes sequential keystroke data (2-3 layers, 128-256 hidden units)
4. **Output Projection**: Maps LSTM output to final embedding space (128-512 dimensions)
5. **Dropout Regularization**: Prevents overfitting during training

### Input Processing

- **Character Encoding**: Each character is mapped to an index and embedded
- **Numerical Features**: Dwell time, flight time, and coordinates are normalized
- **Sequence Handling**: Variable-length sequences are padded/truncated to fixed length
- **Batch Processing**: Efficient processing using packed sequences

### Training Strategy

- **Loss Function**: Contrastive loss for learning discriminative embeddings
- **Optimization**: Adam optimizer with learning rate scheduling
- **Regularization**: Dropout and gradient clipping for stability
- **Validation**: Early stopping based on validation loss

## File Structure

```
keystroke-encoder/
├── config.py              # Configuration management
├── data_processor.py      # Data loading and preprocessing
├── model.py              # LSTM encoder model definition
├── train.py              # Training script
├── inference.py          # Inference and embedding generation
├── utils.py              # Evaluation and visualization utilities
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Output Files

After training, the following files are generated:

- `best_model.pt`: Best model checkpoint based on validation loss
- `latest_model.pt`: Most recent model checkpoint
- `metadata.pkl`: Vocabulary, scaler, and other preprocessing metadata
- `config.yaml`: Configuration used for training
- `training_history.json`: Training and validation loss history
- `logs/`: Tensorboard logs for training visualization

## Advanced Usage

### Custom Loss Functions

You can implement custom loss functions by extending the base loss classes:

```python
from model import ContrastiveLoss

class CustomLoss(ContrastiveLoss):
    def forward(self, embeddings, labels=None):
        # Your custom loss implementation
        return loss
```

### Data Augmentation

Implement data augmentation for better generalization:

```python
def augment_sequence(sequence):
    # Add noise to timing features
    # Simulate typing variations
    return augmented_sequence
```

### Similarity Search

Use embeddings for finding similar typing patterns:

```python
from inference import KeystrokeEncoder

encoder = KeystrokeEncoder('./models/best_model.pt')

# Generate embeddings for database
database_embeddings = encoder.encode_csv('database.csv')

# Query embedding
query_embedding = encoder.encode_csv('query.csv')[0]

# Find similar patterns
similar_indices = encoder.find_similar_sequences(
    query_embedding, database_embeddings, top_k=5
)
```

## Troubleshooting

### Common Issues

1. **CUDA Out of Memory**: Reduce batch size or sequence length
2. **Slow Training**: Enable GPU acceleration or reduce model size
3. **Poor Convergence**: Adjust learning rate or increase model capacity
4. **Overfitting**: Increase dropout or add more training data

### Performance Tips

- Use GPU for training when available
- Optimize batch size based on available memory
- Use mixed precision training for faster training
- Implement data loading optimizations for large datasets

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is licensed under the MIT License.

## Citation

If you use this code in your research, please cite:

```bibtex
@software{keystroke_dynamics_encoder,
  title={Keystroke Dynamics Encoder: LSTM-based Behavioral Biometrics},
  author={Your Name},
  year={2024},
  url={https://github.com/your-repo/keystroke-encoder}
}
```
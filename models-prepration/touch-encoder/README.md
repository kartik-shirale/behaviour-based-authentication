# Touch Dynamics Encoder

A PyTorch-based LSTM autoencoder for converting touch/gesture dynamics data into vector representations. This system processes touch event data containing gesture timing, position, and velocity features, trains an LSTM encoder, and generates embeddings for touch sessions that can be used for user authentication, behavioral analysis, and fraud detection.

## Features

- **LSTM Autoencoder Architecture**: Encoder-decoder LSTM for learning touch pattern representations
- **Flexible Data Processing**: Handles variable-length touch sessions with proper padding/truncation
- **Comprehensive Training**: Includes validation monitoring, early stopping, and model checkpointing
- **Easy Inference**: Simple API for generating embeddings from new touch sessions
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

The system expects JSON or CSV files with touch gesture data. Each gesture should contain:

| Field | Type | Description |
|-------|------|-------------|
| startX | float | Starting X coordinate of the gesture |
| startY | float | Starting Y coordinate of the gesture |
| endX | float | Ending X coordinate of the gesture |
| endY | float | Ending Y coordinate of the gesture |
| duration | float | Duration of the gesture (ms) |
| distance | float | Total distance traveled |
| velocity | float | Average velocity of the gesture |
| gesture_type | string | Type of gesture (tap, swipe, scroll, pinch) |

### Example Data

```json
[
  {
    "startX": 50.0,
    "startY": 150.0,
    "endX": 200.0,
    "endY": 300.0,
    "duration": 250,
    "distance": 150.5,
    "velocity": 0.6,
    "gesture_type": "swipe"
  }
]
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
from inference import TouchEncoder

# Load trained model
encoder = TouchEncoder('./models/best_model.pt')

# Generate embeddings for new data
embeddings = encoder.encode_csv('new_touch_session.csv')

# Get embedding for a single gesture sequence
sequence = [
    {'startX': 50.0, 'startY': 150.0, 'endX': 200.0, 'endY': 300.0, 
     'duration': 250, 'distance': 150.5, 'velocity': 0.6},
]
embedding = encoder.encode_sequence(sequence)
```

## Configuration

The system uses a YAML configuration file for hyperparameters:

```yaml
model:
  lstm_hidden_dim: 256
  lstm_num_layers: 2
  bidirectional: true
  output_dim: 256
  dropout: 0.3
  input_features: 7

training:
  batch_size: 32
  learning_rate: 0.001
  num_epochs: 100
  early_stopping_patience: 10
  validation_split: 0.2

data:
  max_sequence_length: 100
  min_sequence_length: 5
  normalize_features: true
```

## Model Architecture

The touch dynamics encoder consists of:

1. **Feature Normalization Layer**: Normalizes input touch features
2. **LSTM Encoder**: Processes sequential touch data (2-3 layers, 128-256 hidden units)
3. **Attention Mechanism**: Weighted aggregation of LSTM outputs
4. **Output Projection**: Maps to final embedding space (256 dimensions)
5. **Dropout Regularization**: Prevents overfitting during training

### Input Processing

- **Numerical Features**: Position, duration, distance, velocity are normalized
- **Gesture Type Encoding**: One-hot encoding for gesture types
- **Sequence Handling**: Variable-length sequences are padded/truncated to fixed length

## File Structure

```
touch-encoder/
├── config.py              # Configuration management
├── data_processor.py      # Data loading and preprocessing
├── model.py               # LSTM encoder model definition
├── train.py               # Training script
├── inference.py           # Inference and embedding generation
├── utils.py               # Evaluation and visualization utilities
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

## Output Files

After training, the following files are generated:

- `best_model.pt`: Best model checkpoint based on validation loss
- `latest_model.pt`: Most recent model checkpoint
- `metadata.pkl`: Scaler and preprocessing metadata
- `config.yaml`: Configuration used for training
- `training_history.json`: Training and validation loss history
- `logs/`: Tensorboard logs for training visualization

## License

This project is part of the Sentinel Fraud Detection system.

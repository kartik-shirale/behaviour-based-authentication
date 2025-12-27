# Typing/Keystroke Encoder Model Files

Place your trained typing encoder model files in this directory:

## Required Files:

1. **model.pth** - The trained PyTorch bidirectional LSTM encoder model

   - Should be compatible with the KeystrokeLSTMEncoder class
   - Processes character embeddings + 4 numerical features
   - Output embedding size: 256 dimensions

2. **vocab.json** - Character vocabulary mapping

   - Maps characters to integer indices
   - Used for character embedding lookup

3. **scaler.pkl** - Feature scaling parameters

   - Normalizes numerical features (dwellTime, flightTime, x, y)
   - Should be a scikit-learn scaler object

4. **config.yaml** - Model configuration
   - Contains model hyperparameters
   - Vocabulary size, embedding dimensions, etc.

## Model Architecture:

- Bidirectional LSTM encoder for keystroke dynamics
- Combines character embeddings with numerical features
- Processes sequences of keystrokes
- Outputs 256-dimensional embeddings

## Input Data Format:

The model expects keystroke data with the following features:

- **character**: The typed character
- **dwellTime**: Time key was held down (ms)
- **flightTime**: Time between key releases (ms)
- **x, y**: Key coordinates on keyboard

## Usage:

Once all files are placed here, the Flask API will automatically load them and make the typing encoding endpoint available at `/encode/typing`.

## File Formats:

- Model: saved using `torch.save()`
- Vocabulary: JSON file with character-to-index mapping
- Scaler: saved using `pickle.dump()`
- Config: YAML file with model parameters
- Ensure compatibility with the inference code in the typing-encoder folder
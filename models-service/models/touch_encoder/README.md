# Touch/Gesture Encoder Model Files

Place your trained touch/gesture encoder model files in this directory:

## Required Files:

1. **model.pth** - The trained PyTorch LSTM encoder model
   - Should be compatible with the GestureLSTMEncoder class
   - Input size: 7 features (x, y, pressure, area, orientation, timestamp, velocity)
   - Output embedding size: 256 dimensions

## Model Architecture:
- LSTM-based encoder for touch/swipe gesture data
- Processes 7-dimensional feature vectors
- Handles variable sequence lengths
- Outputs 256-dimensional embeddings

## Input Data Format:
The model expects gesture data with the following features:
- **x, y**: Touch coordinates
- **pressure**: Touch pressure (0.0 to 1.0)
- **area**: Touch contact area
- **orientation**: Touch orientation angle
- **timestamp**: Time of touch event
- **velocity**: Touch movement velocity

## Usage:
Once the model file is placed here, the Flask API will automatically load it and make the gesture encoding endpoint available at `/encode/gesture`.

## File Format:
- Model should be saved using `torch.save()`
- Ensure compatibility with the inference code in the touch-encoder folder
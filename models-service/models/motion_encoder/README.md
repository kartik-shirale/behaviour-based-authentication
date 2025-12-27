# Motion Encoder Model Files

Place your trained motion encoder model files in this directory:

## Required Files:

1. **model.pth** - The trained PyTorch LSTM autoencoder model
   - Should be compatible with the IMUAutoencoder or IMUEncoderOnly class
   - Input size: 11 features (accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, mag_x, mag_y, mag_z, timestamp, pressure)
   - Output embedding size: 256 dimensions

2. **processor.pkl** - Data preprocessing parameters
   - Contains normalization/scaling parameters
   - Used to preprocess input data before encoding

## Model Architecture:
- LSTM-based autoencoder for IMU sensor data
- Handles variable sequence lengths
- Processes 11-dimensional feature vectors
- Outputs 256-dimensional embeddings

## Usage:
Once these files are placed here, the Flask API will automatically load them and make the motion encoding endpoint available at `/encode/motion`.

## File Format:
- Models should be saved using `torch.save()`
- Processor should be saved using `pickle.dump()`
- Ensure compatibility with the inference code in the motion-encoder folder
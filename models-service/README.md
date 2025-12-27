# Fraud Detection Encoder API

A Flask-based production API system for encoding motion, touch/gesture, and typing data using pre-trained LSTM models.

## Overview

This system provides REST API endpoints to encode different types of behavioral biometric data:
- **Motion Encoder**: Processes IMU sensor data (11 features) using LSTM autoencoder
- **Touch Encoder**: Processes touch/gesture data (7 features) using LSTM encoder
- **Typing Encoder**: Processes keystroke dynamics data using bidirectional LSTM

All encoders output 256-dimensional vector embeddings.

## Project Structure

```
prod_envoirment/
├── app.py                 # Main Flask application
├── config.py             # Configuration management
├── encoder_service.py    # Unified encoder service
├── validators.py         # Input validation utilities
├── requirements.txt      # Python dependencies
├── README.md            # This documentation
└── models/              # Model files (to be added)
    ├── motion_encoder/
    │   ├── model.pth
    │   └── processor.pkl
    ├── touch_encoder/
    │   └── model.pth
    └── typing_encoder/
        ├── model.pth
        ├── vocab.json
        ├── scaler.pkl
        └── config.yaml
```

## Installation

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Up Models**
   - Place your trained model files in the `models/` directory
   - Follow the structure shown above for each encoder type
   - The system uses placeholder models if actual models are not found

3. **Configuration** (Optional)
   - Create `config.yaml` to override default settings
   - Set environment variables for production deployment

## Usage

### Starting the Server

```bash
# Development
python app.py

# Production (with Gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

The server will start on `http://localhost:5000` by default.

### API Endpoints

#### Health Check
```bash
GET /health
```
Returns basic service health status.

#### Detailed Status
```bash
GET /status
```
Returns detailed service information including model status and configuration.

#### Motion Encoding
```bash
POST /encode/motion
Content-Type: application/json

{
  "data": {
    "accel_x": [0.1, 0.2, 0.3],
    "accel_y": [0.4, 0.5, 0.6],
    "accel_z": [0.7, 0.8, 0.9],
    "gyro_x": [0.01, 0.02, 0.03],
    "gyro_y": [0.04, 0.05, 0.06],
    "gyro_z": [0.07, 0.08, 0.09],
    "mag_x": [0.1, 0.1, 0.1],
    "mag_y": [0.2, 0.2, 0.2],
    "mag_z": [0.3, 0.3, 0.3],
    "motion_magnitude": [0.85, 0.92, 0.88],
    "rotation_rate": [0.15, 0.18, 0.16]
  }
}
```

#### Gesture Encoding
```bash
POST /encode/gesture
Content-Type: application/json

{
  "data": [
    {
      "distance": 150.5,
      "duration": 250,
      "endX": 200.0,
      "endY": 300.0,
      "startX": 50.0,
      "startY": 150.0,
      "velocity": 0.6
    }
  ]
}
```

#### Typing Encoding
```bash
POST /encode/typing
Content-Type: application/json

{
  "data": [
    {
      "character": "h",
      "dwellTime": 120,
      "flightTime": 80,
      "coordinate_x": 100,
      "coordinate_y": 200
    },
    {
      "character": "e",
      "dwellTime": 110,
      "flightTime": 75,
      "coordinate_x": 150,
      "coordinate_y": 200
    }
  ]
}
```

#### Batch Processing
For processing multiple samples at once:
```bash
POST /encode/motion/batch
POST /encode/gesture/batch
POST /encode/typing/batch

{
  "data": [
    { /* first sample */ },
    { /* second sample */ },
    // ... up to max_batch_size samples
  ]
}
```

### Response Format

Successful encoding returns:
```json
{
  "success": true,
  "embedding": [0.1, 0.2, ..., 0.256],
  "embedding_size": 256,
  "model_type": "motion_encoder",
  "timestamp": "2024-01-20T10:30:00.123456"
}
```

Batch processing returns:
```json
{
  "success": true,
  "embeddings": [
    [0.1, 0.2, ..., 0.256],
    [0.3, 0.4, ..., 0.512]
  ],
  "count": 2,
  "embedding_size": 256,
  "model_type": "motion_encoder",
  "timestamp": "2024-01-20T10:30:00.123456"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error description",
  "error_type": "ValidationError",
  "timestamp": "2024-01-20T10:30:00.123456"
}
```

## Configuration

### Environment Variables
- `FLASK_ENV`: Set to 'production' for production deployment
- `FLASK_PORT`: Server port (default: 5000)
- `FLASK_HOST`: Server host (default: 0.0.0.0)
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)

### Configuration File (config.yaml)
```yaml
server:
  host: "0.0.0.0"
  port: 5000
  debug: false

api:
  max_request_size: 16777216  # 16MB
  max_batch_size: 100
  request_timeout: 30
  enable_cors: true

logging:
  level: "INFO"
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

models:
  motion_encoder:
    model_path: "models/motion_encoder/model.pth"
    processor_path: "models/motion_encoder/processor.pkl"
  
  touch_encoder:
    model_path: "models/touch_encoder/model.pth"
  
  typing_encoder:
    model_path: "models/typing_encoder/model.pth"
    vocab_path: "models/typing_encoder/vocab.json"
    scaler_path: "models/typing_encoder/scaler.pkl"
    config_path: "models/typing_encoder/config.yaml"
```

## Model Integration

To integrate your trained models:

1. **Motion Encoder**: Place `model.pth` and `processor.pkl` in `models/motion_encoder/`
2. **Touch Encoder**: Place `model.pth` in `models/touch_encoder/`
3. **Typing Encoder**: Place `model.pth`, `vocab.json`, `scaler.pkl`, and `config.yaml` in `models/typing_encoder/`

The system will automatically detect and load these models on startup.

## Error Handling

The API handles various error scenarios:
- **400 Bad Request**: Invalid input data or format
- **413 Payload Too Large**: Request exceeds size limits
- **422 Unprocessable Entity**: Data validation errors
- **500 Internal Server Error**: Model loading or processing errors
- **503 Service Unavailable**: Models not loaded or service unhealthy

## Security Considerations

- Enable CORS only for trusted domains in production
- Set appropriate request size limits
- Use HTTPS in production
- Implement authentication/authorization as needed
- Monitor and log all requests

## Performance

- Batch processing is more efficient for multiple samples
- Models are loaded once at startup for optimal performance
- Consider using GPU acceleration for large-scale deployments
- Use a production WSGI server like Gunicorn for deployment

## Troubleshooting

### Common Issues

1. **Models not loading**: Check file paths and permissions
2. **Memory errors**: Reduce batch size or optimize model size
3. **Timeout errors**: Increase request timeout in configuration
4. **Validation errors**: Check input data format and required fields

### Logs
Check application logs for detailed error information:
```bash
tail -f app.log
```

## Development

### Running Tests
```bash
pytest tests/
```

### Code Structure
- `app.py`: Main Flask application and route definitions
- `encoder_service.py`: Model management and encoding logic
- `config.py`: Configuration management
- `validators.py`: Input validation and sanitization

## License

This project is part of the Fraud Detection system.
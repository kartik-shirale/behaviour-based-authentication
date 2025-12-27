# Fraud Detection Encoder API - Usage Guide

## Overview

The Fraud Detection Encoder API provides three specialized neural network encoders for behavioral biometrics:
- **Motion Encoder**: Processes accelerometer, gyroscope, and magnetometer data
- **Gesture Encoder**: Analyzes touch gesture patterns
- **Typing Encoder**: Encodes keystroke dynamics and typing patterns

Each encoder returns a 256-dimensional embedding vector that can be used for fraud detection and user authentication.

## Quick Start

### 1. Installation

```bash
cd prod_envoirment
pip install -r requirements.txt
```

### 2. Configuration

Edit `config.yaml` to customize settings:

```yaml
server:
  host: '0.0.0.0'
  port: 5002
  debug: false

logging:
  level: 'INFO'
  file: null  # Set to filename for file logging

models:
  motion_encoder:
    path: 'models/motion_encoder'
  gesture_encoder:
    path: 'models/touch_encoder'
  typing_encoder:
    path: 'models/typing_encoder'
```

### 3. Start the Server

```bash
python app.py
```

The API will be available at `http://localhost:5002`

## API Endpoints

### Health Check

**GET** `/health`

Returns server health status.

```bash
curl http://localhost:5002/health
```

**Response:**
```json
{
  "status": "healthy"
}
```

### Service Status

**GET** `/status`

Returns detailed service information.

```bash
curl http://localhost:5002/status
```

**Response:**
```json
{
  "status": "healthy",
  "service": "Fraud Detection Encoder API",
  "models": {
    "motion_encoder": "loaded",
    "gesture_encoder": "loaded",
    "typing_encoder": "loaded"
  }
}
```

### Motion Encoder

**POST** `/encode/motion`

Processes motion sensor data (accelerometer, gyroscope, magnetometer).

**Request Format:**
```json
{
  "accelerometer": [[ax1, ay1, az1], [ax2, ay2, az2], ...],
  "gyroscope": [[gx1, gy1, gz1], [gx2, gy2, gz2], ...],
  "magnetometer": [[mx1, my1, mz1], [mx2, my2, mz2], ...]
}
```

**Example:**
```bash
curl -X POST http://localhost:5002/encode/motion \
  -H "Content-Type: application/json" \
  -d '{
    "accelerometer": [[0.1, 0.2, 9.8], [0.15, 0.25, 9.75]],
    "gyroscope": [[0.01, 0.02, 0.03], [0.015, 0.025, 0.035]],
    "magnetometer": [[25.5, 30.2, 45.1], [25.8, 30.5, 45.3]]
  }'
```

**Response:**
```json
{
  "embedding": [-0.91, 1.30, 0.02, ...],
  "dimension": 256,
  "model_type": "motion_encoder",
  "input_type": "dict",
  "status": "success"
}
```

### Gesture Encoder

**POST** `/encode/gesture`

Processes touch gesture data.

**Request Format:**
```json
[
  {
    "distance": 150.5,
    "duration": 0.8,
    "endX": 200,
    "endY": 300,
    "startX": 100,
    "startY": 200,
    "velocity": 188.125
  }
]
```

**Example:**
```bash
curl -X POST http://localhost:5002/encode/gesture \
  -H "Content-Type: application/json" \
  -d '[
    {
      "distance": 150.5,
      "duration": 0.8,
      "endX": 200,
      "endY": 300,
      "startX": 100,
      "startY": 200,
      "velocity": 188.125
    }
  ]'
```

### Typing Encoder

**POST** `/encode/typing`

Processes keystroke dynamics data.

**Request Format:**
```json
[
  {
    "character": "h",
    "dwellTime": 0.12,
    "flightTime": 0.08,
    "coordinate_x": 150,
    "coordinate_y": 200
  }
]
```

**Example:**
```bash
curl -X POST http://localhost:5002/encode/typing \
  -H "Content-Type: application/json" \
  -d '[
    {
      "character": "h",
      "dwellTime": 0.12,
      "flightTime": 0.08,
      "coordinate_x": 150,
      "coordinate_y": 200
    }
  ]'
```

## Client Examples

### Python Client

```python
import requests
import json

class FraudDetectionClient:
    def __init__(self, base_url="http://localhost:5002"):
        self.base_url = base_url
    
    def encode_motion(self, accelerometer, gyroscope, magnetometer):
        data = {
            "accelerometer": accelerometer,
            "gyroscope": gyroscope,
            "magnetometer": magnetometer
        }
        response = requests.post(f"{self.base_url}/encode/motion", json=data)
        return response.json()
    
    def encode_gesture(self, gesture_points):
        response = requests.post(f"{self.base_url}/encode/gesture", json=gesture_points)
        return response.json()
    
    def encode_typing(self, keystrokes):
        response = requests.post(f"{self.base_url}/encode/typing", json=keystrokes)
        return response.json()

# Usage example
client = FraudDetectionClient()

# Motion encoding
motion_result = client.encode_motion(
    accelerometer=[[0.1, 0.2, 9.8], [0.15, 0.25, 9.75]],
    gyroscope=[[0.01, 0.02, 0.03], [0.015, 0.025, 0.035]],
    magnetometer=[[25.5, 30.2, 45.1], [25.8, 30.5, 45.3]]
)
print(f"Motion embedding dimension: {motion_result['dimension']}")
```

### JavaScript Client

```javascript
class FraudDetectionClient {
    constructor(baseUrl = 'http://localhost:5002') {
        this.baseUrl = baseUrl;
    }

    async encodeMotion(accelerometer, gyroscope, magnetometer) {
        const response = await fetch(`${this.baseUrl}/encode/motion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accelerometer, gyroscope, magnetometer })
        });
        return response.json();
    }

    async encodeGesture(gesturePoints) {
        const response = await fetch(`${this.baseUrl}/encode/gesture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gesturePoints)
        });
        return response.json();
    }

    async encodeTyping(keystrokes) {
        const response = await fetch(`${this.baseUrl}/encode/typing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(keystrokes)
        });
        return response.json();
    }
}

// Usage example
const client = new FraudDetectionClient();

client.encodeMotion(
    [[0.1, 0.2, 9.8], [0.15, 0.25, 9.75]],
    [[0.01, 0.02, 0.03], [0.015, 0.025, 0.035]],
    [[25.5, 30.2, 45.1], [25.8, 30.5, 45.3]]
).then(result => {
    console.log(`Motion embedding dimension: ${result.dimension}`);
});
```

## Production Deployment

### Option 1: Docker Deployment

1. **Create Dockerfile:**

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5002/health || exit 1

# Start application
CMD ["python", "app.py"]
```

2. **Build and run:**

```bash
# Build image
docker build -t fraud-detection-api .

# Run container
docker run -d \
  --name fraud-detection \
  -p 5002:5002 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  -v $(pwd)/models:/app/models \
  fraud-detection-api
```

3. **Docker Compose (recommended):**

```yaml
# docker-compose.yml
version: '3.8'

services:
  fraud-detection-api:
    build: .
    ports:
      - "5002:5002"
    volumes:
      - ./config.yaml:/app/config.yaml
      - ./models:/app/models
      - ./logs:/app/logs
    environment:
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - fraud-detection-api
    restart: unless-stopped
```

### Option 2: Systemd Service (Linux)

1. **Create service file:**

```ini
# /etc/systemd/system/fraud-detection-api.service
[Unit]
Description=Fraud Detection Encoder API
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/fraud-detection-api
Environment=PATH=/opt/fraud-detection-api/venv/bin
ExecStart=/opt/fraud-detection-api/venv/bin/python app.py
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/fraud-detection-api/logs

[Install]
WantedBy=multi-user.target
```

2. **Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable fraud-detection-api
sudo systemctl start fraud-detection-api
sudo systemctl status fraud-detection-api
```

### Option 3: Cloud Deployment

#### AWS ECS with Fargate

1. **Task Definition:**

```json
{
  "family": "fraud-detection-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "fraud-detection-api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/fraud-detection-api:latest",
      "portMappings": [
        {
          "containerPort": 5002,
          "protocol": "tcp"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5002/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fraud-detection-api",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Google Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT-ID/fraud-detection-api

# Deploy to Cloud Run
gcloud run deploy fraud-detection-api \
  --image gcr.io/PROJECT-ID/fraud-detection-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --port 5002
```

### Load Balancing and Scaling

#### Nginx Configuration

```nginx
# nginx.conf
upstream fraud_detection_api {
    least_conn;
    server 127.0.0.1:5002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:5003 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:5004 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://fraud_detection_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }
    
    location /health {
        access_log off;
        proxy_pass http://fraud_detection_api;
    }
}
```

## Security Considerations

### 1. API Authentication

Add API key authentication:

```python
# Add to app.py
from functools import wraps

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key or api_key != os.environ.get('API_KEY'):
            return jsonify({'error': 'Invalid API key'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Apply to endpoints
@app.route('/encode/motion', methods=['POST'])
@require_api_key
def encode_motion():
    # ... existing code
```

### 2. Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

@app.route('/encode/motion', methods=['POST'])
@limiter.limit("10 per minute")
def encode_motion():
    # ... existing code
```

### 3. Input Validation

The API already includes comprehensive input validation through the `validators.py` module.

### 4. HTTPS Configuration

Always use HTTPS in production. Configure SSL/TLS certificates through your reverse proxy or cloud provider.

## Monitoring and Logging

### Application Metrics

```python
# Add to app.py
from prometheus_flask_exporter import PrometheusMetrics

metrics = PrometheusMetrics(app)
metrics.info('app_info', 'Application info', version='1.0.0')
```

### Health Checks

The API provides health check endpoints:
- `/health` - Basic health status
- `/status` - Detailed service information

### Log Management

Configure structured logging in production:

```yaml
# config.yaml
logging:
  level: 'INFO'
  file: '/var/log/fraud-detection-api/app.log'
  format: 'json'  # For structured logging
```

## Troubleshooting

### Common Issues

1. **Model Loading Errors**
   - Ensure model files exist in the specified paths
   - Check file permissions
   - Verify model compatibility

2. **Memory Issues**
   - Increase container/server memory allocation
   - Monitor memory usage during inference
   - Consider model optimization

3. **Performance Issues**
   - Enable GPU acceleration if available
   - Implement request batching
   - Use connection pooling

### Debug Mode

For development, enable debug mode:

```yaml
# config.yaml
server:
  debug: true
```

**Warning:** Never enable debug mode in production.

## API Versioning

For production APIs, consider implementing versioning:

```python
# Version 1 endpoints
@app.route('/v1/encode/motion', methods=['POST'])
def encode_motion_v1():
    # ... implementation

# Version 2 endpoints (future)
@app.route('/v2/encode/motion', methods=['POST'])
def encode_motion_v2():
    # ... enhanced implementation
```

## Support

For issues and questions:
1. Check the logs for error messages
2. Verify input data format matches the API specification
3. Test with the provided example data
4. Monitor system resources (CPU, memory, disk)

---

**Note:** This API is designed for fraud detection and behavioral biometrics. Ensure compliance with privacy regulations and data protection laws in your jurisdiction.
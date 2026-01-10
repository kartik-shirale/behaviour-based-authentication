# Vector Processing Documentation

## Overview

The FinShield backend now includes advanced vector processing capabilities for behavioral biometric data. This system extracts behavioral patterns from mobile device interactions, converts them to embeddings using external encoding APIs, and stores them in Pinecone vector database for similarity analysis and fraud detection.

## Architecture

### Components

1. **VectorService** (`services/vectorService.js`)
   - Handles data extraction and formatting
   - Manages external API calls to encoding services
   - Stores embeddings in Pinecone vector database
   - Provides similarity search capabilities

2. **Enhanced /regular Route** (`app.js`)
   - Processes incoming behavioral data
   - Stores raw data in Firebase
   - Triggers vector processing pipeline
   - Returns processing results

### Data Flow

```
Mobile App → /api/data/regular → Firebase (Raw Data) → Vector Processing → Pinecone (Embeddings)
```

## Supported Data Types

### 1. Motion Data (IMU Sensors)
- **Source**: Accelerometer, Gyroscope, Magnetometer
- **Features**: 11 features (accel_x/y/z, gyro_x/y/z, mag_x/y/z, motion_magnitude, rotation_rate)
- **Encoding Endpoint**: `/encode/motion`
- **Pinecone Index**: `motion-embeddings`

### 2. Touch/Gesture Data
- **Source**: Touch events and gestures
- **Features**: 7 features (distance, duration, endX, endY, startX, startY, velocity)
- **Encoding Endpoint**: `/encode/gesture`
- **Pinecone Index**: `gesture-embeddings`

### 3. Keystroke Dynamics
- **Source**: Typing patterns
- **Features**: 5 fields (character, dwellTime, flightTime, coordinate_x, coordinate_y)
- **Encoding Endpoint**: `/encode/typing`
- **Pinecone Index**: `typing-embeddings`

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key

# Encoding API Configuration
ENCODING_API_URL=http://localhost:8000
```

### Pinecone Setup

1. Create a Pinecone account at [pinecone.io](https://pinecone.io)
2. Get your API key from the dashboard
3. The system will automatically create these indexes:
   - `motion-embeddings` (dimension: 256)
   - `gesture-embeddings` (dimension: 256)
   - `typing-embeddings` (dimension: 256)

## API Usage

### Enhanced /regular Endpoint

**POST** `/api/data/regular`

### Vector Similarity Check Endpoint

**POST** `/api/data/check`

This endpoint performs similarity analysis against stored behavioral patterns to detect potential fraud or anomalies.

**Request Body:**
```json
{
  "userId": "user123",
  "sessionId": "session456",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "motionPattern": [...],
    "touchPatterns": [...],
    "typingPatterns": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Behavioral data analyzed successfully",
  "data": {
    "sessionId": "session456",
    "userId": "user123",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "status": "analyzed",
    "requiresSecurityQuestions": false,
    "riskAssessment": {
      "riskScore": 0.25,
      "riskLevel": "LOW",
      "reason": "High behavioral similarity (avg: 85.3%)",
      "similarityStats": {
        "average": 0.85,
        "maximum": 0.92,
        "minimum": 0.78
      }
    },
    "similarityAnalysis": {
      "summary": {
        "processed": 3,
        "failed": 0,
        "total": 3,
        "averageSimilarity": 0.853,
        "maxSimilarity": 0.92,
        "minSimilarity": 0.78
      },
      "details": {
        "motion": {
          "success": true,
          "similarity": 0.85,
          "matchCount": 5
        },
        "gesture": {
          "success": true,
          "similarity": 0.92,
          "matchCount": 3
        },
        "typing": {
          "success": true,
          "similarity": 0.78,
          "matchCount": 8
        }
      }
    }
  }
}
```

### Enhanced /regular Endpoint

**Request Body:**
```json
{
  "userId": "user123",
  "sessionId": "session456",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "motionPattern": [
      {
        "samples": [
          {
            "accelerometer": { "x": 0.1, "y": 0.2, "z": 0.3 },
            "gyroscope": { "x": 0.01, "y": 0.02, "z": 0.03 },
            "magnetometer": { "x": 0.001, "y": 0.002, "z": 0.003 }
          }
        ]
      }
    ],
    "touchPatterns": [
      {
        "touches": [
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
    ],
    "typingPatterns": [
      {
        "keystrokes": [
          {
            "character": "h",
            "dwellTime": 120,
            "flightTime": 80,
            "coordinate_x": 145.5,
            "coordinate_y": 672.2
          }
        ]
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Behavioral data processed and saved successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "sessionId": "session456",
    "userId": "user123",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "vectorProcessing": {
      "summary": {
        "processed": 3,
        "failed": 0,
        "total": 3
      },
      "details": {
        "motion": { "success": true, "type": "motion" },
        "gesture": { "success": true, "type": "gesture" },
        "typing": { "success": true, "type": "typing" }
      }
    }
  }
}
```

## Vector Storage Structure

### Pinecone Metadata

Each vector stored in Pinecone includes:

```json
{
  "userId": "user123",
  "sessionId": "session456",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dimension": 256,
  "modelType": "motion_encoder",
  "inputType": "array",
  "dataType": "motion",
  "sampleCount": 100
}
```

### Vector IDs

Format: `{userId}_{sessionId}_{timestamp}`

Example: `user123_session456_1705315800000`

## External Encoding API

### Required Endpoints

Your encoding service must provide these endpoints:

1. **POST /encode/motion**
   - Input: IMU sensor data
   - Output: 256-dimensional embedding

2. **POST /encode/gesture**
   - Input: Touch/gesture data
   - Output: 256-dimensional embedding

3. **POST /encode/typing**
   - Input: Keystroke dynamics
   - Output: 256-dimensional embedding

### Expected Response Format

```json
{
  "embedding": [0.123, -0.456, 0.789, ...],
  "dimension": 256,
  "model_type": "motion_encoder",
  "input_type": "array",
  "status": "success",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

### Graceful Degradation

- If vector processing fails, the raw data is still stored in Firebase
- Individual encoding failures don't affect other data types
- API failures are logged but don't crash the main request

### Common Issues

1. **Pinecone API Key Invalid**
   - Check your API key in `.env`
   - Verify Pinecone account status

2. **Encoding API Unavailable**
   - Check `ENCODING_API_URL` configuration
   - Ensure encoding service is running

3. **Data Format Issues**
   - Verify input data matches expected structure
   - Check for missing required fields

## Monitoring and Logging

### Log Messages

- Vector processing start/completion
- Individual encoding results
- Pinecone storage confirmations
- Error details for debugging

### Performance Metrics

- Processing time per data type
- Success/failure rates
- Vector storage statistics

## Future Enhancements

1. **Similarity Search API**
   - Query similar behavioral patterns
   - Fraud detection based on vector similarity

2. **Batch Processing**
   - Process multiple sessions simultaneously
   - Improved throughput for high-volume scenarios

3. **Advanced Analytics**
   - Behavioral pattern clustering
   - Anomaly detection algorithms

4. **Real-time Processing**
   - Stream processing for live fraud detection
   - WebSocket integration for instant alerts

## Security Considerations

1. **API Key Management**
   - Store Pinecone API key securely
   - Use environment variables, never hardcode

2. **Data Privacy**
   - Behavioral data is sensitive
   - Implement proper access controls
   - Consider data encryption at rest

3. **Rate Limiting**
   - Implement rate limiting for encoding APIs
   - Monitor Pinecone usage quotas

## Testing

### Unit Tests

```javascript
// Test data extraction
const motionData = vectorService.extractMotionData(mockMotionPatterns);
assert(motionData.data.accelerometer.length > 0);

// Test API calls
const embedding = await vectorService.callEncodingAPI('/encode/motion', testData);
assert(embedding.dimension === 256);

// Test vector storage
const result = await vectorService.storeEmbedding('test-index', 'user1', 'session1', mockEmbedding);
assert(result.success === true);
```

### Integration Tests

```javascript
// Test full pipeline
const response = await request(app)
  .post('/api/data/regular')
  .send(mockBehavioralData)
  .expect(200);

assert(response.body.data.vectorProcessing.summary.processed > 0);
```

## Support

For issues or questions:

1. Check logs for error details
2. Verify configuration settings
3. Test individual components
4. Review API documentation

---

*This documentation covers the vector processing capabilities added to the FinShield backend system.*
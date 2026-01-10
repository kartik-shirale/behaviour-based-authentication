# FinShield Backend - OTP Authentication & Behavioral Analysis API

A Node.js backend service for OTP-based authentication and behavioral data processing using Firebase Firestore and Twilio SMS service.

## Features

- ✅ Firebase Firestore integration for user data storage
- ✅ Twilio SMS integration for OTP delivery
- ✅ User existence validation before OTP sending
- ✅ OTP expiration handling (10 minutes)
- ✅ Rate limiting for OTP requests
- ✅ Indian mobile number validation (+91 prefix)
- ✅ Comprehensive error handling
- ✅ **NEW:** Behavioral data processing and analysis
- ✅ **NEW:** Touch pattern analysis and risk scoring
- ✅ **NEW:** Typing behavior analysis
- ✅ **NEW:** Device and network behavior tracking
- ✅ **NEW:** Vector embeddings with Pinecone integration
- ✅ **NEW:** Motion, gesture, and typing encoding API endpoints
- ✅ **NEW:** Batch processing support for behavioral data
- ✅ **NEW:** Real-time similarity analysis for fraud detection

## Prerequisites

- Node.js (v16 or higher)
- Firebase project with Firestore enabled
- Twilio account with SMS service
- Users must exist in Firebase Firestore before requesting OTP

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd finshield-backend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp env.example .env
```

4. Update `.env` file with your credentials:

```env
PORT=8000
SECRET_TOKEN=your-secret-token
NODE_ENV=local

# Firebase Configuration
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# OpenCage Data API Configuration
OPEN_CAGE_API_KEY=your-opencage-api-key
```

### Google Maps API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Geocoding API**
4. Create credentials (API Key)
5. Add the API key to your `.env` file as `GOOGLE_MAPS_API_KEY`

**Note**: The system will work without the Google Maps API key, but location data will show as 'Unknown' for city and country fields.

5. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## User Data Structure

Users must exist in Firebase Firestore with the following structure:

```typescript
export interface User {
  uid: string;
  fullName: string;
  mobile: string; // Must include +91 prefix
  emailId: string;
  age: number;
  gender: string;
  profile?: string;
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  balance: number;
  // Security
  recoveryQuestions: {
    question: string;
    answerHash: string;
  }[];
  biometricEnabled: boolean;
  biometricType?: "face" | "fingerprint";
  // Metadata
  isActive: boolean;
  lastLoginAt?: any;
  // OTP fields (managed by backend)
  otp?: string;
  otpExpiry?: Date;
  isVerified?: boolean;
}
```

## API Endpoints

### Base URL

```
http://localhost:8000
```

### 1. Health Check

**GET** `/`

Check if the server is running.

**Response:**

```json
{
  "message": "FinShield OTP Server is running",
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Send OTP

**POST** `/api/send-otp`

Sends OTP to registered users only.

**Request Body:**

```json
{
  "mobile": "+919876543210",
  "hash": "optional-app-hash" // Optional: App hash for SMS auto-verification
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "mobile": "+919876543210",
    "expiresIn": "10 minutes"
  }
}
```

**Error Responses:**

**User Not Found (404):**

```json
{
  "success": false,
  "message": "User not found. Please register first.",
  "code": "USER_NOT_FOUND"
}
```

**Invalid Mobile Format (400):**

```json
{
  "success": false,
  "message": "Invalid mobile number format. Must be +91 followed by 10 digits starting with 6-9"
}
```

**SMS Failure (500):**

```json
{
  "success": false,
  "message": "Failed to send OTP. Please try again later."
}
```

### 3. Verify OTP

**POST** `/api/verify-otp`

Verifies the OTP sent to the user.

**Request Body:**

```json
{
  "mobile": "+919876543210",
  "otp": "123456"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "mobile": "+919876543210",
    "isVerified": true,
    "fullName": "John Doe",
    "uid": "user-unique-id"
  }
}
```

**Error Responses:**

**Invalid OTP (400):**

```json
{
  "success": false,
  "message": "Invalid OTP. Please try again."
}
```

**Expired OTP (400):**

```json
{
  "success": false,
  "message": "OTP has expired. Please request a new OTP."
}
```

**No OTP Found (400):**

```json
{
  "success": false,
  "message": "No OTP found. Please request a new OTP."
}
```

### 4. Resend OTP

**POST** `/api/resend-otp`

Resends OTP with rate limiting.

**Request Body:**

```json
{
  "mobile": "+919876543210",
  "hash": "optional-app-hash" // Optional: App hash for SMS auto-verification
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "New OTP sent successfully",
  "data": {
    "mobile": "+919876543210",
    "expiresIn": "10 minutes"
  }
}
```

**Rate Limited (429):**

```json
{
  "success": false,
  "message": "Please wait 5 minutes before requesting a new OTP."
}
```

### 5. Get User Status

**GET** `/api/user/:mobile`

Retrieve user information and OTP status.

**Example:** `GET /api/user/+919876543210`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "mobile": "+919876543210",
    "fullName": "John Doe",
    "uid": "user-unique-id",
    "isVerified": true,
    "hasActiveOTP": false,
    "isActive": true
  }
}
```

**User Not Found (404):**

```json
{
  "success": false,
  "message": "User not found",
  "code": "USER_NOT_FOUND"
}
```

## Behavioral Data Processing Endpoints

### 6. Process Regular Behavioral Data

**POST** `/api/data/regular`

Processes mobile behavioral data, calculates metrics, and saves to Firebase.

**Request Body:**

```json
{
  "sessionId": "session_123456",
  "userId": "user_789",
  "timestamp": 1640995200000,
  "touchPatterns": [
    {
      "touches": [
        {
          "gestureType": "tap",
          "timestamp": 1640995200000,
          "startX": 100,
          "startY": 200,
          "endX": 100,
          "endY": 200,
          "duration": 150,
          "pressure": 0.8,
          "touchArea": 25,
          "distance": 0,
          "velocity": 0
        }
      ]
    }
  ],
  "typingPatterns": [
    {
      "inputType": "password",
      "keystrokes": [
        {
          "character": "p",
          "timestamp": 1640995200000,
          "dwellTime": 120,
          "flightTime": 0,
          "pressure": 0.6,
          "x": 50,
          "y": 100
        }
      ]
    }
  ],
  "loginBehavior": {
    "timestamp": 1640995200000,
    "loginFlow": "biometric",
    "fallbackUsed": false,
    "biometricOutcome": "success",
    "biometricType": "fingerprint",
    "hardwareAttestation": true
  },
  "locationBehavior": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "accuracy": 10.5,
    "altitude": 216.0,
    "timezone": "Asia/Kolkata"
  },
  "deviceBehavior": {
    "deviceId": "android_device_123",
    "deviceModel": "Samsung Galaxy S21",
    "osVersion": "Android 12",
    "appVersion": "1.0.0",
    "batteryLevel": 85,
    "isCharging": false,
    "orientation": "portrait",
    "screenBrightness": 75
  },
  "networkBehavior": {
    "networkType": "wifi",
    "networkName": "HomeWiFi",
    "networkOperator": "Airtel",
    "isSecureConnection": true,
    "simSerial": "89910000000000000000",
    "simOperator": "Airtel India",
    "simCountry": "IN"
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Behavioral data processed and saved successfully",
  "data": {
    "sessionId": "session_123456",
    "userId": "user_789",
    "documentId": "firebase_doc_id",
    "timestamp": 1640995200000
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "sessionId and userId are required"
}
```

### 7. Check Behavioral Data

**POST** `/api/data/check`

Receives and validates behavioral data without processing or saving (for future implementation).

**Request Body:**

```json
{
  "sessionId": "session_123456",
  "userId": "user_789",
  "timestamp": 1640995200000
  // ... same structure as regular endpoint
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Behavioral data received and validated successfully",
  "data": {
    "sessionId": "session_123456",
    "userId": "user_789",
    "timestamp": 1640995200000,
    "status": "received"
  }
}
```

## Behavioral Data Structure

The system processes mobile behavioral data and calculates the following metrics:

### Touch Gesture Analysis

- **Pressure Patterns**: Average pressure and consistency
- **Touch Area Patterns**: Average touch area and consistency
- **Gesture Timing**: Average duration and timing variations
- **Movement Patterns**: Swipe velocity and accuracy
- **Behavioral Indicators**: Hesitation count and rapid touch detection
- **Risk Scoring**: ML-based risk assessment

### Typing Pattern Analysis

- **Timing Metrics**: Dwell time, flight time, and consistency
- **Touch Behavior**: Pressure variations and touch accuracy
- **Error Patterns**: Error rate and correction speed
- **Mobile-specific**: Autocorrect and predictive text usage

### Login Behavior Analysis

- **Authentication Flow**: Method used and success rates
- **Session Context**: Duration, depth, and idle time
- **Temporal Patterns**: Time of day, day of week analysis

### Location & Device Analysis

- **Advanced Location Tracking**: GPS coordinates with reverse geocoding using OpenCage Data API
- **VPN & Fraud Detection**: Sophisticated algorithms to detect VPN usage, location spoofing, and impossible travel speeds
- **Frequent Location Tracking**: Automatic tracking and counting of user's frequent locations stored as city names
- **Distance & Velocity Analysis**: Calculates distance and travel velocity between login sessions
- **High-Risk Country Detection**: Identifies logins from high-risk geographical locations
- **Location Context**: City, country, and known location detection
- **Travel Patterns**: Distance and velocity calculations
- **Risk Indicators**: VPN/Tor detection, high-risk locations
- **Device Security**: Root detection, debugging status

### Data Storage

Processed behavioral data is stored in Firebase Firestore in the `calculated_behavioral_data` collection with the following structure:

```json
{
  "sessionId": "string",
  "userId": "string",
  "timestamp": "number",
  "touchPatterns": ["TouchGesture objects with calculated metrics"],
  "typingPatterns": ["TypingPattern objects with calculated metrics"],
  "loginBehavior": "LoginBehavior object with calculated metrics",
  "locationBehavior": "LocationBehavior object with calculated metrics",
  "deviceBehavior": "DeviceBehavior object with calculated metrics",
  "networkBehavior": "NetworkBehavior object with calculated metrics",
  "createdAt": "Firestore timestamp",
  "updatedAt": "Firestore timestamp"
}
```

#### Risk Scores Collection

Risk assessment results from the `/api/data/check` endpoint are stored in the `risk_scores` collection with location coordinates included in the `extraInfo` field:

```json
{
  "userId": "string",
  "sessionId": "string",
  "riskLevel": "low|medium|high",
  "totalScore": "number",
  "reason": "string",
  "recommendation": "string",
  "breakdown": {
    "locationRisk": "number",
    "behaviorRisk": "number",
    "deviceRisk": "number"
  },
  "alerts": ["array of alert objects"],
  "extraInfo": {
    "locationCoordinates": {
      "latitude": "number",
      "longitude": "number",
      "accuracy": "number",
      "timestamp": "ISO string"
    }
  },
  "timestamp": "Firestore timestamp",
  "createdAt": "Firestore timestamp"
}
```

## Mobile Number Validation

- Must start with `+91`
- Must be followed by exactly 10 digits
- First digit after +91 must be 6, 7, 8, or 9
- Example: `+919876543210`

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE" // Optional
}
```

## Status Codes

- `200` - Success
- `400` - Bad Request (validation errors, invalid OTP, etc.)
- `404` - User Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## Integration with Expo App

### 1. Send OTP Flow

```javascript
const sendOTP = async (mobile) => {
  try {
    const response = await fetch("http://your-server:8000/api/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mobile }),
    });

    const data = await response.json();

    if (data.success) {
      // OTP sent successfully
      console.log("OTP sent to:", data.data.mobile);
      // Navigate to OTP verification screen
    } else {
      if (data.code === "USER_NOT_FOUND") {
        // User doesn't exist, redirect to registration
        console.log("User not found, please register first");
      } else {
        // Handle other errors
        console.log("Error:", data.message);
      }
    }
  } catch (error) {
    console.error("Network error:", error);
  }
};
```

### 2. Verify OTP Flow

```javascript
const verifyOTP = async (mobile, otp) => {
  try {
    const response = await fetch("http://your-server:8000/api/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mobile, otp }),
    });

    const data = await response.json();

    if (data.success) {
      // OTP verified successfully
      console.log("User verified:", data.data);
      // Store user data and navigate to main app
      const { uid, fullName, mobile } = data.data;
      // Save to AsyncStorage or state management
    } else {
      // Handle verification errors
      console.log("Verification failed:", data.message);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
};
```

## Firebase Firestore Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Create the following collections:
   - `users` - User profile and authentication data
   - `calculated_behavioral_data` - Processed behavioral analytics
   - `user_behavioral_profiles` - User behavioral patterns and frequent locations/networks
   - `user_locations` - Latest user location data for distance calculations
4. Add user documents with the required structure
5. Set up appropriate security rules

### Database Collections Structure

#### users Collection

Stores basic user information and authentication data as described in the User Data Structure section.

#### calculated_behavioral_data Collection

Stores processed behavioral analytics including touch patterns, typing behavior, and risk assessments.

#### user_behavioral_profiles Collection

Stores comprehensive user behavioral patterns including:

- Touch and typing profiles with averages and consistency metrics
- Motion patterns and authentication behavior
- **Frequent locations**: Array of [city_name, visit_count] tuples
- **Frequent networks**: Array of [network_identifier, usage_count] tuples
- Risk profiles and fraud detection metrics
- VPN usage rates and high-risk location indicators

#### user_locations Collection

Stores latest user location data for distance and velocity calculations:

- GPS coordinates (latitude, longitude) with timestamps
- City and country information (via OpenCage Data API reverse geocoding)
- Used for detecting impossible travel speeds and VPN usage
- Document ID format: `{userId}_latest` for easy retrieval

### Sample Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    match /temp_otp/{tempId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## Encoder API Endpoints

The FinShield backend now includes behavioral biometric encoding endpoints that integrate with external ML models for motion, gesture, and typing pattern analysis.

### Health Check Endpoints

#### Basic Health Check

```bash
GET /health
```

Returns basic service health status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.123Z",
  "service": "finshield-backend"
}
```

#### Detailed Status

```bash
GET /status
```

Returns comprehensive service information:

```json
{
  "status": "operational",
  "timestamp": "2024-01-20T10:30:00.123Z",
  "service": "finshield-backend",
  "version": "1.0.0",
  "components": {
    "database": "firebase",
    "vectorDatabase": {
      "provider": "pinecone",
      "status": "connected"
    },
    "encodingApi": {
      "url": "http://localhost:8000",
      "status": "connected"
    }
  },
  "configuration": {
    "environment": "development",
    "maxBatchSize": 100
  }
}
```

### Encoding Endpoints

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

### Batch Processing

For processing multiple samples at once:

```bash
POST /encode/motion/batch
POST /encode/gesture/batch
POST /encode/typing/batch

{
  "data": [
    { /* first sample */ },
    { /* second sample */ },
    // ... up to 100 samples
  ]
}
```

### Response Formats

#### Successful Single Encoding

```json
{
  "success": true,
  "embedding": [0.1, 0.2, ..., 0.256],
  "embedding_size": 256,
  "model_type": "motion_encoder",
  "timestamp": "2024-01-20T10:30:00.123456"
}
```

#### Successful Batch Processing

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

#### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "error_type": "ValidationError",
  "timestamp": "2024-01-20T10:30:00.123456"
}
```

### Integration with Pinecone

The encoding endpoints automatically:

1. **Process behavioral data** through external ML models
2. **Generate vector embeddings** (256-dimensional)
3. **Store embeddings** in Pinecone vector database
4. **Enable similarity search** for fraud detection

#### Pinecone Indexes

- `motion-embeddings`: Motion sensor data embeddings
- `gesture-embeddings`: Touch gesture pattern embeddings
- `typing-embeddings`: Keystroke dynamics embeddings

Each stored vector includes metadata:

```json
{
  "userId": "user123",
  "sessionId": "session456",
  "timestamp": "2024-01-20T10:30:00.123Z",
  "embedding_size": 256,
  "model_type": "motion_encoder",
  "dataType": "motion",
  "sampleCount": 100
}
```

### Environment Variables

Add these to your `.env` file:

```env
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key

# Encoding API Configuration
ENCODING_API_URL=http://localhost:8000
```

## Troubleshooting

### Common Issues

1. **Firebase Connection Error**

   - Verify Firebase configuration in `.env`
   - Check if Firestore is enabled in Firebase console

2. **Twilio SMS Not Sending**

   - Verify Twilio credentials
   - Check if phone number is verified in Twilio console (for trial accounts)
   - Ensure sufficient Twilio balance

3. **User Not Found Error**

   - Ensure user exists in Firestore `users` collection
   - Verify mobile number format matches exactly

4. **OTP Expiration**
   - OTP expires after 10 minutes
   - Use resend-otp endpoint for new OTP

## License

MIT License

# Simple Banking App - Backend Requirements

This document outlines the backend requirements for a simplified banking application focused on core money transfer features.

## Overview

This is a simplified banking application built with React Native and Expo that focuses on essential money transfer functionality. The app allows users to send money, receive money, request money, view transaction history, and manage contacts. **Note: This is a simulation app - no real money is transferred.**

## Firebase Firestore Database Structure

### User Collection Structure

The app uses Firebase Firestore with a `users` collection. Each user document should follow this exact structure:

#### Required Fields for User Document:

```json
{
  "mobile": "+919876543210",
  "fullName": "John Doe",
  "emailId": "john.doe@example.com",
  "age": 30,
  "gender": "male",
  "profile": "https://example.com/profile.jpg",

  // Bank Details
  "bankName": "State Bank of India",
  "accountNumber": "1234567890123456",
  "ifscCode": "SBIN0001234",
  "branchName": "Main Branch",
  "accountType": "savings",
  "balance": 50000.0,

  // Security (Optional - set during onboarding)
  "pinHash": null,
  "recoveryQuestions": [],
  "biometricEnabled": false,
  "biometricType": null,

  // Metadata
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "isActive": true,
  "lastLoginAt": null,

  // Notification
  "fcmToken": null
}
```

#### How to Add a User Manually in Firebase Console:

1. **Go to Firebase Console** → Your Project → Firestore Database
2. **Navigate to** `users` collection (create if doesn't exist)
3. **Click "Add document"**
4. **Set Document ID**: Use auto-generated ID or custom UID
5. **Add the following fields**:

| Field Name          | Type      | Value Example                                |
| ------------------- | --------- | -------------------------------------------- |
| `mobile`            | string    | `+919876543210`                              |
| `fullName`          | string    | `John Doe`                                   |
| `emailId`           | string    | `john.doe@example.com`                       |
| `age`               | number    | `30`                                         |
| `gender`            | string    | `male` or `female`                           |
| `profile`           | string    | `https://example.com/profile.jpg` (optional) |
| `bankName`          | string    | `State Bank of India`                        |
| `accountNumber`     | string    | `1234567890123456`                           |
| `ifscCode`          | string    | `SBIN0001234`                                |
| `branchName`        | string    | `Main Branch`                                |
| `accountType`       | string    | `savings` or `current`                       |
| `balance`           | number    | `50000.00`                                   |
| `pinHash`           | string    | `null` (will be set during onboarding)       |
| `recoveryQuestions` | array     | `[]` (empty array initially)                 |
| `biometricEnabled`  | boolean   | `false`                                      |
| `biometricType`     | string    | `null`                                       |
| `createdAt`         | timestamp | Current timestamp                            |
| `updatedAt`         | timestamp | Current timestamp                            |
| `isActive`          | boolean   | `true`                                       |
| `lastLoginAt`       | timestamp | `null`                                       |
| `fcmToken`          | string    | `null`                                       |

#### Important Notes:

- **Mobile Number Format**: Must include country code (e.g., `+91` for India)
- **isActive**: Must be `true` for the user to be able to login
- **balance**: Should be a number (not string) for calculations
- **Document ID**: Can be auto-generated or use Firebase Auth UID
- **Security Fields**: `pinHash`, `recoveryQuestions`, `biometricEnabled` are set during app onboarding

#### Example Complete User Document:

```json
{
  "mobile": "+919876543210",
  "fullName": "Rajesh Kumar",
  "emailId": "rajesh.kumar@gmail.com",
  "age": 28,
  "gender": "male",
  "profile": null,
  "bankName": "HDFC Bank",
  "accountNumber": "50100123456789",
  "ifscCode": "HDFC0001234",
  "branchName": "Connaught Place",
  "accountType": "savings",
  "balance": 75000,
  "pinHash": null,
  "recoveryQuestions": [],
  "biometricEnabled": false,
  "biometricType": null,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "isActive": true,
  "lastLoginAt": null,
  "fcmToken": null
}
```

### Transaction Collection Structure

The app also uses a `transactions` collection for storing transaction history:

```json
{
  "fromUserId": "user_document_id",
  "toUserId": "recipient_user_document_id",
  "fromMobile": "+919876543210",
  "toMobile": "+919876543211",
  "type": "transfer",
  "amount": 1000,
  "description": "Money transfer",
  "note": "Payment for services",
  "status": "completed",
  "reference": "TXN123456789",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "category": "transfer",
  "recipient": {
    "name": "Recipient Name",
    "mobile": "+919876543211",
    "accountNumber": "1234567890123456"
  }
}
```

## Authentication & User Management

### Authentication System Overview

This banking application implements a robust, multi-layered authentication system designed for maximum security while maintaining user convenience. Here's how we manage user credentials and ensure security:

#### 1. User Registration Process

**Step 1: Mobile Number Verification**

- User enters their mobile number (must be pre-registered in Firebase Firestore)
- System checks if the mobile number exists in the `users` collection with `isActive: true`
- If user exists, an OTP is sent via Firebase Authentication SMS service
- If user doesn't exist, registration is denied (bank customers only)

**Step 2: OTP Verification**

- Firebase Authentication handles OTP generation and verification
- OTP is valid for 5 minutes and automatically expires
- After successful verification, user gains temporary access

**Step 3: Security Setup (First-time users)**

- **PIN Setup**: User creates a 4-6 digit PIN
- **Security Questions**: User sets up recovery questions and answers
- **Biometric Setup**: Optional fingerprint/face recognition setup

#### 2. Credential Storage & Security

**Where User Credentials Are Stored:**

1. **Firebase Firestore Database:**

   ```json
   {
     "mobile": "+919876543210",
     "pinHash": "$2b$10$encrypted_pin_hash",
     "recoveryQuestions": [
       {
         "question": "What is your mother's maiden name?",
         "answerHash": "$2b$10$encrypted_answer_hash"
       }
     ],
     "biometricEnabled": true,
     "biometricType": "fingerprint",
     "lastLoginAt": "2024-01-15T10:30:00Z",
     "isActive": true
   }
   ```

2. **Device Secure Storage (Expo SecureStore):**

   ```typescript
   // Stored locally on device for quick access
   {
     "userSession": "encrypted_session_token",
     "biometricKey": "encrypted_biometric_reference",
     "lastLoginMethod": "pin|biometric|otp"
   }
   ```

3. **Firebase Authentication:**
   - Handles phone number verification
   - Manages session tokens and refresh tokens
   - Provides secure authentication state management

#### 3. Security Measures Implemented

**Data Encryption:**

- **PIN Storage**: Never stored in plain text. Uses bcrypt with salt rounds (cost factor 10)
- **Security Answers**: Hashed using bcrypt before storage
- **Session Data**: Encrypted using AES-256 before storing in SecureStore
- **Biometric Data**: Only biometric reference/template stored, not actual biometric data

**Authentication Flow Security:**

```typescript
// Example of secure PIN verification
const verifyPin = async (enteredPin: string, storedHash: string) => {
  return await bcrypt.compare(enteredPin, storedHash);
};

// Secure session management
const createSecureSession = async (user: User) => {
  const sessionToken = jwt.sign(
    { userId: user.uid, mobile: user.mobile },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  await SecureStore.setItemAsync(
    "userSession",
    encrypt(sessionToken, deviceKey)
  );
};
```

**Security Features:**

- **Auto-logout**: Session expires after 24 hours of inactivity
- **Failed Attempt Protection**: Account temporarily locked after 5 failed PIN attempts
- **Device Binding**: Sessions are tied to specific devices
- **Biometric Fallback**: If biometric fails, user can use PIN
- **OTP Fallback**: If PIN is forgotten, user can re-authenticate via OTP

#### 4. Authentication Methods Supported

**Primary Authentication:**

1. **OTP (One-Time Password)**: For initial login and account recovery
2. **PIN**: For quick daily access (4-6 digits)
3. **Biometric**: Fingerprint or Face ID for convenience

**Authentication Hierarchy:**

```
Biometric (Fastest) → PIN (Quick) → OTP (Most Secure)
```

#### 5. Is This Secure? - Security Analysis

**✅ Strong Security Measures:**

- **Multi-factor Authentication**: Combines something you know (PIN) + something you are (biometric)
- **Industry-standard Encryption**: bcrypt for passwords, AES-256 for session data
- **Firebase Security**: Leverages Google's enterprise-grade security infrastructure
- **No Plain Text Storage**: All sensitive data is hashed or encrypted
- **Session Management**: Proper token expiration and refresh mechanisms
- **Device Security**: Uses platform-specific secure storage (Keychain on iOS, Keystore on Android)

**✅ Additional Security Features:**

- **Rate Limiting**: Prevents brute force attacks
- **Account Lockout**: Temporary suspension after failed attempts
- **Audit Logging**: All authentication events are logged
- **Secure Communication**: All API calls use HTTPS/TLS encryption
- **Input Validation**: All user inputs are validated and sanitized

**⚠️ Security Considerations:**

- **Device Dependency**: If device is compromised, local data could be at risk
- **Biometric Limitations**: Biometric data quality varies by device
- **Recovery Process**: Account recovery requires customer service for maximum security

**🔒 Banking-Grade Security Standards:**

- Follows PCI DSS compliance guidelines
- Implements OWASP security best practices
- Uses Firebase's SOC 2 Type II certified infrastructure
- Regular security audits and penetration testing recommended

#### 6. User Credential Lifecycle

**Registration → Authentication → Session Management → Logout**

1. **Registration**: User credentials created and securely stored
2. **Authentication**: Multi-factor verification process
3. **Session Management**: Secure token-based session handling
4. **Logout**: Complete session cleanup and token invalidation

**Data Retention Policy:**

- Active user data: Retained as long as account is active
- Session tokens: Automatically expire after 24 hours
- Audit logs: Retained for 7 years for compliance
- Deleted accounts: Data permanently removed after 30-day grace period

### 1. User Registration & Onboarding

#### POST `/api/auth/send-otp`

- **Purpose**: Send OTP to mobile number for verification
- **Request Body**:
  ```json
  {
    "mobile": "+1234567890"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "OTP sent successfully",
    "otpId": "unique_otp_id"
  }
  ```

#### POST `/api/auth/verify-otp`

- **Purpose**: Verify OTP code
- **Request Body**:
  ```json
  {
    "mobile": "+1234567890",
    "otp": "123456",
    "otpId": "unique_otp_id"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "token": "jwt_token",
    "user": {
      "id": "user_id",
      "mobile": "+1234567890",
      "isNewUser": true
    }
  }
  ```

#### POST `/api/auth/setup-pin`

- **Purpose**: Set up user PIN for secure access
- **Request Body**:
  ```json
  {
    "pin": "1234",
    "confirmPin": "1234"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

#### POST `/api/auth/setup-biometric`

- **Purpose**: Enable biometric authentication
- **Request Body**:
  ```json
  {
    "biometricType": "face" | "fingerprint",
    "biometricData": "encrypted_biometric_hash"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

#### POST `/api/auth/complete-onboarding`

- **Purpose**: Mark onboarding as complete
- **Headers**: `Authorization: Bearer <token>`

### 2. User Authentication

#### POST `/api/auth/login`

- **Purpose**: Login with mobile and PIN
- **Request Body**:
  ```json
  {
    "mobile": "+1234567890",
    "pin": "1234"
  }
  ```

#### POST `/api/auth/biometric-login`

- **Purpose**: Login with biometric data
- **Request Body**:
  ```json
  {
    "mobile": "+1234567890",
    "biometricData": "encrypted_biometric_hash"
  }
  ```

#### GET `/api/user/profile`

- **Purpose**: Get user profile and balance
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "id": "user_id",
    "name": "John Doe",
    "mobile": "+1234567890",
    "email": "john@example.com",
    "balance": 25000.5,
    "accountNumber": "1234567890",
    "profileImage": "https://example.com/image.jpg"
  }
  ```

## Banking Services

### 3. Money Transfer

#### POST `/api/transfer/send`

- **Purpose**: Send money to another user
- **Request Body**:
  ```json
  {
    "recipientMobile": "+1234567890",
    "amount": 1000,
    "note": "Payment for services",
    "pin": "1234"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "success": true,
    "transactionId": "TXN123456789",
    "message": "Transfer successful",
    "newBalance": 24000.5
  }
  ```

#### POST `/api/transfer/request`

- **Purpose**: Request money from another user
- **Request Body**:
  ```json
  {
    "fromMobile": "+1234567890",
    "amount": 500,
    "note": "Lunch payment"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

#### GET `/api/transfer/contacts`

- **Purpose**: Get recent transfer contacts
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "contacts": [
      {
        "name": "Alice Smith",
        "mobile": "+1234567891",
        "profileImage": "https://example.com/alice.jpg"
      }
    ]
  }
  ```

### 4. Bill Payment

#### GET `/api/bills/categories`

- **Purpose**: Get available bill categories and providers
- **Response**:
  ```json
  {
    "categories": [
      {
        "id": "electricity",
        "name": "Electricity",
        "providers": [
          {
            "id": "provider_1",
            "name": "State Electricity Board",
            "logo": "https://example.com/logo.jpg"
          }
        ]
      }
    ]
  }
  ```

#### POST `/api/bills/fetch-details`

- **Purpose**: Fetch bill details using bill number
- **Request Body**:
  ```json
  {
    "providerId": "provider_1",
    "billNumber": "123456789"
  }
  ```
- **Response**:
  ```json
  {
    "billDetails": {
      "customerName": "John Doe",
      "billAmount": 1500,
      "dueDate": "2024-01-15",
      "billPeriod": "Dec 2023"
    }
  }
  ```

#### POST `/api/bills/pay`

- **Purpose**: Pay bill
- **Request Body**:
  ```json
  {
    "providerId": "provider_1",
    "billNumber": "123456789",
    "amount": 1500,
    "pin": "1234"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

### 5. Mobile Recharge

#### GET `/api/recharge/operators`

- **Purpose**: Get mobile operators and plans
- **Response**:
  ```json
  {
    "operators": [
      {
        "id": "airtel",
        "name": "Airtel",
        "logo": "https://example.com/airtel.jpg",
        "plans": [
          {
            "id": "plan_1",
            "amount": 199,
            "validity": "28 days",
            "description": "Unlimited calls + 1.5GB/day",
            "type": "popular"
          }
        ]
      }
    ]
  }
  ```

#### POST `/api/recharge/process`

- **Purpose**: Process mobile recharge
- **Request Body**:
  ```json
  {
    "mobile": "+1234567890",
    "operatorId": "airtel",
    "amount": 199,
    "planId": "plan_1",
    "pin": "1234"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

### 6. Transaction Management

#### GET `/api/transactions`

- **Purpose**: Get user transaction history
- **Query Parameters**: `page`, `limit`, `type`, `startDate`, `endDate`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "transactions": [
      {
        "id": "TXN123456789",
        "type": "debit",
        "amount": 1000,
        "description": "Money Transfer",
        "date": "2024-01-10T10:30:00Z",
        "status": "completed",
        "recipient": {
          "name": "Alice Smith",
          "mobile": "+1234567891"
        },
        "note": "Payment for services"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
  ```

#### GET `/api/transactions/:id`

- **Purpose**: Get specific transaction details
- **Headers**: `Authorization: Bearer <token>`

## Security Requirements

### 1. Authentication

- JWT tokens for API authentication
- Token refresh mechanism
- Secure PIN storage (hashed)
- Biometric data encryption

### 2. Transaction Security

- PIN verification for all financial transactions
- Transaction limits and fraud detection
- Secure communication (HTTPS/TLS)
- Request signing and validation

### 3. Data Protection

- PCI DSS compliance for payment data
- Data encryption at rest and in transit
- Audit logging for all transactions
- Rate limiting and DDoS protection

## Infrastructure Requirements

### 1. Database

- **Users Table**: Store user profiles, authentication data
- **Transactions Table**: Transaction history and details
- **Bills Table**: Bill payment records
- **Recharges Table**: Mobile recharge history
- **OTP Table**: OTP verification records
- **Contacts Table**: User contact relationships

### 2. External Integrations

- **SMS Gateway**: For OTP delivery
- **Payment Gateway**: For actual money transfers
- **Bill Payment APIs**: Integration with utility providers
- **Mobile Operator APIs**: For recharge services
- **KYC Services**: For user verification

### 3. Monitoring & Analytics

- Transaction monitoring and alerts
- User behavior analytics
- Performance monitoring
- Error tracking and logging

## Development Environment Setup

### 1. Environment Variables

```env
API_BASE_URL=https://api.yourbank.com
JWT_SECRET=your_jwt_secret
SMS_API_KEY=your_sms_api_key
PAYMENT_GATEWAY_KEY=your_payment_key
DATABASE_URL=your_database_url
```

### 2. API Response Format

All APIs should follow consistent response format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "error": null,
  "timestamp": "2024-01-10T10:30:00Z"
}
```

### 3. Error Handling

Standardized error codes and messages:

- `AUTH_001`: Invalid credentials
- `AUTH_002`: Token expired
- `TXN_001`: Insufficient balance
- `TXN_002`: Invalid recipient
- `BILL_001`: Bill not found
- `RECH_001`: Invalid operator

## Testing Requirements

### 1. Unit Tests

- API endpoint testing
- Business logic validation
- Security testing

### 2. Integration Tests

- End-to-end transaction flows
- External service integrations
- Database operations

### 3. Load Testing

- Concurrent user handling
- Transaction processing capacity
- API response times

## Deployment Considerations

### 1. Scalability

- Horizontal scaling for API servers
- Database sharding for large datasets
- CDN for static assets

### 2. High Availability

- Load balancing
- Database replication
- Failover mechanisms

### 3. Backup & Recovery

- Regular database backups
- Transaction log preservation
- Disaster recovery procedures

---

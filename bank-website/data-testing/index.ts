export interface MobileTouchEvent {
  gestureType: "tap" | "swipe" | "scroll" | "pinch" | "long_press";
  timestamp: number;

  // Basic coordinates
  startX: number;
  startY: number;
  endX: number;
  endY: number;

  // Essential measurements
  duration: number; // milliseconds
  pressure: number; // 0-1 scale
  touchArea: number; // contact area in pixels

  // Simple movement data (only for swipe/scroll)
  distance?: number; // total distance traveled
  velocity?: number; // pixels per second
}

export interface MobileKeystroke {
  character: string;
  timestamp: number;
  dwellTime: number; // how long key was pressed
  flightTime: number; // time to next key
  pressure: number; // 0-1
  x: number; // touch coordinate
  y: number; // touch coordinate
}

export interface MobileMotionEvents {
  timestamp: number;

  // Sensor readings
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };

  gyroscope: {
    x: number;
    y: number;
    z: number;
  };

  magnetometer: {
    x: number;
    y: number;
    z: number;
  };

  // Optional derived motion metrics
  motionMagnitude?: number;
  rotationRate?: number;
  orientationChange?: number;
}

export interface MotionPattern {
  samples: MobileMotionEvents[];
  duration: number;
  sampleRateHz: number;
}

// ________________________________________
export interface TouchGesture {
  sessionId: string;
  userId: string;

  // Raw touch events
  touches: MobileTouchEvent[];

  // ===== CORE BEHAVIORAL FEATURES (10 total) =====

  // Touch pressure patterns (2 features)
  avgPressure: number;
  pressureConsistency: number; // how consistent pressure is (fraud indicator)

  // Touch area patterns (2 features)
  avgTouchArea: number;
  areaConsistency: number; // consistent area = potential bot

  // Gesture timing (2 features)
  avgGestureDuration: number;
  timingVariation: number; // human variation vs bot consistency

  // Movement patterns (2 features)
  avgSwipeVelocity: number;
  swipeAccuracy: number; // how straight swipes are (0-1)

  // Behavioral indicators (2 features)
  hesitationCount: number; // long pauses before touches
  rapidTouchCount: number; // suspiciously fast consecutive touches

  // Session metadata
  totalGestures: number;
  sessionDuration: number;
  timestamp: number;
  riskScore: number; // 0-1
}

export interface TypingPattern {
  sessionId: string;
  userId: string;
  inputType: "password" | "email" | "amount" | "text";

  // Raw keystrokes (only what we need)
  keystrokes: MobileKeystroke[];

  // ===== CORE FEATURES (12 total) =====

  // Timing (4 features)
  avgDwellTime: number;
  avgFlightTime: number;
  timingConsistency: number; // std dev of timing
  typingSpeed: number; // chars per second

  // Touch behavior (3 features)
  avgPressure: number;
  pressureVariation: number;
  touchAccuracy: number; // how close to key center

  // Error patterns (2 features)
  errorRate: number; // corrections/total chars
  correctionSpeed: number; // avg time to fix errors

  // Mobile-specific (3 features)
  autocorrectUsage: number; // 0-1 ratio
  predictiveTextUsage: number; // 0-1 ratio
  longPauseCount: number; // pauses > 2 seconds

  // Metadata
  duration: number; // session length in ms
  characterCount: number;
  timestamp: number;
}

export interface LoginBehavior {
  // Timing patterns
  timestamp: number;
  timeOfDay: number; // hour in 24h format
  dayOfWeek: number; // 0-6
  dayOfMonth: number;
  weekOfYear: number;

  loginFrequency: number; // logins per day/week

  // Session context
  sessionDuration: number; // milliseconds
  sessionDepth: number; // screens/actions performed
  sessionIdleTime: number; // total idle time

  // Authentication flow
  loginFlow: "pin" | "biometric" | "otp" | "passwordless";
  authAttempts: number;
  authFailures: number;
  fallbackUsed: boolean;

  // Biometric data
  biometricOutcome: "success" | "failure" | "not_available" | "user_cancelled";
  biometricType: "fingerprint" | "face_id" | "none";
  hardwareAttestation: boolean; // cryptographic verification
}

export interface LocationBehavior {
  // Location data
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  altitude: number;

  // Location context
  city: string;
  country: string;
  timezone: string;
  isKnownLocation: boolean;

  // Travel patterns
  distanceFromLastLogin: number; // kilometers
  velocitySinceLastLogin: number; // km/h (impossible speeds indicate fraud)
  frequentLocations: string[]; // list of common cities/areas

  // Risk indicators
  isVpnDetected: boolean;
  isTorDetected: boolean;
  isHighRiskCountry: boolean;
  locationSpoofingIndicators: number; // 0-1 confidence
}

export interface NetworkBehavior {
  // Network identification
  networkType: "wifi" | "cellular" | "ethernet" | "unknown";
  networkName: string; // SSID for WiFi
  networkOperator: string; // cellular carrier

  // Network characteristics
  connectionQuality: "excellent" | "good" | "fair" | "poor";
  bandwidth: number; // Mbps
  latency: number; // milliseconds
  packetLoss: number; // percentage

  // Security indicators
  isPublicNetwork: boolean;
  isSecureConnection: boolean; // WPA/WEP for WiFi
  vpnDetected: boolean;
  proxyDetected: boolean;

  // Behavioral patterns
  isKnownNetwork: boolean;
  networkUsageHistory: number; // times used before
  connectionStability: number; // connection drops/interruptions
}

export interface DeviceBehavior {
  // Device identification
  deviceId: string; // persistent identifier
  deviceModel: string;
  osVersion: string;
  appVersion: string;

  // Device state
  batteryLevel: number; // 0-100
  isCharging: boolean;
  orientation: "portrait" | "landscape";
  screenBrightness: number; // 0-1

  // Usage patterns
  appUsagePatterns: Record<string, number>; // app usage times
  deviceMotion: {
    accelerometer: { x: number; y: number; z: number };
    gyroscope: { x: number; y: number; z: number };
    magnetometer: { x: number; y: number; z: number };
  };

  // Security indicators
  isRooted: boolean;
  isDebuggingEnabled: boolean;
  hasUnknownApps: boolean;
  screenRecordingDetected: boolean;
  keyloggerDetected: boolean;
}

export interface UserBehavioralProfile {
  userId: string;
  profileVersion: number; // increment when profile is updated
  lastUpdated: number; // timestamp
  dataPoints: number; // number of sessions used to calculate averages

  // ===== TOUCH BEHAVIOR AVERAGES =====
  touchProfile: {
    // Pressure patterns
    avgPressure: number;
    pressureConsistency: number;
    pressureRange: { min: number; max: number };

    // Touch area patterns
    avgTouchArea: number;
    areaConsistency: number;
    areaRange: { min: number; max: number };

    // Gesture timing
    avgGestureDuration: number;
    timingVariation: number;
    durationRange: { min: number; max: number };

    // Movement patterns
    avgSwipeVelocity: number;
    swipeAccuracy: number;
    velocityRange: { min: number; max: number };

    // Behavioral indicators
    avgHesitationCount: number;
    avgRapidTouchCount: number;
    gestureFrequency: Record<string, number>; // tap: 0.7, swipe: 0.2, etc.
  };

  // ===== TYPING BEHAVIOR AVERAGES =====
  typingProfile: {
    // Timing patterns
    avgDwellTime: number;
    dwellTimeConsistency: number;
    avgFlightTime: number;
    flightTimeConsistency: number;

    // Speed patterns
    avgTypingSpeed: number; // chars per second
    speedVariation: number;
    speedRange: { min: number; max: number };

    // Touch accuracy
    avgTouchAccuracy: number;
    accuracyConsistency: number;

    // Error patterns
    avgErrorRate: number;
    avgCorrectionSpeed: number;
    errorPatternConsistency: number;

    // Mobile-specific usage
    avgAutocorrectUsage: number;
    avgPredictiveTextUsage: number;
    avgLongPauseCount: number;

    // Input type patterns
    inputTypePerformance: {
      password: { speed: number; accuracy: number; errorRate: number };
      email: { speed: number; accuracy: number; errorRate: number };
      amount: { speed: number; accuracy: number; errorRate: number };
      text: { speed: number; accuracy: number; errorRate: number };
    };
  };

  // ===== LOGIN BEHAVIOR AVERAGES =====
  loginProfile: {
    // Timing patterns
    preferredLoginTimes: number[]; // hours of day [9, 14, 20]
    avgSessionDuration: number;
    avgSessionDepth: number;
    avgIdleTime: number;

    // Authentication patterns
    preferredAuthMethod: string;
    avgAuthAttempts: number;
    authSuccessRate: number;
    fallbackUsageRate: number;

    // Biometric patterns
    biometricSuccessRate: number;
    preferredBiometricType: string;

    // Frequency patterns
    avgDailyLogins: number;
    avgWeeklyLogins: number;
    loginConsistency: number; // how regular login patterns are
  };

  // ===== LOCATION BEHAVIOR AVERAGES =====
  locationProfile: {
    // Primary locations
    homeLocation: { city: string; country: string; frequency: number };
    workLocation: { city: string; country: string; frequency: number };
    frequentCities: { city: string; visitCount: number; lastVisit: number }[];

    // Travel patterns
    avgTravelDistance: number;
    maxTravelDistance: number;
    avgLocationAccuracy: number;

    // Risk patterns
    vpnUsageRate: number;
    highRiskLocationRate: number;
    locationSpoofingIncidents: number;
  };

  // ===== NETWORK BEHAVIOR AVERAGES =====
  networkProfile: {
    // Network preferences
    preferredNetworkType: string;
    knownNetworks: { name: string; usageCount: number; lastUsed: number }[];

    // Connection quality
    avgBandwidth: number;
    avgLatency: number;
    avgPacketLoss: number;
    connectionStabilityScore: number;

    // Security patterns
    publicNetworkUsageRate: number;
    vpnUsageRate: number;
    secureConnectionRate: number;
  };

  // ===== DEVICE BEHAVIOR AVERAGES =====
  deviceProfile: {
    // Device usage
    primaryDevices: { deviceId: string; model: string; usageRate: number }[];
    avgBatteryLevel: number;
    preferredOrientation: string;
    avgScreenBrightness: number;

    // App usage patterns
    topApps: { appName: string; avgUsageTime: number }[];

    // Motion patterns (if available)
    avgMotionActivity: number; // 0-1 scale
    motionConsistency: number;

    // Security indicators
    securityIncidents: number;
    rootingDetectionCount: number;
  };

  // ===== OVERALL BEHAVIORAL STATISTICS =====
  overallStats: {
    // Activity patterns
    avgSessionsPerDay: number;
    avgSessionsPerWeek: number;
    peakActivityHours: number[]; // [9, 14, 20]
    peakActivityDays: number[]; // [1, 2, 3] (Mon, Tue, Wed)

    // Consistency scores
    behaviorConsistencyScore: number; // 0-1, how predictable user is
    temporalConsistencyScore: number; // time-based consistency
    spatialConsistencyScore: number; // location-based consistency

    // Change indicators
    behaviorDriftScore: number; // how much behavior has changed over time
    lastSignificantChange: number; // timestamp of last major behavior change
  };

  // ===== RISK ASSESSMENT AVERAGES =====
  riskProfile: {
    baselineRiskScore: number; // 0-1 user's normal risk level
    avgRiskScore: number;
    riskScoreRange: { min: number; max: number };

    // Common risk factors
    frequentRiskFactors: { factor: string; frequency: number }[];
    rareRiskFactors: { factor: string; lastOccurrence: number }[];

    // Anomaly patterns
    avgAnomalyScore: number;
    anomalyFrequency: number; // anomalies per session
    falsePositiveRate: number; // how often user triggers false alarms
  };

  // ===== PROFILE METADATA =====
  profileMetadata: {
    dataQuality: number; // 0-1 overall data quality
    confidenceLevel: number; // 0-1 confidence in profile accuracy
    profileCompleteness: number; // 0-1 how complete the profile is

    // Update tracking
    totalSessions: number;
    lastProfileUpdate: number;
    nextScheduledUpdate: number;

    // Data sources
    touchDataSessions: number;
    typingDataSessions: number;
    locationDataSessions: number;
    networkDataSessions: number;
  };
}
export interface BehavioralSession {
  // Session identification
  sessionId: string;
  userId: string;
  timestamp: number;
  // Aggregated behavioral data

  touchPatterns: TouchGesture[];
  typingPatterns: TypingPattern[];
  motionPattern: MotionPattern[];
  loginBehavior: LoginBehavior;
}

// User Related Field
export interface User {
  id: string;
  mobile: string;
  fullName: string;
  emailId: string;
  age: number;
  gender: "male" | "female";
  profile?: string | null;

  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: "savings" | "current";
  balance: number;

  // Security (Optional - set during onboarding)
  pinHash?: string | null;
  recoveryQuestions: RecoveryQuestion[];
  biometricEnabled: boolean;
  biometricType?: string | null;

  // Metadata
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  isActive: boolean;
  lastLoginAt?: string | null; // ISO timestamp

  // Notification
  fcmToken?: string | null;
}

export interface RecoveryQuestion {
  question: string;
  answerHash: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  createdAt: string; // ISO timestamp
  description: string;
  fromMobile: string;
  fromUserId: string;
  note: string;
  reference: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  toMobile: string;
  toUserId: string;
  type: "credit" | "debit";
  updatedAt: string; // ISO timestamp
}

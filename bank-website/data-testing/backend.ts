// Android events
export interface MobileTouchEvent {
  gestureType: "tap" | "swipe" | "scroll" | "pinch" | "long_press"; // Android native - GestureDetector
  timestamp: number; // Android native - System.currentTimeMillis()

  // Basic coordinates
  startX: number; // Android native - MotionEvent.getX()
  startY: number; // Android native - MotionEvent.getY()
  endX: number; // Android native - MotionEvent.getX()
  endY: number; // Android native - MotionEvent.getY()

  // Essential measurements
  duration: number; // Calculate separately - track ACTION_DOWN to ACTION_UP
  pressure: number; // Android native - MotionEvent.getPressure()
  touchArea: number; // Android native - MotionEvent.getSize() * touch area calculation

  // Simple movement data (only for swipe/scroll)
  distance?: number; // Calculate separately - distance formula between start/end points
  velocity?: number; // Calculate separately - distance/duration
}

export interface MobileKeystroke {
  character: string; // Android native - KeyEvent.getDisplayLabel()
  timestamp: number; // Android native - KeyEvent.getEventTime()
  dwellTime: number; // Calculate separately - ACTION_DOWN to ACTION_UP duration
  flightTime: number; // Calculate separately - time between consecutive keystrokes
  pressure: number; // Android native - MotionEvent.getPressure() (for touch keyboards)
  x: number; // Android native - MotionEvent.getX() (for touch keyboards)
  y: number; // Android native - MotionEvent.getY() (for touch keyboards)
}

export interface MobileMotionEvents {
  timestamp: number; // Android native - System.currentTimeMillis()

  // Sensor readings
  accelerometer: {
    x: number;
    y: number;
    z: number;
  }; // Sensor.TYPE_ACCELEROMETER

  gyroscope: {
    x: number;
    y: number;
    z: number;
  }; // Sensor.TYPE_GYROSCOPE

  magnetometer: {
    x: number;
    y: number;
    z: number;
  }; // Sensor.TYPE_MAGNETIC_FIELD

  // Optional derived motion metrics (for AI analysis)
  motionMagnitude?: number; // √(ax² + ay² + az²)
  rotationRate?: number; // √(gx² + gy² + gz²)
  orientationChange?: number; // Derived from magnetometer and accelerometer (e.g. tilt angle)
}

// Partial androide & backend
export interface MotionPattern {
  //  Android pakets 📲
  samples: MobileMotionEvents[]; // Collected over X seconds
  duration: number; // Total duration of capture in ms
  sampleRateHz: number; // e.g., 50 Hz
}

export interface TouchGesture {
  //  Android pakets 📲
  sessionId: string; // App-generated
  touches: MobileTouchEvent[];

  //Backend Calculation⚙️
  // Touch pressure patterns (2 features)
  avgPressure: number; // Calculate separately - average from touch events
  pressureConsistency: number; // Calculate separately - standard deviation analysis

  // Touch area patterns (2 features)
  avgTouchArea: number; // Calculate separately - average from touch events
  areaConsistency: number; // Calculate separately - standard deviation analysis

  // Gesture timing (2 features)
  avgGestureDuration: number; // Calculate separately - average duration calculations
  timingVariation: number; // Calculate separately - timing pattern analysis

  // Movement patterns (2 features)
  avgSwipeVelocity: number; // Calculate separately - velocity calculations
  swipeAccuracy: number; // Calculate separately - deviation from straight line analysis

  // Behavioral indicators (2 features)
  hesitationCount: number; // Calculate separately - pause detection algorithm
  rapidTouchCount: number; // Calculate separately - timing analysis

  // Session metadata
  totalGestures: number; // Calculate separately - count gestures
  sessionDuration: number; // Calculate separately - session start to end
  riskScore: number; // Calculate separately - ML model output
}

export interface TypingPattern {
  //  Android pakets 📲
  inputType: "password" | "email" | "amount" | "text"; // App context

  // Raw keystrokes (only what we need)
  keystrokes: MobileKeystroke[];

  //Backend Calculation⚙️

  // ===== CORE FEATURES (12 total) =====

  // Timing (4 features)
  avgDwellTime: number; // Calculate separately - average dwell times
  avgFlightTime: number; // Calculate separately - average flight times
  timingConsistency: number; // Calculate separately - standard deviation analysis
  typingSpeed: number; // Calculate separately - characters per time unit

  // Touch behavior (3 features)
  avgPressure: number; // Calculate separately - average pressure values
  pressureVariation: number; // Calculate separately - pressure variance analysis
  touchAccuracy: number; // Calculate separately - distance from key center analysis

  // Error patterns (2 features)
  errorRate: number; // Calculate separately - backspace/correction detection
  correctionSpeed: number; // Calculate separately - error-to-fix timing analysis

  // Mobile-specific (3 features)
  autocorrectUsage: number; // Calculate separately - text change detection
  predictiveTextUsage: number; // Calculate separately - text suggestion acceptance tracking
  longPauseCount: number; // Calculate separately - pause duration analysis

  // Metadata
  duration: number; // Calculate separately - typing session duration
  characterCount: number; // Calculate separately - count characters typed
}

export interface LoginBehavior {
  //  Android pakets 📲
  // Timing patterns
  timestamp: number; // Android native - System.currentTimeMillis() on session app start for new register and after login for existing user

  loginFrequency: number; // Calculate separately - historical login analysis

  // Authentication flow
  loginFlow: "pin" | "biometric" | "otp" | "passwordless"; // App logic
  authAttempts: number; // Calculate separately - count attempts
  authFailures: number; // Calculate separately - count failures
  fallbackUsed: boolean; // App logic - track auth method fallbacks

  // Biometric data
  biometricOutcome: "success" | "failure" | "not_available" | "user_cancelled"; // Android native - BiometricPrompt callbacks
  biometricType: "fingerprint" | "face_id" | "none"; // Android native - BiometricManager.getAvailableAuthenticators()
  hardwareAttestation: boolean; // Android native - Key Attestation API (limited availability)

  //Backend Calculation⚙️

  // Session context
  sessionDuration: number; // Calculate separately - track session lifecycle
  sessionDepth: number; // Calculate separately - count user actions/screens
  sessionIdleTime: number; // Calculate separately - track inactive periods

  timeOfDay: number; // Calculate separately - extract hour from timestamp
  dayOfWeek: number; // Calculate separately - Calendar.get(Calendar.DAY_OF_WEEK)
  dayOfMonth: number; // Calculate separately - Calendar.get(Calendar.DAY_OF_MONTH)
  weekOfYear: number; // Calculate separately - Calendar.get(Calendar.WEEK_OF_YEAR)
}

export interface LocationBehavior {
  //  Android pakets 📲
  // Location data
  latitude: number; // Android native - LocationManager/FusedLocationProvider
  longitude: number; // Android native - LocationManager/FusedLocationProvider
  accuracy: number; // Android native - Location.getAccuracy()
  altitude: number; // Android native - Location.getAltitude()

  //Backend Calculation⚙️
  // Location context
  city: string; // Calculate separately - reverse geocoding (Geocoder API)
  country: string; // Calculate separately - reverse geocoding (Geocoder API)
  timezone: string; // Android native - TimeZone.getDefault()
  isKnownLocation: boolean; // Calculate separately - compare with historical locations

  // Travel patterns
  distanceFromLastLogin: number; // Calculate separately - distance calculation between locations
  velocitySinceLastLogin: number; // Calculate separately - distance/time calculation

  // Risk indicators
  isVpnDetected: boolean; // Calculate separately - network analysis (limited accuracy)
  isTorDetected: boolean; // Calculate separately - network analysis (limited accuracy)
  isHighRiskCountry: boolean; // Calculate separately - country risk database lookup
  locationSpoofingIndicators: number; // Calculate separately - location validation algorithms
}

export interface DeviceBehavior {
  //  Android pakets 📲
  // Device identification
  deviceId: string; // Android native - Settings.Secure.ANDROID_ID (with privacy limitations)
  deviceModel: string; // Android native - Build.MODEL
  osVersion: string; // Android native - Build.VERSION.RELEASE
  appVersion: string; // Android native - PackageManager.getPackageInfo()

  // Device state
  batteryLevel: number; // Android native - BatteryManager.EXTRA_LEVEL
  isCharging: boolean; // Android native - BatteryManager.EXTRA_PLUGGED
  orientation: "portrait" | "landscape"; // Android native - OrientationEventListener
  screenBrightness: number; // Android native - Settings.System.SCREEN_BRIGHTNESS

  // Usage patterns
  appUsagePatterns: Record<string, number>; // Android native - UsageStatsManager (requires permission)

  // Security indicators
  isRooted: boolean; // Calculate separately - root detection algorithms
  isDebuggingEnabled: boolean; // Android native - Settings.Global.ADB_ENABLED (limited access)
  hasUnknownApps: boolean; // Android native - PackageManager analysis
  screenRecordingDetected: boolean; // Not possible to reliably detect on older Android - +15

  accessibilityServices: string[]; // Android - detect enabled services (Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
  activeInputMethod: string; // Android - current keyboard (Settings.Secure.DEFAULT_INPUT_METHOD)
  hasOverlayPermission: boolean; // Android - can draw over other apps (Settings.canDrawOverlays)
}

export interface NetworkBehavior {
  // Android pakets 📲
  networkType: "wifi" | "cellular" | "ethernet" | "unknown"; // Android native - ConnectivityManager
  networkName: string; // Android native - WifiManager.getConnectionInfo() (WiFi only)
  networkOperator: string; // Android native - TelephonyManager.getNetworkOperatorName()

  // Security indicators
  isSecureConnection: boolean; // Android native - WifiInfo.getSSID() + security type

  //   Sim Maneger
  simSerial: string; // ICCID - TelephonyManager.getSimSerialNumber()
  simOperator: string; // Carrier - TelephonyManager.getNetworkOperatorName()
  simCountry: string; // TelephonyManager.getSimCountryIso()
  isRoaming?: boolean; // Optional: TelephonyManager.isNetworkRoaming()
  //   backend calculation
  isKnownNetwork: boolean; // Calculate separately - compare with historical networks
}

// Pure Backend
export interface UserBehavioralProfile {
  userId: string;
  lastUpdated: number;

  // Touch basics
  touchProfile: {
    avgPressure: number;
    pressureConsistency: number;
    avgTouchArea: number;
    gestureFrequency: Record<string, number>;
  };

  // Typing basics
  typingProfile: {
    avgTypingSpeed: number;
    avgDwellTime: number;
    avgFlightTime: number;
    timingConsistency: number;
    avgErrorRate: number;
  };

  // Authentication
  authProfile: {
    avgAuthAttempts: number;
    authSuccessRate: number;
    biometricSuccessRate: number;
  };

  // Location risk indicators
  locationProfile: {
    vpnUsageRate: number;
    highRiskLocationRate: number;
    frequentLocations: string[];
  };

  // Network risk indicators
  networkProfile: {
    frequentNetworks: string[];
  };

  // Overall risk
  riskProfile: {
    NewRegistrationAttempts: number;
    fraudAttempts: number;
    loginFrequency: number;
  };
}

export interface BehavioralSession {
  // Session identification
  sessionId: string; // App-generated
  userId: string; // App-generated
  timestamp: number; // Android native - System.currentTimeMillis()

  // Aggregated behavioral data
  touchPatterns: TouchGesture[]; // Combination of native data + calculations
  typingPatterns: TypingPattern[]; // Combination of native data + calculations
  motionPattern: MotionPattern[]; // Combination of native data + calculations
  loginBehavior: LoginBehavior; // Combination of native data + calculations
}

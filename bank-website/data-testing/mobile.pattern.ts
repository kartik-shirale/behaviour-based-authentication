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

// Module Pattern
export interface MotionPattern {
  samples: MobileMotionEvents[]; // Collected over 5 seconds
  duration: number; // Total duration of capture in ms for 5 sec
  sampleRateHz: number; // e.g., 50 Hz
}

export interface TouchGesture {
  touches: MobileTouchEvent[];
}

export interface TypingPattern {
  inputType: "password" | "email" | "amount" | "text"; // App context
  keystrokes: MobileKeystroke[]; // Raw keystrokes (only what we need)
}

export interface LoginBehavior {
  timestamp: number; // Android native - System.currentTimeMillis() on session app start for new register and after login for existing user
  loginFlow: "pin" | "biometric" | "otp" | "passwordless"; // App logic
  fallbackUsed: boolean; // App logic - track auth method fallbacks
  biometricOutcome: "success" | "failure" | "not_available" | "user_cancelled"; // Android native - BiometricPrompt callbacks
  biometricType: "fingerprint" | "face_id" | "none"; // Android native - BiometricManager.getAvailableAuthenticators()
  hardwareAttestation: boolean; // Android native - Key Attestation API (limited availability)
}

export interface LocationBehavior {
  latitude: number; // Android native - LocationManager/FusedLocationProvider
  longitude: number; // Android native - LocationManager/FusedLocationProvider
  accuracy: number; // Android native - Location.getAccuracy()
  altitude: number; // Android native - Location.getAltitude()
  timezone: string; // Android native - TimeZone.getDefault()
}

export interface DeviceBehavior {
  deviceId: string; // Android native - Settings.Secure.ANDROID_ID (with privacy limitations)
  deviceModel: string; // Android native - Build.MODEL
  osVersion: string; // Android native - Build.VERSION.RELEASE
  appVersion: string; // Android native - PackageManager.getPackageInfo()
  batteryLevel: number; // Android native - BatteryManager.EXTRA_LEVEL
  isCharging: boolean; // Android native - BatteryManager.EXTRA_PLUGGED
  orientation: "portrait" | "landscape"; // Android native - OrientationEventListener
  screenBrightness: number; // Android native - Settings.System.SCREEN_BRIGHTNESS
  appUsagePatterns: Record<string, number>; // Android native - UsageStatsManager (requires permission)
  isDebuggingEnabled: boolean; // Android native - Settings.Global.ADB_ENABLED (limited access)
  hasUnknownApps: boolean; // Android native - PackageManager analysis
  screenRecordingDetected: boolean; // Not possible to reliably detect on older Android - +15
  accessibilityServices: string[]; // Android - detect enabled services (Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
  activeInputMethod: string; // Android - current keyboard (Settings.Secure.DEFAULT_INPUT_METHOD)
  hasOverlayPermission: boolean; // Android - can draw over other apps (Settings.canDrawOverlays)
}

export interface NetworkBehavior {
  networkType: "wifi" | "cellular" | "ethernet" | "unknown"; // Android native - ConnectivityManager
  networkName: string; // Android native - WifiManager.getConnectionInfo() (WiFi only)
  networkOperator: string; // Android native - TelephonyManager.getNetworkOperatorName()
  isSecureConnection: boolean; // Android native - WifiInfo.getSSID() + security type
  simSerial: string; // ICCID - TelephonyManager.getSimSerialNumber()
  simOperator: string; // Carrier - TelephonyManager.getNetworkOperatorName()
  simCountry: string; // TelephonyManager.getSimCountryIso()
  isRoaming?: boolean; // Optional: TelephonyManager.isNetworkRoaming()
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

export interface MobileTouchEvent {
  gestureType: "tap" | "swipe" | "scroll" | "pinch" | "long_press"; // react-native-gesture-handler
  timestamp: number; // JS: Date.now()

  startX: number; // JS: event.nativeEvent.touches[0].pageX or Native: MotionEvent.getX()
  startY: number; // JS: event.nativeEvent.touches[0].pageY or Native: MotionEvent.getY()
  endX: number; // JS: event.nativeEvent.touches[0].pageX or Native: MotionEvent.getX()
  endY: number; // JS: event.nativeEvent.touches[0].pageY or Native: MotionEvent.getY()

  duration: number; // Calculate (endTime - startTime) Native Module with kotlin
  distance?: number; // JS: Calculate Math.sqrt((endX-startX)² + (endY-startY)²)
  velocity?: number; // JS: Calculate distance/duration
  pressure?: number; // JS: event.nativeEvent.force - touch pressure (0.0 to 1.0), undefined if not supported
}

export interface MobileKeystroke {
  character: string; // JS: event.nativeEvent.key
  timestamp: number; // JS: Date.now() or Native: KeyEvent.getEventTime() - timestamp of keydown event
  dwellTime: number; // Native: ACTION_DOWN to ACTION_UP duration in milliseconds
  flightTime: number; // Native/JS: Time between previous keyup and current keydown
  coordinate_x: number; // JS: event.nativeEvent.touches[0].pageX or Native: MotionEvent.getX()
  coordinate_y: number; // JS: event.nativeEvent.touches[0].pageY or Native: MotionEvent.getY()
  pressure?: number; // Native: MotionEvent.getPressure() - touch pressure (0.0 to 1.0)
  inputType?: "password" | "email" | "amount" | "mobile" | "text"; // JS: Input field type context
  actionValue?: 0 | 1; // 0 = keydown, 1 = keyup - for proper event pairing
}

// Legacy interface for backward compatibility - will be deprecated
// export interface LegacyMobileKeystroke {
//   character: string;
//   timestamp: number;
//   dwellTime: number;
//   flightTime: number;
//   x: number;
//   y: number;
//   action: 0 | 1; // 0 = keydown, 1 = keyup
//   inputType?: "password" | "email" | "amount" | "mobile" | "text";
//   pageX?: number;
//   pageY?: number;
//   pressure?: number;
// }

export interface MobileMotionEvents {
  timestamp: number; // JS: Date.now() or Native: System.currentTimeMillis()

  accelerometer: {
    x: number; // JS: expo-sensors Accelerometer.addListener()
    y: number; // JS: expo-sensors Accelerometer.addListener()
    z: number; // JS: expo-sensors Accelerometer.addListener()
  };

  gyroscope: {
    x: number; // JS: expo-sensors Gyroscope.addListener()
    y: number; // JS: expo-sensors Gyroscope.addListener()
    z: number; // JS: expo-sensors Gyroscope.addListener()
  };

  magnetometer: {
    x: number; // JS: expo-sensors Magnetometer.addListener()
    y: number; // JS: expo-sensors Magnetometer.addListener()
    z: number; // JS: expo-sensors Magnetometer.addListener()
  };

  motionMagnitude?: number; // JS: Calculate Math.sqrt(ax² + ay² + az²)
  rotationRate?: number; // JS: Calculate Math.sqrt(gx² + gy² + gz²)
  // orientationChange?: number; // JS: Calculate from magnetometer and accelerometer data
}

export interface MotionPattern {
  samples: MobileMotionEvents[]; // JS: Collect array of MobileMotionEvents over time
  duration: number; // JS: Calculate totalTime (5000ms for 5 seconds)
  sampleRateHz: number; // JS: expo-sensors setUpdateInterval() - e.g., 50Hz
}

export interface TouchGesture {
  touches: MobileTouchEvent[]; // JS: Collect from onTouchStart/onTouchEnd events
}

export interface TypingPattern {
  inputType: "password" | "email" | "amount" | "mobile" | "text"; // JS: App context/state
  keystrokes: MobileKeystroke[]; // JS/Native: Collect from TextInput events or KeyEvent
}

export interface LocationBehavior {
  latitude: number; // JS: expo-location Location.getCurrentPositionAsync()
  longitude: number; // JS: expo-location Location.getCurrentPositionAsync()
  accuracy: number; // JS: expo-location Location.getCurrentPositionAsync().coords.accuracy
  altitude: number; // JS: expo-location Location.getCurrentPositionAsync().coords.altitude
  timezone: string; // JS: Intl.DateTimeFormat().resolvedOptions().timeZone
  permissionDenied?: boolean; // JS: expo-location Location.requestForegroundPermissionsAsync()
  locationError?: string; // JS: Error handling in location requests
}

export interface DeviceBehavior {
  deviceId: string; // JS: expo-device Device.osBuildId
  deviceModel: string; // JS: expo-device Device.modelName
  osVersion: string; // JS: expo-device Device.osVersion
  appVersion: string; // JS: expo-constants Constants.expoConfig?.version
  batteryLevel: number; // JS: expo-battery Battery.getBatteryLevelAsync()
  isCharging: boolean; // JS: expo-battery Battery.getBatteryStateAsync()
  orientation: "portrait" | "landscape" | "unknown"; // JS: expo-screen-orientation ScreenOrientation.getOrientationAsync()
  isRooted: boolean; // JS: expo-device Device.isRootedExperimentalAsync()

  batteryPermissionDenied?: boolean; // JS: Handle expo-battery permission errors
  deviceError?: string; // JS: Error handling in device info collection

  //   Kotlin
  isDebuggingEnabled: boolean; // Native Kotlin: Settings.Global.ADB_ENABLED
  hasOverlayPermission: boolean; // Native Kotlin: Settings.canDrawOverlays()
  hasUnknownApps: boolean; // Native Kotlin: PackageManager analysis for unknown sources
  accessibilityServices: string[]; // Native Kotlin: Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
  activeInputMethod: string; // Native Kotlin: Settings.Secure.DEFAULT_INPUT_METHOD
  appUsagePatterns: Record<string, number>; // Native Kotlin: UsageStatsManager (requires permission)
  hardwareAttestation: boolean; // Native Kotlin: Key Attestation API
}

export interface NetworkBehavior {
  networkType: "wifi" | "cellular" | "ethernet" | "unknown"; // JS: expo-network Network.getNetworkStateAsync()
  networkName: string; // JS: react-native-wifi-reborn WifiManager.getCurrentWifiSSID()
  networkOperator: string; // JS: react-native-carrier-info CarrierInfo.carrierName()
  isSecureConnection: boolean; // Native Kotlin: WifiInfo security type analysis
  simSerial: string; // JS: react-native-sim-data or Native: TelephonyManager.getSimSerialNumber()
  simOperator: string; // JS: react-native-carrier-info or Native: TelephonyManager.getNetworkOperatorName()
  simCountry: string; // JS: react-native-sim-data or Native: TelephonyManager.getSimCountryIso()
  isRoaming?: boolean; // JS: react-native-sim-data or Native: TelephonyManager.isNetworkRoaming()
  phoneStatePermissionDenied?: boolean; // JS: Handle permission request results
  networkError?: string; // JS: Error handling in network requests
  vpnDetected: boolean; // JS: react-native-vpn-detector-latest or Native: ConnectivityManager analysis
}

export interface BehavioralSession {
  sessionId: string;
  userId: string;
  timestamp: number;

  touchPatterns: TouchGesture[];
  typingPatterns: TypingPattern[];
  motionPattern: MotionPattern[];
  locationBehavior: LocationBehavior;
  networkBehavior: NetworkBehavior;
  deviceBehavior: DeviceBehavior;
}

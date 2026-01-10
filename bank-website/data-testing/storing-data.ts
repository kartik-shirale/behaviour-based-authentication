interface FirestoreTimestamp {
  type: "firestore/timestamp/1.0";
  seconds: number;
  nanoseconds: number;
}

interface MotionSample {
  rotationRate: number;
  timestamp: number;
  gyroscope: {
    x: number;
    y: number;
    z: number;
  };
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  motionMagnitude: number;
  magnetometer: {
    x: number;
    y: number;
    z: number;
  };
}

interface MotionPattern {
  sampleRateHz: number;
  duration: number;
  samples: MotionSample[];
}

interface LocationBehavior {
  altitude: number;
  timezone: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  permissionDenied: boolean;
}

interface NetworkBehavior {
  networkType: string;
  vpnDetected: boolean;
  networkOperator: string;
  simSerial: string;
  simCountry: string;
  simOperator: string;
  networkName: string;
  isSecureConnection: boolean;
}

interface TouchEvent {
  startY: number;
  endY: number;
  velocity: number;
  endX: number;
  startX: number;
  timestamp: number;
  duration: number;
  distance: number;
  gestureType: "tap";
}

interface TouchPattern {
  touches: TouchEvent[];
}

interface Keystroke {
  dwellTime: number;
  character: string;
  coordinate_y: number;
  coordinate_x: number;
  timestamp: number;
  flightTime: number;
}

interface TypingPattern {
  keystrokes: Keystroke[];
  inputType: "mobile" | "amount" | "text";
}

interface DeviceFingerprint {
  brand: string;
  androidId: string;
  hardware: string;
  model: string;
  board: string;
  fingerprint: string;
  manufacturer: string;
  device: string;
  product: string;
}

interface DeviceBehavior {
  deviceFingerprint: DeviceFingerprint;
  deviceModel: string;
  isRooted: boolean;
  isCharging: boolean;
  hasUnknownApps: boolean;
  orientation: "portrait" | "landscape";
  hardwareAttestation: boolean;
  osVersion: string;
  isDebuggingEnabled: boolean;
  appUsagePatterns: Record<string, any>; // Empty object in the data
  deviceId: string;
  batteryLevel: number;
  appVersion: string;
  activeInputMethod: string;
  accessibilityServices: any[];
  hasOverlayPermission: boolean;
}

interface BehaviorData {
  id: string;
  updatedAt: FirestoreTimestamp;
  motionPattern: MotionPattern[];
  locationBehavior: LocationBehavior;
  networkBehavior: NetworkBehavior;
  sessionId: string;
  createdAt: FirestoreTimestamp;
  userId: string;
  touchPatterns: TouchPattern[];
  timestamp: number;
  typingPatterns: TypingPattern[];
  deviceBehavior: DeviceBehavior;
}

interface LocationPattern {
  altitude: number;
  timezone: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  vpnDetected: boolean;
}

interface BehaviourProfile {
  userId: string;
  DeviceFingerprint: DeviceFingerprint;
  simOperator: string;
  locationPatterns: LocationPattern[];
}

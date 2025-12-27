export interface UserProfile {
  userId: string;

  typingProfile: {
    WPM: number;
    Dwell_Time_Avg: number;
    Flight_Time_Avg: number;
    Error_Rate: number;
    Average_Touch_Pressure?: number;
  };

  touchProfile: {
    Average_Touch_Pressure: number;
    Average_Touch_Distance: number;
    Average_Touch_Angle: number;
    Average_Gesture_Speed: number;
    Average_Swipe_Distance: number;
    Average_Tap_Accuracy: number;
    Average_Session_Gestures: number;
    Average_Session_Touches: number;
  };

  motionProfile: {
    avgMotionMagnitude: number;
    avgRotationRate: number;
    peakMotion: number;

    // Stability analysis
    stabilityScore: number;
    motionVariance: number;

    // Orientation averages
    avgTiltX: number;
    avgTiltY: number;
    avgTiltZ: number;
  };

  locationProfile: {
    visitedCities: {
      city: string;
      count: number;
    }[];
  };

  deviceProfile: {
    deviceId: string; // JS: expo-device Device.osBuildId
    deviceModel: string; // JS: expo-device Device.modelName
    osVersion: string; // JS: expo-device Device.osVersion
    appVersion: string; // JS: expo-constants Constants.expoConfig?.version
    appUsagePatterns: Record<string, number>; // Native Kotlin: UsageStatsManager (requires permission)
    isRooted: boolean; // JS: expo-device Device.isRootedExperimentalAsync()
  };

  networkProfile: {
    vpnUsesRate: number;
    wifiUsesRate: number;
    mobileDataUsesRate: number;
    simOperator: string;
  };
}

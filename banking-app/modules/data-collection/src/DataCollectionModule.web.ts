import { NativeModule, registerWebModule } from "expo";

import { ChangeEventPayload } from "./DataCollection.types";

type DataCollectionModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

class DataCollectionModule extends NativeModule<DataCollectionModuleEvents> {
  PI = Math.PI;

  async setValueAsync(value: string): Promise<void> {
    this.emit("onChange", { value });
  }

  hello() {
    return "Hello world! 👋";
  }

  // Data collection methods for web (stub implementations)
  async checkPermissions(): Promise<Record<string, boolean>> {
    return {
      touchEvents: true,
      keystrokes: true,
      deviceInfo: true,
    };
  }

  async collectTouchEventNative(touchData: {
    x: number;
    y: number;
    pressure: number;
    size: number;
    action: number;
  }): Promise<{
    timestamp: number;
    x: number;
    y: number;
    pressure: number;
    size: number;
    action: number;
  }> {
    return {
      timestamp: Date.now(),
      ...touchData,
    };
  }

  async collectKeystrokeNative(keystrokeData: {
    character: string;
    timestamp: number;
    dwellTime: number;
    flightTime: number;
    coordinate_x: number;
    coordinate_y: number;
    pressure?: number;
  }): Promise<{
    character: string;
    timestamp: number;
    dwellTime: number;
    flightTime: number;
    coordinate_x: number;
    coordinate_y: number;
    pressure?: number;
  }> {
    // Web fallback - return the data as-is since we don't have native enhancements
    return {
      ...keystrokeData,
      timestamp: keystrokeData.timestamp || Date.now(),
    };
  }

  async getSessionAnalytics(): Promise<{
    sessionDuration: number;
    touchEvents: number;
    keystrokeEvents: number;
    sessionStartTime: number;
    lastActivity: number;
  }> {
    const now = Date.now();
    return {
      sessionDuration: 0,
      touchEvents: 0,
      keystrokeEvents: 0,
      sessionStartTime: now,
      lastActivity: now,
    };
  }

  async getDeviceBehavior(): Promise<{
    isDebuggingEnabled: boolean;
    hasOverlayPermission: boolean;
    hasUnknownApps: boolean;
    accessibilityServices: string[];
    activeInputMethod: string;
    appUsagePatterns: Record<string, number>;
    hardwareAttestation: boolean;
    deviceFingerprint: Record<string, string>;
  }> {
    return {
      isDebuggingEnabled: false,
      hasOverlayPermission: false,
      hasUnknownApps: false,
      accessibilityServices: [],
      activeInputMethod: "default",
      appUsagePatterns: {},
      hardwareAttestation: true,
      deviceFingerprint: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
    };
  }

  async resetSession(): Promise<void> {
    // Web stub - no action needed
    console.log("Session reset (web stub)");
  }
}

export default registerWebModule(DataCollectionModule, "DataCollectionModule");

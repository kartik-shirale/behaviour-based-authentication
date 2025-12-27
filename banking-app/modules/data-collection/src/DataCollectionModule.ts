import { NativeModule, requireNativeModule } from "expo";

import { DataCollectionModuleEvents } from "./DataCollection.types";

declare class DataCollectionModule extends NativeModule<DataCollectionModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;

  // Data collection methods
  checkPermissions(): Promise<Record<string, boolean>>;
  collectTouchEventNative(touchData: {
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
  }>;
  collectKeystrokeNative(keystrokeData: {
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
  }>;
  getSessionAnalytics(): Promise<{
    sessionDuration: number;
    touchEvents: number;
    keystrokeEvents: number;
    sessionStartTime: number;
    lastActivity: number;
  }>;
  getDeviceBehavior(): Promise<{
    isDebuggingEnabled: boolean;
    hasOverlayPermission: boolean;
    hasUnknownApps: boolean;
    accessibilityServices: string[];
    activeInputMethod: string;
    appUsagePatterns: Record<string, number>;
    hardwareAttestation: boolean;
    deviceFingerprint: Record<string, string>;
  }>;
  getSimCountry(): Promise<string>;
  resetSession(): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<DataCollectionModule>("DataCollection");

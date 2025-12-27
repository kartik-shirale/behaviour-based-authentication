import DataCollection from "../modules/data-collection";

export interface SessionAnalytics {
  sessionDuration: number;
  touchEvents: number;
  keystrokeEvents: number;
  sessionStartTime: number;
  lastActivity: number;
  // Enhanced analytics data
  gestureTypeCounts?: Record<string, number>;
  avgTouchDuration?: number;
  avgTouchVelocity?: number;
  avgTouchDistance?: number;
  avgDwellTime?: number;
  avgFlightTime?: number;
  keystrokeRate?: number;
  // Actual event data arrays
  touchEventData?: TouchEventData[];
  keystrokeEventData?: KeystrokeEventData[];
}

export interface DeviceBehavior {
  isDebuggingEnabled: boolean;
  hasOverlayPermission: boolean;
  hasUnknownApps: boolean;
  accessibilityServices: string[];
  activeInputMethod: string;
  appUsagePatterns: Record<string, number>;
  hardwareAttestation: boolean;
  deviceFingerprint: Record<string, string>;
}

export interface TouchEventData {
  timestamp: number;
  gestureType: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  distance?: number;
  velocity?: number;
  pressure?: number;
  size?: number;
  // Multi-touch support
  startX2?: number;
  startY2?: number;
  endX2?: number;
  endY2?: number;
}

export interface KeystrokeEventData {
  timestamp: number;
  character: string;
  dwellTime: number;
  flightTime: number;
  coordinate_x: number;
  coordinate_y: number;
  pressure?: number;
  // Enhanced native capture fields
  isHardwareTiming?: boolean;
  deviceId?: number;
  scanCode?: number;
  keyCode?: number;
  keyDownTime?: number;
  keyUpTime?: number;
  dataQuality?: "hardware" | "javascript" | "synthetic";
}

export interface NativeKeystrokeCapture {
  isActive: boolean;
  captureMethod: "hardware" | "accessibility" | "overlay";
  eventsCapture: number;
  startTime: number;
}

export interface HardwareKeyEventData {
  action: number; // KeyEvent.ACTION_DOWN or KeyEvent.ACTION_UP
  keyCode: number;
  eventTime: number;
  downTime: number;
  deviceId: number;
  scanCode: number;
  unicodeChar: number;
}

export interface RealTouchEventData {
  action: number; // MotionEvent actions
  x: number;
  y: number;
  pressure: number;
  eventTime: number;
}

export interface NativeTouchEventData {
  pointerId: number;
  action: number;
  x: number;
  y: number;
  rawX: number;
  rawY: number;
  pressure: number;
  size: number;
  touchMajor: number;
  touchMinor: number;
  orientation: number;
  timestamp: number;
  eventTime: number;
  downTime: number;
  deviceId: number;
  source: number;
  toolType: number;
  isHardwareEvent: boolean;
}

export interface NativeTouchCapture {
  isActive: boolean;
  captureMethod: "hardware_overlay" | "accessibility" | "javascript";
  eventsCapture: number;
  startTime: number;
}

export class NativeDataCollectionService {
  private isInitialized = false;
  private sessionActive = false;
  private sessionStartTime = Date.now();
  private activeKeyPresses: Map<
    string,
    { timestamp: number; x: number; y: number; pressure?: number }
  > = new Map();
  private lastKeystrokeTimestamp = 0;

  // Native keystroke capture state
  private nativeKeystrokeCapture: NativeKeystrokeCapture = {
    isActive: false,
    captureMethod: "hardware",
    eventsCapture: 0,
    startTime: 0,
  };
  private nativeKeystrokeData: KeystrokeEventData[] = [];

  // Native touch capture state
  private nativeTouchCapture: NativeTouchCapture = {
    isActive: false,
    captureMethod: "hardware_overlay",
    eventsCapture: 0,
    startTime: 0,
  };
  private nativeTouchData: NativeTouchEventData[] = [];

  /**
   * Initialize the native data collection service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if the native module is available
      if (!DataCollection) {
        console.warn(
          "Native DataCollection module not available, using web fallback"
        );
        this.isInitialized = true;
        this.sessionActive = true;
        return true;
      }

      // Check permissions
      try {
        const permissions = await DataCollection.checkPermissions();
        console.log("Data collection permissions:", permissions);
      } catch (permError) {
        console.warn(
          "Permission check failed, continuing with web fallback:",
          permError
        );
      }

      // Reset any existing session
      try {
        await this.resetSession();
      } catch (resetError) {
        console.warn("Session reset failed, continuing:", resetError);
      }

      this.isInitialized = true;
      this.sessionActive = true;

      console.log("Native data collection service initialized successfully");
      return true;
    } catch (error) {
      console.error(
        "Failed to initialize native data collection service:",
        error
      );
      // Fallback to web mode
      this.isInitialized = true;
      this.sessionActive = true;
      return true;
    }
  }

  /**
   * Track keydown event - stores coordinates and timestamp
   */
  async trackKeydown(keydownData: {
    character: string;
    timestamp: number;
    x: number;
    y: number;
    pressure?: number;
  }): Promise<boolean> {
    if (!this.isInitialized || !this.sessionActive) {
      console.warn(
        "Data collection service not initialized or session inactive"
      );
      return false;
    }

    try {
      // Store keydown data for dwell time calculation
      this.activeKeyPresses.set(keydownData.character, {
        timestamp: keydownData.timestamp,
        x: keydownData.x,
        y: keydownData.y,
        pressure: keydownData.pressure,
      });

      // Call native module if available
      if (DataCollection && DataCollection.trackKeydown) {
        await DataCollection.trackKeydown(keydownData);
      }

      return true;
    } catch (error) {
      console.warn("Keydown tracking failed:", error);
      return false;
    }
  }

  /**
   * Collect touch event using native Kotlin module
   */
  async collectTouchEvent(touchData: {
    x: number;
    y: number;
    pressure: number;
    size: number;
    action: number;
  }): Promise<TouchEventData | null> {
    if (!this.isInitialized || !this.sessionActive) {
      console.warn(
        "Data collection service not initialized or session inactive"
      );
      return null;
    }

    try {
      if (DataCollection && DataCollection.collectTouchEventNative) {
        const result = await DataCollection.collectTouchEventNative(touchData);
        // Map native result to TouchEventData interface
        const nativeResult = result as any;
        return {
          timestamp: nativeResult.timestamp || Date.now(),
          gestureType: nativeResult.gestureType || "tap",
          startX: nativeResult.startX || nativeResult.x || touchData.x,
          startY: nativeResult.startY || nativeResult.y || touchData.y,
          endX: nativeResult.endX || nativeResult.x || touchData.x,
          endY: nativeResult.endY || nativeResult.y || touchData.y,
          duration: nativeResult.duration || 0,
          distance: nativeResult.distance,
          velocity: nativeResult.velocity,
          pressure: nativeResult.pressure || touchData.pressure,
          size: nativeResult.size || touchData.size,
        } as TouchEventData;
      } else {
        // Web fallback
        return {
          timestamp: Date.now(),
          gestureType: "tap",
          startX: touchData.x,
          startY: touchData.y,
          endX: touchData.x,
          endY: touchData.y,
          duration: 0,
          pressure: touchData.pressure,
          size: touchData.size,
        };
      }
    } catch (error) {
      console.warn("Native touch collection failed, using fallback:", error);
      // Web fallback
      return {
        timestamp: Date.now(),
        gestureType: "tap",
        startX: touchData.x,
        startY: touchData.y,
        endX: touchData.x,
        endY: touchData.y,
        duration: 0,
        pressure: touchData.pressure,
        size: touchData.size,
      };
    }
  }

  /**
   * Collect keystroke event using native Kotlin module with simplified structure
   */
  /**
   * Collect keystroke on keyup event - calculates dwell time from stored keydown
   */
  async collectKeystroke(keystrokeData: {
    character: string;
    timestamp: number; // keyup timestamp
  }): Promise<KeystrokeEventData | null> {
    if (!this.isInitialized || !this.sessionActive) {
      console.warn(
        "Data collection service not initialized or session inactive"
      );
      return null;
    }

    try {
      // Get stored keydown data
      const keydownData = this.activeKeyPresses.get(keystrokeData.character);
      if (!keydownData) {
        console.warn(
          `No keydown data found for character: ${keystrokeData.character}`
        );
        return null;
      }

      // Calculate dwell time (keyup - keydown)
      const dwellTime = keystrokeData.timestamp - keydownData.timestamp;

      // Calculate flight time (time between this keydown and previous keyup)
      const flightTime =
        this.lastKeystrokeTimestamp > 0
          ? keydownData.timestamp - this.lastKeystrokeTimestamp
          : 0;

      // Update last keystroke timestamp
      this.lastKeystrokeTimestamp = keystrokeData.timestamp;

      // Clean up stored keydown data
      this.activeKeyPresses.delete(keystrokeData.character);

      const processedKeystrokeData = {
        character: keystrokeData.character,
        timestamp: keystrokeData.timestamp,
        dwellTime,
        flightTime,
        coordinate_x: keydownData.x,
        coordinate_y: keydownData.y,
        pressure: keydownData.pressure,
      };

      if (DataCollection && DataCollection.processKeystroke) {
        const result = await DataCollection.processKeystroke(
          processedKeystrokeData
        );
        return result as KeystrokeEventData;
      } else {
        // Web fallback - return calculated structure
        return {
          timestamp: keystrokeData.timestamp,
          character: keystrokeData.character,
          dwellTime,
          flightTime,
          coordinate_x: keydownData.x,
          coordinate_y: keydownData.y,
          pressure: keydownData.pressure,
        };
      }
    } catch (error) {
      console.warn(
        "Native keystroke collection failed, using fallback:",
        error
      );
      return null;
    }
  }

  /**
   * Get comprehensive session analytics
   */
  async getSessionAnalytics(): Promise<SessionAnalytics | null> {
    if (!this.isInitialized) {
      console.warn("Data collection service not initialized");
      return null;
    }

    try {
      if (DataCollection && DataCollection.getSessionAnalytics) {
        const analytics = await DataCollection.getSessionAnalytics();
        return analytics as SessionAnalytics;
      } else {
        // Web fallback
        const now = Date.now();
        return {
          sessionDuration: now - this.sessionStartTime,
          touchEvents: 0,
          keystrokeEvents: 0,
          sessionStartTime: this.sessionStartTime,
          lastActivity: now,
        };
      }
    } catch (error) {
      console.warn("Native session analytics failed, using fallback:", error);
      // Web fallback
      const now = Date.now();
      return {
        sessionDuration: now - this.sessionStartTime,
        touchEvents: 0,
        keystrokeEvents: 0,
        sessionStartTime: this.sessionStartTime,
        lastActivity: now,
      };
    }
  }

  /**
   * Get device behavior data
   */
  async getDeviceBehavior(): Promise<DeviceBehavior | null> {
    if (!this.isInitialized) {
      console.warn("Data collection service not initialized");
      return null;
    }

    try {
      if (DataCollection && DataCollection.getDeviceBehavior) {
        const deviceBehavior = await DataCollection.getDeviceBehavior();
        return deviceBehavior as DeviceBehavior;
      } else {
        // Web fallback
        return {
          isDebuggingEnabled: false,
          hasOverlayPermission: false,
          hasUnknownApps: false,
          accessibilityServices: [],
          activeInputMethod: "default",
          appUsagePatterns: {},
          hardwareAttestation: true,
          deviceFingerprint: {
            userAgent:
              typeof navigator !== "undefined"
                ? navigator.userAgent
                : "unknown",
            platform:
              typeof navigator !== "undefined" ? navigator.platform : "web",
            language:
              typeof navigator !== "undefined" ? navigator.language : "en",
          },
        };
      }
    } catch (error) {
      console.warn("Native device behavior failed, using fallback:", error);
      // Web fallback
      return {
        isDebuggingEnabled: false,
        hasOverlayPermission: false,
        hasUnknownApps: false,
        accessibilityServices: [],
        activeInputMethod: "default",
        appUsagePatterns: {},
        hardwareAttestation: true,
        deviceFingerprint: {
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          platform:
            typeof navigator !== "undefined" ? navigator.platform : "web",
          language:
            typeof navigator !== "undefined" ? navigator.language : "en",
        },
      };
    }
  }

  /**
   * Start Native Keystroke Capture with Hardware-Level Timing
   */
  async startNativeKeystrokeCapture(): Promise<NativeKeystrokeCapture> {
    try {
      if (!this.isInitialized) {
        throw new Error("Service not initialized");
      }

      if (DataCollection) {
        // Initialize direct keystroke capture if available
        if (DataCollection.initializeDirectKeystrokeCapture) {
          const initResult =
            await DataCollection.initializeDirectKeystrokeCapture();
          console.log("Direct keystroke capture initialized:", initResult);
        }

        // Start native keystroke capture
        if (DataCollection.startNativeKeystrokeCapture) {
          const result = await DataCollection.startNativeKeystrokeCapture();

          this.nativeKeystrokeCapture = {
            isActive: true,
            captureMethod: result.captureMethod || "hardware",
            eventsCapture: 0,
            startTime: Date.now(),
          };

          this.nativeKeystrokeData = [];

          console.log("Native keystroke capture started:", result);
          return this.nativeKeystrokeCapture;
        } else {
          throw new Error("Native keystroke capture not available");
        }
      } else {
        throw new Error("DataCollection module not available");
      }
    } catch (error) {
      console.error("Failed to start native keystroke capture:", error);
      throw error;
    }
  }

  /**
   * Stop Native Keystroke Capture and Get Results
   */
  async stopNativeKeystrokeCapture(): Promise<{
    success: boolean;
    eventsCapture: number;
    captureMethod: string;
    message: string;
  }> {
    try {
      if (!this.nativeKeystrokeCapture.isActive) {
        return {
          success: false,
          eventsCapture: 0,
          captureMethod: "none",
          message: "Native capture not active",
        };
      }

      if (DataCollection && DataCollection.stopNativeKeystrokeCapture) {
        const result = await DataCollection.stopNativeKeystrokeCapture();

        this.nativeKeystrokeCapture.isActive = false;

        console.log("Native keystroke capture stopped:", result);
        return {
          success: true,
          eventsCapture: this.nativeKeystrokeCapture.eventsCapture,
          captureMethod: this.nativeKeystrokeCapture.captureMethod,
          message: result.message || "Capture stopped successfully",
        };
      } else {
        throw new Error("Native keystroke capture not available");
      }
    } catch (error) {
      console.error("Failed to stop native keystroke capture:", error);
      this.nativeKeystrokeCapture.isActive = false;
      throw error;
    }
  }

  /**
   * Process Hardware Key Event from Native Side
   * Note: Hardware key event processing disabled - focusing on software keyboard events only
   */
  async processHardwareKeyEvent(eventData: HardwareKeyEventData): Promise<{
    processed: boolean;
    action: number;
    keyCode: number;
    timestamp: number;
    isHardwareEvent: boolean;
  }> {
    // Hardware key event processing disabled - return default response
    console.log(
      "Hardware key event processing disabled for software keyboard focus"
    );
    return {
      processed: false,
      action: eventData.action,
      keyCode: eventData.keyCode,
      timestamp: eventData.eventTime,
      isHardwareEvent: false,
    };
  }

  /**
   * Process Real Touch Event from Native Side
   */
  async processRealTouchEvent(touchData: RealTouchEventData): Promise<{
    processed: boolean;
    estimatedKeyCode: number;
    coordinates: { x: number; y: number };
    timestamp: number;
  }> {
    try {
      if (!this.nativeKeystrokeCapture.isActive) {
        return {
          processed: false,
          estimatedKeyCode: -1,
          coordinates: { x: touchData.x, y: touchData.y },
          timestamp: touchData.eventTime,
        };
      }

      if (DataCollection && DataCollection.processRealTouchEvent) {
        const result = await DataCollection.processRealTouchEvent(touchData);

        console.log("Real touch event processed:", result);
        return result;
      } else {
        throw new Error("Real touch event processing not available");
      }
    } catch (error) {
      console.error("Failed to process real touch event:", error);
      throw error;
    }
  }

  /**
   * Get Native Keystroke Data with Hardware Timing
   */
  async getNativeKeystrokeData(): Promise<{
    keystrokeEvents: KeystrokeEventData[];
    captureInfo: {
      isHardwareTiming: boolean;
      captureMethod: string;
      dataQuality: string;
      eventsCount: number;
      sessionDuration: number;
    };
  }> {
    try {
      if (DataCollection && DataCollection.getNativeKeystrokeData) {
        const result = await DataCollection.getNativeKeystrokeData();

        // Store the native keystroke data locally
        this.nativeKeystrokeData = result.keystrokeEvents || [];

        console.log("Retrieved native keystroke data:", {
          eventsCount: this.nativeKeystrokeData.length,
          captureInfo: result.captureInfo,
        });

        return {
          keystrokeEvents: this.nativeKeystrokeData,
          captureInfo: {
            isHardwareTiming: result.captureInfo?.isHardwareTiming || false,
            captureMethod: result.captureInfo?.captureMethod || "unknown",
            dataQuality: result.captureInfo?.dataQuality || "synthetic",
            eventsCount: this.nativeKeystrokeData.length,
            sessionDuration: this.nativeKeystrokeCapture.isActive
              ? Date.now() - this.nativeKeystrokeCapture.startTime
              : 0,
          },
        };
      } else {
        // Return local data if native module not available
        return {
          keystrokeEvents: this.nativeKeystrokeData,
          captureInfo: {
            isHardwareTiming: false,
            captureMethod: "javascript",
            dataQuality: "synthetic",
            eventsCount: this.nativeKeystrokeData.length,
            sessionDuration: this.nativeKeystrokeCapture.isActive
              ? Date.now() - this.nativeKeystrokeCapture.startTime
              : 0,
          },
        };
      }
    } catch (error) {
      console.error("Failed to get native keystroke data:", error);
      throw error;
    }
  }

  /**
   * Get Native Keystroke Capture Status
   */
  getNativeKeystrokeCaptureStatus(): NativeKeystrokeCapture {
    return { ...this.nativeKeystrokeCapture };
  }

  /**
   * Start Native Touch Capture (Hardware-level)
   */
  async startNativeTouchCapture(): Promise<NativeTouchCapture> {
    try {
      if (!this.isInitialized) {
        throw new Error("Service not initialized");
      }

      if (DataCollection && DataCollection.startNativeTouchCapture) {
        const result = await DataCollection.startNativeTouchCapture();

        this.nativeTouchCapture = {
          isActive: true,
          captureMethod: "hardware_overlay",
          eventsCapture: 0,
          startTime: Date.now(),
        };

        console.log("Native touch capture started:", result);
        return { ...this.nativeTouchCapture };
      } else {
        throw new Error("Native touch capture not available");
      }
    } catch (error) {
      console.error("Failed to start native touch capture:", error);
      throw error;
    }
  }

  /**
   * Stop Native Touch Capture
   */
  async stopNativeTouchCapture(): Promise<{
    success: boolean;
    eventsCapture: number;
    captureMethod: string;
    message: string;
  }> {
    try {
      if (!this.nativeTouchCapture.isActive) {
        return {
          success: false,
          eventsCapture: 0,
          captureMethod: "none",
          message: "Native touch capture was not active",
        };
      }

      if (DataCollection && DataCollection.stopNativeTouchCapture) {
        const result = await DataCollection.stopNativeTouchCapture();

        this.nativeTouchCapture.isActive = false;
        const eventsCount = this.nativeTouchData.length;

        console.log("Native touch capture stopped:", result);

        return {
          success: true,
          eventsCapture: eventsCount,
          captureMethod: "hardware_overlay",
          message: `Captured ${eventsCount} native touch events`,
        };
      } else {
        this.nativeTouchCapture.isActive = false;
        return {
          success: false,
          eventsCapture: 0,
          captureMethod: "unavailable",
          message: "Native module not available",
        };
      }
    } catch (error) {
      console.error("Failed to stop native touch capture:", error);
      this.nativeTouchCapture.isActive = false;
      throw error;
    }
  }

  /**
   * Get Native Touch Data
   */
  async getNativeTouchData(): Promise<{
    touchEvents: NativeTouchEventData[];
    captureInfo: {
      isHardwareEvent: boolean;
      captureMethod: string;
      dataQuality: string;
      eventsCount: number;
      sessionDuration: number;
    };
  }> {
    try {
      if (DataCollection && DataCollection.getNativeTouchData) {
        const result = await DataCollection.getNativeTouchData();

        // Store the native touch data locally
        this.nativeTouchData = result.touchEvents || [];

        console.log("Retrieved native touch data:", {
          eventsCount: this.nativeTouchData.length,
          captureInfo: result.captureInfo,
        });

        return {
          touchEvents: this.nativeTouchData,
          captureInfo: {
            isHardwareEvent: result.captureInfo?.isHardwareEvent || true,
            captureMethod:
              result.captureInfo?.captureMethod || "hardware_overlay",
            dataQuality: result.captureInfo?.dataQuality || "hardware",
            eventsCount: this.nativeTouchData.length,
            sessionDuration: this.nativeTouchCapture.isActive
              ? Date.now() - this.nativeTouchCapture.startTime
              : 0,
          },
        };
      } else {
        // Return local data if native module not available
        return {
          touchEvents: this.nativeTouchData,
          captureInfo: {
            isHardwareEvent: false,
            captureMethod: "javascript",
            dataQuality: "synthetic",
            eventsCount: this.nativeTouchData.length,
            sessionDuration: this.nativeTouchCapture.isActive
              ? Date.now() - this.nativeTouchCapture.startTime
              : 0,
          },
        };
      }
    } catch (error) {
      console.error("Failed to get native touch data:", error);
      throw error;
    }
  }

  /**
   * Get Native Touch Capture Status
   */
  getNativeTouchCaptureStatus(): NativeTouchCapture {
    return { ...this.nativeTouchCapture };
  }

  /**
   * Reset the current session
   */
  async resetSession(): Promise<boolean> {
    try {
      if (DataCollection && DataCollection.resetSession) {
        await DataCollection.resetSession();
      }

      // Reset local session data
      this.sessionStartTime = Date.now();
      this.sessionActive = true;

      // Clear legacy keystroke tracking data
      this.activeKeyPresses.clear();
      this.lastKeystrokeTimestamp = 0;

      // Reset native keystroke capture data
      this.nativeKeystrokeCapture = {
        isActive: false,
        captureMethod: "hardware",
        eventsCapture: 0,
        startTime: 0,
      };
      this.nativeKeystrokeData = [];

      // Reset native touch capture data
      this.nativeTouchCapture = {
        isActive: false,
        captureMethod: "hardware_overlay",
        eventsCapture: 0,
        startTime: 0,
      };
      this.nativeTouchData = [];

      console.log(
        "Session reset successfully (both legacy and native data cleared)"
      );
      return true;
    } catch (error) {
      console.warn("Native session reset failed, using fallback:", error);

      // Fallback: just reset local data
      this.sessionStartTime = Date.now();
      this.sessionActive = true;

      // Clear legacy keystroke tracking data
      this.activeKeyPresses.clear();
      this.lastKeystrokeTimestamp = 0;

      // Reset native keystroke capture data
      this.nativeKeystrokeCapture = {
        isActive: false,
        captureMethod: "hardware",
        eventsCapture: 0,
        startTime: 0,
      };
      this.nativeKeystrokeData = [];

      // Reset native touch capture data
      this.nativeTouchCapture = {
        isActive: false,
        captureMethod: "hardware_overlay",
        eventsCapture: 0,
        startTime: 0,
      };
      this.nativeTouchData = [];

      console.log(
        "Session reset successfully (fallback - both legacy and native data cleared)"
      );
      return true;
    }
  }

  /**
   * End the current session
   */
  async endSession(): Promise<SessionAnalytics | null> {
    if (!this.sessionActive) {
      console.warn("No active session to end");
      return null;
    }

    try {
      const finalAnalytics = await this.getSessionAnalytics();
      this.sessionActive = false;
      console.log("Session ended successfully");
      return finalAnalytics;
    } catch (error) {
      console.error("Failed to end session:", error);
      return null;
    }
  }

  /**
   * Export all collected data for analysis
   */
  async exportData(): Promise<{
    sessionAnalytics: SessionAnalytics | null;
    deviceBehavior: DeviceBehavior | null;
    exportTimestamp: number;
  }> {
    const sessionAnalytics = await this.getSessionAnalytics();
    const deviceBehavior = await this.getDeviceBehavior();

    return {
      sessionAnalytics,
      deviceBehavior,
      exportTimestamp: Date.now(),
    };
  }

  /**
   * Check if the service is properly initialized
   */
  isServiceReady(): boolean {
    return this.isInitialized && this.sessionActive;
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    sessionActive: boolean;
    nativeModuleAvailable: boolean;
  } {
    return {
      initialized: this.isInitialized,
      sessionActive: this.sessionActive,
      nativeModuleAvailable: !!DataCollection,
    };
  }
}

// Export singleton instance
const nativeDataCollectionService = new NativeDataCollectionService();
export { nativeDataCollectionService };
export default nativeDataCollectionService;

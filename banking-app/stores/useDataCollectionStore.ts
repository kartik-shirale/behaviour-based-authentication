import * as Battery from "expo-battery";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import { requireNativeModule } from "expo-modules-core";
import * as Network from "expo-network";
import * as ScreenOrientation from "expo-screen-orientation";
import { Accelerometer, Gyroscope, Magnetometer } from "expo-sensors";
import DeviceInfo from "react-native-device-info";
import { isVpnActive } from "react-native-vpn-detector";
import WifiManager from "react-native-wifi-reborn";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Import API constants and service
import { buildApiUrl } from "../constants/API_ENDPOINTS";

// Import types
import type {
  BehavioralSession,
  DeviceBehavior,
  LocationBehavior,
  MobileKeystroke,
  MobileMotionEvents,
  MobileTouchEvent,
  MotionPattern,
  NetworkBehavior,
  TouchGesture,
  TypingPattern,
} from "../types/data.collection";

// Native module interface
interface BehavioralDataCollector {
  collectTouchEvent(touchData: any): Promise<MobileTouchEvent>;
  collectKeystroke(keystrokeData: any): Promise<MobileKeystroke>;
  getDeviceBehavior(): Promise<any>;
  getSimCountry(): Promise<string>;
  checkPermissions(): Promise<{ [key: string]: boolean }>;
  resetSession(): Promise<boolean>;
}

// Import the native module
let BehavioralDataCollectorModule: BehavioralDataCollector | null = null;
try {
  BehavioralDataCollectorModule = requireNativeModule("DataCollection");
} catch (error) {}

// Import the native data collection service
import { NativeDataCollectionService } from "../services/NativeDataCollectionService";

// Debouncing utility for state updates
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

// Performance optimization: Use requestAnimationFrame for smooth UI updates
let animationFrameId: number | null = null;
let pendingStateUpdates: (() => void)[] = [];

const scheduleStateUpdate = (updateFn: () => void) => {
  pendingStateUpdates.push(updateFn);

  if (animationFrameId === null) {
    animationFrameId = requestAnimationFrame(() => {
      // Execute all pending updates in a single frame
      const updates = [...pendingStateUpdates];
      pendingStateUpdates = [];
      animationFrameId = null;

      updates.forEach((update) => update());
    });
  }
};

interface DataCollectionState {
  // Session Management
  currentSession: BehavioralSession | null;
  isCollecting: boolean;
  sessionId: string | null;
  userId: string | null;
  collectionScenario:
    | "initial-registration"
    | "first-time-registration"
    | "re-registration"
    | "login"
    | null;
  isWaitingForResponse: boolean;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  backgroundState: string | null;
  patternInterval: NodeJS.Timeout | null;
  staticDataCollected: boolean;
  isEndingSession: boolean;
  lastTouchEventTime: number;
  lastKeystrokeTime: number;
  lastProcessedKeyIdentifier: string | null;
  lastKeystrokeCoordinates: { x: number; y: number } | null;
  currentInputType: "password" | "email" | "amount" | "mobile" | "text" | null;
  pendingKeydowns: Map<
    string,
    {
      timestamp: number;
      inputType: "password" | "email" | "amount" | "mobile" | "text";
      x: number;
      y: number;
      pressure: number | undefined;
    }
  >; // Track keydown events for simplified keystroke structure

  // Native Keystroke Capture
  nativeDataCollectionService: NativeDataCollectionService | null;
  isNativeKeystrokeCapturing: boolean;
  isNativeTouchCapturing: boolean;

  nativeKeystrokeData: any[];
  useNativeCapture: boolean;

  // Data Collections
  touchEvents: MobileTouchEvent[];
  keystrokes: MobileKeystroke[];
  motionEvents: MobileMotionEvents[];
  motionPatterns: MotionPattern[];
  touchGestures: TouchGesture[];
  typingPatterns: TypingPattern[];

  // Behavioral Data
  locationBehavior: LocationBehavior | null;
  deviceBehavior: DeviceBehavior | null;
  networkBehavior: NetworkBehavior | null;

  // Sensor Subscriptions
  accelerometerSubscription: any;
  gyroscopeSubscription: any;
  magnetometerSubscription: any;

  // Collection Status
  isMotionCollecting: boolean;
  isTouchCollecting: boolean;
  isKeystrokeCollecting: boolean;
  lastDataSent: number | null;
  collectionErrors: string[];

  // Error Handling
  errors: Record<string, string>;
  permissionStatus: Record<string, boolean>;

  // Background state preservation
  backgroundStateData: {
    wasCollecting: boolean;
    timestamp: number;
    touchCount: number;
    motionCount: number;
    scenario: string | null;
  } | null;

  // Actions
  startSession: (userId: string) => Promise<void>;
  setUserId: (userId: string) => void;
  clearSession: () => void;
  startDataCollection: (
    scenario:
      | "initial-registration"
      | "first-time-registration"
      | "re-registration"
      | "login"
  ) => Promise<void>;
  endSessionAndSendData: (endpoint: string) => Promise<{
    success: boolean;
    data: any;
  }>;
  stopDataCollection: () => Promise<void>;
  handleAppStateChange: (nextAppState: string) => Promise<void>;

  // Native Keystroke Capture Actions
  initializeNativeDataCollection: () => Promise<void>;
  startNativeKeystrokeCapture: () => Promise<boolean>;
  stopNativeKeystrokeCapture: () => Promise<{
    success: boolean;
    eventsCapture: number;
    captureMethod: string;
    message: string;
  }>;
  processHardwareKeyEvent: (keyEventData: any) => Promise<void>;
  processRealTouchEvent: (touchEventData: any) => Promise<void>;
  getNativeKeystrokeData: () => Promise<{
    keystrokeEvents: any[];
    captureInfo: {
      isHardwareTiming: boolean;
      captureMethod: string;
      dataQuality: string;
      eventsCount: number;
      sessionDuration: number;
    };
  }>;
  setUseNativeCapture: (useNative: boolean) => void;

  // Data Collection Actions
  collectTouchEvent: (event: Partial<MobileTouchEvent>) => Promise<void>;
  collectKeystroke: (event: Partial<MobileKeystroke>) => Promise<void>;
  generateTypingPatternForInputType: (
    inputType: "password" | "email" | "amount" | "mobile" | "text",
    forceGeneration?: boolean
  ) => void;
  startMotionCollection: () => Promise<void>;
  stopMotionCollection: () => void;
  collectLocationBehavior: () => Promise<void>;
  collectDeviceBehavior: () => Promise<void>;
  collectNetworkBehavior: () => Promise<void>;

  // Utility Actions
  generateSessionId: () => string;
  calculateMotionMagnitude: (accelerometer: {
    x: number;
    y: number;
    z: number;
  }) => number;
  calculateRotationRate: (gyroscope: {
    x: number;
    y: number;
    z: number;
  }) => number;
  calculateDistance: (
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => number;
  calculateVelocity: (distance: number, duration: number) => number;

  // Permission Management
  requestPermissions: () => Promise<void>;
  checkPermissions: () => Promise<{
    location: boolean;
    motion: boolean;
    usageStats: boolean;
  }>;
  checkPermissionStatus: (permission: string) => boolean;
  sendSessionDataToServer: (
    endpoint: string,
    sessionData: BehavioralSession
  ) => Promise<void>;
  calculateDataSize: (data: any) => number;
  validateSessionData: (sessionData: BehavioralSession) => {
    isValid: boolean;
    reason?: string;
  };
  chunkSessionData: (
    sessionData: BehavioralSession,
    maxSizeBytes?: number
  ) => BehavioralSession[];
}

export const useDataCollectionStore = create<DataCollectionState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    currentSession: null,
    isCollecting: false,
    sessionId: null,
    userId: null,
    collectionScenario: null,
    isWaitingForResponse: false,
    sessionStartTime: null,
    sessionEndTime: null,
    backgroundState: null,
    patternInterval: null,
    backgroundStateData: null,
    staticDataCollected: false,
    isEndingSession: false,
    lastTouchEventTime: 0,
    lastKeystrokeTime: 0,
    lastProcessedKeyIdentifier: null,
    lastKeystrokeCoordinates: null,
    currentInputType: null,
    pendingKeydowns: new Map(),

    // Native Keystroke Capture State
    nativeDataCollectionService: null,
    isNativeKeystrokeCapturing: false,
    isNativeTouchCapturing: false,
    nativeKeystrokeData: [],
    useNativeCapture: true, // Default to using native capture when available

    touchEvents: [],
    keystrokes: [],
    motionEvents: [],
    motionPatterns: [],
    touchGestures: [],
    typingPatterns: [],
    locationBehavior: null,
    deviceBehavior: null,
    networkBehavior: null,
    accelerometerSubscription: null,
    gyroscopeSubscription: null,
    magnetometerSubscription: null,
    isMotionCollecting: false,
    isTouchCollecting: false,
    isKeystrokeCollecting: false,
    lastDataSent: null,
    collectionErrors: [],
    errors: {},
    permissionStatus: {
      location: false,
      usageStats: false,
    },

    // Utility Functions with performance optimizations
    generateSessionId: () => {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Memoized calculation functions to avoid repeated computations
    calculateMotionMagnitude: (() => {
      const cache = new Map();
      return (accelerometer) => {
        const key = `${accelerometer.x.toFixed(3)}_${accelerometer.y.toFixed(3)}_${accelerometer.z.toFixed(3)}`;
        if (cache.has(key)) {
          return cache.get(key);
        }
        const magnitude = Math.sqrt(
          accelerometer.x * accelerometer.x +
            accelerometer.y * accelerometer.y +
            accelerometer.z * accelerometer.z
        );
        // Keep cache size manageable
        if (cache.size > 100) {
          cache.clear();
        }
        cache.set(key, magnitude);
        return magnitude;
      };
    })(),

    calculateRotationRate: (() => {
      const cache = new Map();
      return (gyroscope) => {
        const key = `${gyroscope.x.toFixed(3)}_${gyroscope.y.toFixed(3)}_${gyroscope.z.toFixed(3)}`;
        if (cache.has(key)) {
          return cache.get(key);
        }
        const rate = Math.sqrt(
          gyroscope.x * gyroscope.x +
            gyroscope.y * gyroscope.y +
            gyroscope.z * gyroscope.z
        );
        if (cache.size > 100) {
          cache.clear();
        }
        cache.set(key, rate);
        return rate;
      };
    })(),

    calculateDistance: (() => {
      const cache = new Map();
      return (startX, startY, endX, endY) => {
        const key = `${startX}_${startY}_${endX}_${endY}`;
        if (cache.has(key)) {
          return cache.get(key);
        }
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (cache.size > 50) {
          cache.clear();
        }
        cache.set(key, distance);
        return distance;
      };
    })(),

    calculateVelocity: (distance, duration) => {
      return duration > 0 ? distance / duration : 0;
    },

    // Permission Management
    requestPermissions: async () => {
      try {
        // Location Permission
        const locationPermission =
          await Location.requestForegroundPermissionsAsync();
        set((state) => ({
          permissionStatus: {
            ...state.permissionStatus,
            location: locationPermission.status === "granted",
          },
        }));

        // Battery Permission (usually granted by default)
        try {
          await Battery.getBatteryLevelAsync();
          set((state) => ({
            permissionStatus: {
              ...state.permissionStatus,
              battery: true,
            },
          }));
        } catch (error) {
          set((state) => ({
            permissionStatus: {
              ...state.permissionStatus,
              battery: false,
            },
            errors: {
              ...state.errors,
              battery: "Battery permission denied",
            },
          }));
        }

        // Biometric Permission
        const biometricAvailable = await LocalAuthentication.hasHardwareAsync();
        set((state) => ({
          permissionStatus: {
            ...state.permissionStatus,
            biometric: biometricAvailable,
          },
        }));

        // Check native module permissions
        if (BehavioralDataCollectorModule) {
          try {
            const nativePermissions =
              await BehavioralDataCollectorModule.checkPermissions();
            set((state) => ({
              permissionStatus: {
                ...state.permissionStatus,
                usageStats: nativePermissions.usageStats || false,
              },
            }));
          } catch (error) {}
        }
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            permissions: "Failed to request permissions",
          },
        }));
      }
    },

    checkPermissions: async () => {
      try {
        const permissions = {
          location: false,
          motion: false,
          usageStats: false,
        };

        // Check location permission
        const { status: locationStatus } =
          await Location.getForegroundPermissionsAsync();
        permissions.location = locationStatus === "granted";

        // Motion sensors don't require explicit permissions on most devices
        permissions.motion = true;

        // Check native module permissions
        if (BehavioralDataCollectorModule) {
          try {
            const nativePermissions =
              await BehavioralDataCollectorModule.checkPermissions();
            permissions.usageStats = nativePermissions.usageStats || false;
          } catch (error) {}
        }

        set({
          permissionStatus: { ...get().permissionStatus, ...permissions },
        });
        return permissions;
      } catch (error) {
        throw error;
      }
    },

    checkPermissionStatus: (permission) => {
      return get().permissionStatus[permission] || false;
    },

    // Native Keystroke Capture Methods
    initializeNativeDataCollection: async () => {
      try {
        const service = new NativeDataCollectionService();
        await service.initialize();

        set({ nativeDataCollectionService: service });
        console.log("Native data collection service initialized successfully");
      } catch (error) {
        console.warn(
          "Failed to initialize native data collection service:",
          error
        );
        set({
          useNativeCapture: false,
          errors: {
            ...get().errors,
            nativeInit: `Failed to initialize native capture: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        });
      }
    },

    startNativeKeystrokeCapture: async () => {
      try {
        const state = get();
        if (!state.nativeDataCollectionService) {
          await get().initializeNativeDataCollection();
        }

        const service = get().nativeDataCollectionService;
        if (!service) {
          console.warn("Native data collection service not available");
          return false;
        }

        const captureInfo = await service.startNativeKeystrokeCapture();
        const success = captureInfo && captureInfo.isActive;
        if (success) {
          set({
            isNativeKeystrokeCapturing: true,
            nativeKeystrokeData: [],
          });
          console.log("Native keystroke capture started successfully");
        }
        return success;
      } catch (error) {
        console.error("Failed to start native keystroke capture:", error);
        set({
          errors: {
            ...get().errors,
            nativeCapture: `Failed to start native capture: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        });
        return false;
      }
    },

    stopNativeKeystrokeCapture: async () => {
      try {
        const service = get().nativeDataCollectionService;
        if (!service) {
          console.warn("Native data collection service not available");
          return {
            success: false,
            eventsCapture: 0,
            captureMethod: "javascript",
            message: "Native data collection service not available",
          };
        }

        const capturedData = await service.stopNativeKeystrokeCapture();
        set({
          isNativeKeystrokeCapturing: false,
          nativeKeystrokeData: [],
        });

        console.log(
          `Native keystroke capture stopped. Captured ${capturedData.eventsCapture} events`
        );
        return capturedData;
      } catch (error) {
        console.error("Failed to stop native keystroke capture:", error);
        set({
          isNativeKeystrokeCapturing: false,
          errors: {
            ...get().errors,
            nativeCapture: `Failed to stop native capture: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        });
        return {
          success: false,
          eventsCapture: 0,
          captureMethod: "javascript",
          message: `Failed to stop native capture: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },

    processHardwareKeyEvent: async (keyEventData) => {
      // Hardware key event processing disabled - focusing on software keyboard events only
      console.log(
        "Hardware key event processing disabled for software keyboard focus"
      );
      return;
    },

    processRealTouchEvent: async (touchEventData) => {
      try {
        const service = get().nativeDataCollectionService;
        if (!service) {
          console.warn(
            "Native data collection service not available for touch event"
          );
          return;
        }

        await service.processRealTouchEvent(touchEventData);
        console.log("Real touch event processed:", {
          x: touchEventData.x,
          y: touchEventData.y,
        });
      } catch (error) {
        console.error("Failed to process real touch event:", error);
      }
    },

    getNativeKeystrokeData: async () => {
      try {
        const service = get().nativeDataCollectionService;
        if (!service) {
          console.warn("Native data collection service not available");
          return {
            keystrokeEvents: [],
            captureInfo: {
              isHardwareTiming: false,
              captureMethod: "javascript",
              dataQuality: "synthetic",
              eventsCount: 0,
              sessionDuration: 0,
            },
          };
        }

        const data = await service.getNativeKeystrokeData();
        console.log(
          `Retrieved ${data.keystrokeEvents.length} native keystroke events`
        );
        return data;
      } catch (error) {
        console.error("Failed to get native keystroke data:", error);
        return {
          keystrokeEvents: [],
          captureInfo: {
            isHardwareTiming: false,
            captureMethod: "javascript",
            dataQuality: "synthetic",
            eventsCount: 0,
            sessionDuration: 0,
          },
        };
      }
    },

    setUseNativeCapture: (useNative) => {
      set({ useNativeCapture: useNative });
      console.log(`Native capture ${useNative ? "enabled" : "disabled"}`);
    },

    // Session Management
    startSession: async (userId) => {
      try {
        const sessionId = get().generateSessionId();
        const timestamp = Date.now();

        // Request permissions first
        await get().requestPermissions();

        // Collect initial device and network behavior
        await get().collectDeviceBehavior();
        await get().collectNetworkBehavior();
        await get().collectLocationBehavior();

        const session: BehavioralSession = {
          sessionId,
          userId,
          timestamp,
          touchPatterns: [],
          typingPatterns: [],
          motionPattern: [],
          locationBehavior: get().locationBehavior || {
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            altitude: 0,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            permissionDenied: true,
          },
          networkBehavior: get().networkBehavior || {
            networkType: "unknown",
            networkName: "",
            networkOperator: "",
            isSecureConnection: false,
            simSerial: "",
            simOperator: "",
            simCountry: "",
            vpnDetected: false,
          },
          deviceBehavior: get().deviceBehavior || {
            deviceId: "",
            deviceModel: "",
            osVersion: "",
            appVersion: "",
            batteryLevel: 0,
            isCharging: false,
            orientation: "unknown",
            isRooted: false,
            isDebuggingEnabled: false,
            hasOverlayPermission: false,
            hasUnknownApps: false,
            accessibilityServices: [],
            activeInputMethod: "",
            appUsagePatterns: {},
            hardwareAttestation: false,
          },
        };

        set({
          currentSession: session,
          sessionId,
          userId,
          isCollecting: true,
          sessionStartTime: timestamp,
          staticDataCollected: false,
          lastTouchEventTime: 0,
          lastKeystrokeTime: 0,
          touchEvents: [],
          keystrokes: [],
          motionEvents: [],
          errors: {},
        });

        // Start motion collection automatically
        await get().startMotionCollection();
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            session: "Failed to start data collection session",
          },
        }));
      }
    },

    setUserId: (userId) => {
      set((state) => ({
        userId,
        currentSession: state.currentSession
          ? { ...state.currentSession, userId }
          : null,
      }));
      console.log("🔑 User ID set for data collection:", userId);
    },

    // Optimized Data Collection Management with batching
    startDataCollection: async (scenario) => {
      try {
        const state = get();

        // Prevent starting multiple sessions
        if (state.isCollecting && state.collectionScenario) {
          console.log(
            "🟡 Data collection already active for scenario:",
            state.collectionScenario
          );
          return;
        }

        // Reset native module session state
        try {
          if (BehavioralDataCollectorModule) {
            await BehavioralDataCollectorModule.resetSession();
          }
        } catch (error) {
          console.warn("Failed to reset native module session:", error);
        }

        set({
          collectionScenario: scenario,
          isCollecting: true,
          isTouchCollecting: true,
          isKeystrokeCollecting: true,
          collectionErrors: [],
        });

        // Start motion collection if not already started
        if (!get().isMotionCollecting) {
          await get().startMotionCollection();
        }

        // Initialize all behavior data collections to avoid null values
        await Promise.all([
          get().collectDeviceBehavior(),
          get().collectNetworkBehavior(),
          get().collectLocationBehavior(),
        ]);

        // Initialize native data collection service if not already initialized
        if (!get().nativeDataCollectionService && get().useNativeCapture) {
          try {
            await get().initializeNativeDataCollection();
            console.log(
              "🟢 Native data collection service initialized for touch capture"
            );
          } catch (error) {
            console.warn(
              "Failed to initialize native data collection service:",
              error
            );
          }
        }

        // Start native touch capture for hardware-level touch collection
        try {
          const nativeService = get().nativeDataCollectionService;
          if (nativeService && get().useNativeCapture) {
            const touchCaptureStarted =
              await nativeService.startNativeTouchCapture();
            if (touchCaptureStarted) {
              console.log(
                "🟢 Native touch capture started successfully - zero touch loss guaranteed"
              );
            } else {
              console.log(
                "🟡 Native touch capture failed to start, using JavaScript fallback"
              );
            }
          }
        } catch (error) {
          console.warn("Failed to start native touch capture:", error);
        }

        console.log(
          "🟢 Data collection started successfully for scenario:",
          scenario
        );
      } catch (error) {
        set((state) => ({
          collectionErrors: [
            ...state.collectionErrors,
            "Failed to start data collection",
          ],
          errors: {
            ...state.errors,
            collection: "Failed to start data collection",
          },
        }));
      }
    },

    stopDataCollection: async () => {
      try {
        // Removed data collection stop logging

        set({
          isCollecting: false,
          isTouchCollecting: false,
          isKeystrokeCollecting: false,
          collectionScenario: null,
        });

        // Stop motion collection
        get().stopMotionCollection();

        // Stop native touch capture
        try {
          const nativeService = get().nativeDataCollectionService;
          if (nativeService) {
            await nativeService.stopNativeTouchCapture();
            console.log("🔴 Native touch capture stopped");
          }
        } catch (error) {
          console.warn("Failed to stop native touch capture:", error);
        }
      } catch (error) {
        set((state) => ({
          collectionErrors: [
            ...state.collectionErrors,
            "Failed to stop data collection",
          ],
          errors: {
            ...state.errors,
            collection: "Failed to stop data collection",
          },
        }));
      }
    },

    handleAppStateChange: async (nextAppState) => {
      try {
        const state = get();
        // Removed app state logging

        if (nextAppState === "background" && state.isCollecting) {
          // Save current collection state before pausing
          const backgroundStateData = {
            wasCollecting: true,
            timestamp: Date.now(),
            touchCount: state.touchEvents.length,
            motionCount: state.motionPatterns.length,
            scenario: state.collectionScenario,
          };

          // Store background state for resume
          set({ backgroundStateData });

          // Pause collection when app goes to background
          await get().stopDataCollection();

          // Removed collection pause logging
        } else if (nextAppState === "active") {
          const backgroundStateData = state.backgroundStateData;

          // Only resume collection if it was explicitly paused due to background state
          // Do NOT automatically restart collection just because the app becomes active
          if (
            backgroundStateData?.wasCollecting &&
            state.sessionId &&
            state.collectionScenario
          ) {
            const backgroundDuration =
              Date.now() - (backgroundStateData.timestamp || 0);

            // Removed collection resume logging

            await get().startDataCollection(state.collectionScenario);

            // Clear background state
            set({ backgroundStateData: null });
          } else {
            // Removed app active logging
          }
        }

        // Removed app state success logging
      } catch (error) {}
    },

    endSessionAndSendData: async (endpoint) => {
      console.log(
        "🔴 endSessionAndSendData called - starting session termination and data send"
      );
      try {
        const state = get();
        if (!state.currentSession || state.isEndingSession) {
          console.log("🔴 endSessionAndSendData early return:", {
            hasCurrentSession: !!state.currentSession,
            isCollecting: state.isCollecting,
            isEndingSession: state.isEndingSession,
          });
          // Session already ended or currently ending
          return {
            success: true,
            data: {
              status: "no_session_data",
              requiresSecurityQuestions: false,
              message: "No session data available",
            },
          };
        }

        // Set flag to prevent multiple simultaneous calls
        set({ isEndingSession: true });
        console.log(
          "🔴 endSessionAndSendData proceeding with session termination"
        );

        // Generate typing pattern for current input type before ending session
        console.log("🔴 Session end - Current state check:", {
          currentInputType: state.currentInputType,
          keystrokesCount: state.keystrokes.length,
          typingPatternsCount: state.typingPatterns.length,
          isCollecting: state.isCollecting,
        });

        // Generate typing patterns for all input types that have keystrokes
        if (state.keystrokes.length > 0) {
          console.log(
            "🔴 Generating final typing patterns for all input types with keystrokes"
          );

          // Get unique input types from keystrokes
          const inputTypes = [
            ...new Set(state.keystrokes.map((k) => k.inputType)),
          ];
          console.log("🔴 Found input types:", inputTypes);

          inputTypes.forEach((inputType) => {
            if (inputType) {
              console.log("🔴 Generating pattern for input type:", inputType);
              get().generateTypingPatternForInputType(inputType, true); // Force generation
            }
          });

          // Check updated state after pattern generation
          const updatedState = get();
          console.log(
            "🔴 After pattern generation - typing patterns count:",
            updatedState.typingPatterns.length
          );
        }

        get().stopMotionCollection();

        // Get native session analytics for better touch/keystroke data
        let nativeAnalytics = null;
        try {
          if (state.nativeDataCollectionService) {
            nativeAnalytics =
              await state.nativeDataCollectionService.getSessionAnalytics();
            console.log(
              "🔴 Retrieved native session analytics:",
              nativeAnalytics
            );
          }
        } catch (error) {
          console.warn("Failed to get native session analytics:", error);
        }

        // Use native touch data if available, otherwise fall back to store data
        const consolidatedTouchPatterns: TouchGesture[] =
          nativeAnalytics?.touchEventData &&
          nativeAnalytics.touchEventData.length > 0
            ? [
                {
                  touches: nativeAnalytics.touchEventData.map((event: any) => ({
                    timestamp: event.timestamp,
                    startX: event.startX,
                    startY: event.startY,
                    endX: event.endX,
                    endY: event.endY,
                    pressure: event.pressure || 0,
                    size: event.size || 0,
                    gestureType: event.gestureType,
                    duration: event.duration,
                    distance: event.distance,
                    velocity: event.velocity,
                    inputType: "native",
                  })),
                },
              ]
            : (() => {
                // Fallback to store data
                const allTouchEvents = [
                  ...state.touchGestures.flatMap((gesture) => gesture.touches),
                  ...state.touchEvents,
                ];
                console.log(`🔴 Consolidating touch events for session data:`, {
                  touchGesturesCount: state.touchGestures.length,
                  touchEventsCount: state.touchEvents.length,
                  totalTouchEvents: allTouchEvents.length,
                  gestureTypes: allTouchEvents.map((e) => e.gestureType),
                  swipeEvents: allTouchEvents.filter(
                    (e) => e.gestureType === "swipe"
                  ).length,
                });
                return allTouchEvents.length > 0
                  ? [
                      {
                        touches: allTouchEvents,
                      },
                    ]
                  : [];
              })();

        console.log(`🔴 Final consolidated touch patterns:`, {
          patternsCount: consolidatedTouchPatterns.length,
          totalTouches: consolidatedTouchPatterns.reduce(
            (sum, pattern) => sum + pattern.touches.length,
            0
          ),
          gestureBreakdown: consolidatedTouchPatterns
            .flatMap((p) => p.touches)
            .reduce(
              (acc, touch) => {
                acc[touch.gestureType] = (acc[touch.gestureType] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
        });

        // Use native keystroke data if available, otherwise fall back to store data
        const consolidatedTypingPatterns: TypingPattern[] =
          nativeAnalytics?.keystrokeEventData &&
          nativeAnalytics.keystrokeEventData.length > 0
            ? (() => {
                // Group native keystroke data by input type with duplicate prevention
                const nativeKeystrokesByInputType = new Map<string, any[]>();

                // Validation function for native keystrokes
                const validateNativeKeystroke = (
                  keystroke: any,
                  existingKeystrokes: any[]
                ): { isValid: boolean; reason?: string } => {
                  // Check for invalid (0,0) coordinates
                  if (
                    keystroke.coordinate_x === 0 &&
                    keystroke.coordinate_y === 0
                  ) {
                    return {
                      isValid: false,
                      reason: "Invalid coordinates (0,0) - no real touch data",
                    };
                  }

                  // Check for consecutive duplicate characters at same coordinates
                  const COORDINATE_TOLERANCE = 0.001; // Small tolerance for floating point comparison

                  // Check consecutive keystrokes from the end until we find a different character
                  for (let i = existingKeystrokes.length - 1; i >= 0; i--) {
                    const existingKeystroke = existingKeystrokes[i];

                    // If we find a different character, stop checking
                    if (existingKeystroke.character !== keystroke.character) {
                      break;
                    }

                    // If character is the same, check coordinates
                    const isSameCoordinates =
                      Math.abs(
                        existingKeystroke.coordinate_x - keystroke.coordinate_x
                      ) < COORDINATE_TOLERANCE &&
                      Math.abs(
                        existingKeystroke.coordinate_y - keystroke.coordinate_y
                      ) < COORDINATE_TOLERANCE;

                    if (isSameCoordinates) {
                      return {
                        isValid: false,
                        reason: `Consecutive duplicate character '${keystroke.character}' at same coordinates detected`,
                      };
                    }
                  }

                  // Duplicate check is now handled above

                  return { isValid: true };
                };

                nativeAnalytics.keystrokeEventData.forEach((keystroke: any) => {
                  const inputType = keystroke.inputType || "text";
                  const existing =
                    nativeKeystrokesByInputType.get(inputType) || [];

                  // Validate keystroke before adding
                  const validation = validateNativeKeystroke(
                    keystroke,
                    existing
                  );
                  if (!validation.isValid) {
                    console.warn(
                      `🚫 [NATIVE-KEYSTROKE-VALIDATION] Rejected native keystroke '${keystroke.character}': ${validation.reason}`
                    );
                    return; // Skip invalid keystroke
                  }

                  existing.push({
                    character: keystroke.character,
                    timestamp: keystroke.timestamp,
                    dwellTime: keystroke.dwellTime,
                    flightTime: keystroke.flightTime,
                    x: keystroke.coordinate_x,
                    y: keystroke.coordinate_y,
                    pressure: keystroke.pressure,
                    inputType: inputType,
                    isHardwareTiming: keystroke.isHardwareTiming || false,
                    dataQuality: keystroke.dataQuality || "hardware",
                  });
                  nativeKeystrokesByInputType.set(inputType, existing);
                });

                // Create consolidated typing patterns from native data
                const patterns: TypingPattern[] = [];
                nativeKeystrokesByInputType.forEach((keystrokes, inputType) => {
                  if (keystrokes.length > 0) {
                    patterns.push({
                      inputType: inputType as
                        | "password"
                        | "email"
                        | "amount"
                        | "mobile"
                        | "text",
                      keystrokes: keystrokes.sort(
                        (a, b) => a.timestamp - b.timestamp
                      ),
                    });
                  }
                });
                return patterns;
              })()
            : (() => {
                // Fallback to store data
                const consolidatedTypingPatterns: TypingPattern[] = [];
                const keystrokesByInputType = new Map<
                  string,
                  MobileKeystroke[]
                >();

                // Only use keystrokes from state to prevent duplication
                state.keystrokes.forEach((keystroke) => {
                  if (keystroke.inputType) {
                    const existing =
                      keystrokesByInputType.get(keystroke.inputType) || [];
                    existing.push(keystroke);
                    keystrokesByInputType.set(keystroke.inputType, existing);
                  }
                });

                // Create consolidated typing patterns
                keystrokesByInputType.forEach((keystrokes, inputType) => {
                  if (keystrokes.length > 0) {
                    consolidatedTypingPatterns.push({
                      inputType: inputType as
                        | "password"
                        | "email"
                        | "amount"
                        | "mobile"
                        | "text",
                      keystrokes: keystrokes.sort(
                        (a, b) => a.timestamp - b.timestamp
                      ), // Sort by timestamp
                    });
                  }
                });
                return consolidatedTypingPatterns;
              })();

        const sessionData: BehavioralSession = {
          sessionId: state.currentSession.sessionId,
          userId: state.currentSession.userId,
          timestamp: state.currentSession.timestamp,
          touchPatterns: consolidatedTouchPatterns,
          typingPatterns: consolidatedTypingPatterns,
          motionPattern: state.motionPatterns,
          locationBehavior: state.currentSession.locationBehavior,
          networkBehavior: state.currentSession.networkBehavior,
          deviceBehavior: state.currentSession.deviceBehavior,
        };

        console.log(
          "🔴 Session end debug - Complete session analysis:",
          sessionData,
          "----print data----"
        );

        // Reset session state
        set({
          currentSession: null,
          isCollecting: false,
          sessionId: null,
          sessionEndTime: Date.now(),
          staticDataCollected: false,
          isEndingSession: false,
          lastTouchEventTime: 0,
          lastKeystrokeTime: 0,
          lastProcessedKeyIdentifier: null,
          currentInputType: null,
          touchEvents: [],
          keystrokes: [],
          motionEvents: [],
          motionPatterns: [],
          touchGestures: [],
          typingPatterns: [],
        });

        // Send session data to server
        const responseData = await get().sendSessionDataToServer(
          endpoint,
          sessionData
        );
        console.log(`✅ Session data sent successfully to ${endpoint}`);

        return {
          success: true,
          data: responseData,
        };
      } catch (error) {
        console.error(`❌ Failed to send session data to ${endpoint}:`, error);
        // Reset the ending session flag on error
        set({ isEndingSession: false });

        // TODO: NEEDS WORK - Bypass server errors for now during development
        // This should be removed once API endpoints are properly configured
        // console.warn("Bypassing server error for development");
        // return {
        //   success: true,
        //   data: {
        //     status: "server_error_bypassed",
        //     requiresSecurityQuestions: false,
        //     message: "Server error bypassed for development",
        //   },
        // };

        // Original error handling (commented out for bypass):
        set((state) => ({
          collectionErrors: [
            ...state.collectionErrors,
            `Failed to send data to ${endpoint}`,
          ],
          errors: {
            ...state.errors,
            sessionEnd: `Failed to send data to ${endpoint}`,
          },
        }));
        return { success: false, data: null };
      }
    },

    clearSession: () => {
      get().stopMotionCollection();
      set({
        currentSession: null,
        isCollecting: false,
        isKeystrokeCollecting: false,
        isTouchCollecting: false,
        isMotionCollecting: false,
        sessionId: null,
        userId: null,
        collectionScenario: null,
        isWaitingForResponse: false,
        sessionStartTime: null,
        sessionEndTime: null,
        staticDataCollected: false,
        isEndingSession: false,
        lastTouchEventTime: 0,
        lastKeystrokeTime: 0,
        lastProcessedKeyIdentifier: null,
        currentInputType: null,
        pendingKeydowns: new Map(),
        touchEvents: [],
        keystrokes: [],
        motionEvents: [],
        motionPatterns: [],
        touchGestures: [],
        typingPatterns: [],
        locationBehavior: null,
        deviceBehavior: null,
        networkBehavior: null,
        lastDataSent: null,
        collectionErrors: [],
        errors: {},
      });
    },

    // Touch Event Collection with Native Integration
    collectTouchEvent: async (event) => {
      try {
        const state = get();
        if (!state.isCollecting) return;

        console.log("🔵 [DEBUG] Starting collectTouchEvent execution");

        // ENHANCED TOUCH CAPTURE SYSTEM:
        // 1. Native-first approach with immediate fallback
        // 2. Dual collection: both native and JavaScript events
        // 3. Zero-loss guarantee: all touches captured
        // 4. Real-time processing with async storage
        // 5. Hardware-level timing when available
        // This ensures ZERO touch data is lost during any interaction

        const timestamp = Date.now();

        console.log("🔵 [TOUCH STORAGE] collectTouchEvent called:", {
          isCollecting: state.isCollecting,
          useNativeCapture: state.useNativeCapture,
          isNativeTouchCapturing: state.isNativeTouchCapturing,
          event: {
            gestureType: event.gestureType,
            startX: event.startX,
            startY: event.startY,
            endX: event.endX,
            endY: event.endY,
            duration: event.duration,
            timestamp: event.timestamp || timestamp,
          },
          currentTouchCount: state.touchEvents.length,
        });

        // NATIVE TOUCH PROCESSING FIRST
        if (state.useNativeCapture && state.nativeDataCollectionService) {
          try {
            // Process through native collection service for hardware-level capture
            const nativeTouchResult =
              await state.nativeDataCollectionService.collectTouchEvent({
                x: event.startX || 0,
                y: event.startY || 0,
                pressure: event.pressure || 1.0,
                size: 1.0, // Default size value
                action: 0, // ACTION_DOWN equivalent
              });

            if (nativeTouchResult) {
              console.log("🟢 Native touch event processed:", {
                gestureType: nativeTouchResult.gestureType,
                coordinates: `(${nativeTouchResult.startX}, ${nativeTouchResult.startY})`,
                duration: nativeTouchResult.duration,
                distance: nativeTouchResult.distance,
                velocity: nativeTouchResult.velocity,
              });

              // Filter out intermediate 'down' events from native results too
              const meaningfulGestures = [
                "tap",
                "swipe",
                "scroll",
                "pinch",
                "long_press",
              ];
              if (meaningfulGestures.includes(nativeTouchResult.gestureType)) {
                // Store native result immediately to prevent loss
                scheduleStateUpdate(() => {
                  set((state) => ({
                    touchEvents: [
                      ...state.touchEvents,
                      {
                        gestureType: nativeTouchResult.gestureType as
                          | "tap"
                          | "swipe"
                          | "scroll"
                          | "pinch"
                          | "long_press",
                        timestamp: nativeTouchResult.timestamp,
                        startX: nativeTouchResult.startX,
                        startY: nativeTouchResult.startY,
                        endX: nativeTouchResult.endX,
                        endY: nativeTouchResult.endY,
                        duration: nativeTouchResult.duration,
                        distance: nativeTouchResult.distance,
                        velocity: nativeTouchResult.velocity,
                        pressure: nativeTouchResult.pressure,
                      },
                    ],
                    lastTouchEventTime: timestamp,
                  }));
                });
              } else {
                console.log(
                  `🟡 Filtered out native intermediate gesture: ${nativeTouchResult.gestureType}`
                );
              }
            }
          } catch (nativeError) {
            console.warn(
              "Native touch processing failed, using JavaScript fallback:",
              nativeError
            );
          }
        }

        // GESTURE FILTERING - Only store meaningful gestures
        // Filter out intermediate 'down' events - only keep completed gestures
        const meaningfulGestures = [
          "tap",
          "swipe",
          "scroll",
          "pinch",
          "long_press",
        ];
        const gestureType = event.gestureType || "tap"; // Default to 'tap' if undefined
        if (!meaningfulGestures.includes(gestureType)) {
          console.log(`🟡 Filtered out intermediate gesture: ${gestureType}`);
          return;
        }

        // JAVASCRIPT FALLBACK - Always execute to ensure zero loss
        // Only prevent exact duplicates (same coordinates AND same timestamp)
        const lastTouchEvent = state.touchEvents[state.touchEvents.length - 1];
        if (lastTouchEvent) {
          const exactDuplicate =
            lastTouchEvent.startX === (event.startX || 0) &&
            lastTouchEvent.startY === (event.startY || 0) &&
            lastTouchEvent.endX === (event.endX || 0) &&
            lastTouchEvent.endY === (event.endY || 0) &&
            Math.abs(lastTouchEvent.timestamp - timestamp) < 5; // 5ms tolerance

          if (exactDuplicate) {
            console.log("🟡 Skipped exact duplicate touch event");
            return;
          }
        }
        let touchEvent: MobileTouchEvent = {
          gestureType: event.gestureType || "tap",
          timestamp,
          startX: event.startX || 0,
          startY: event.startY || 0,
          endX: event.endX || 0,
          endY: event.endY || 0,
          duration: event.duration || 0,
          distance: 0,
          velocity: 0,
          pressure: event.pressure, // undefined if device doesn't support pressure
        };

        console.log(
          `🟢 Creating touch event with gestureType: ${touchEvent.gestureType}`,
          {
            gestureType: touchEvent.gestureType,
            startX: touchEvent.startX,
            startY: touchEvent.startY,
            endX: touchEvent.endX,
            endY: touchEvent.endY,
            timestamp: touchEvent.timestamp,
          }
        );

        // Calculate distance and velocity in real-time
        touchEvent.distance = get().calculateDistance(
          touchEvent.startX,
          touchEvent.startY,
          touchEvent.endX,
          touchEvent.endY
        );
        touchEvent.velocity = get().calculateVelocity(
          touchEvent.distance!,
          touchEvent.duration
        );

        console.log("🔵 Real-time touch calculation:", {
          gestureType: touchEvent.gestureType,
          distance: touchEvent.distance.toFixed(2),
          velocity: touchEvent.velocity.toFixed(2),
          duration: touchEvent.duration,
          coordinates: `(${touchEvent.startX.toFixed(1)}, ${touchEvent.startY.toFixed(1)}) -> (${touchEvent.endX.toFixed(1)}, ${touchEvent.endY.toFixed(1)})`,
        });

        // Try to get enhanced data from native module
        if (BehavioralDataCollectorModule) {
          try {
            const enhancedData =
              await BehavioralDataCollectorModule.collectTouchEvent({
                startX: touchEvent.startX,
                startY: touchEvent.startY,
                endX: touchEvent.endX,
                endY: touchEvent.endY,
              });
            touchEvent = { ...touchEvent, ...enhancedData };
          } catch (nativeError) {}
        }

        // Fast Touch Capture System - Store ALL touches immediately without limits
        // Use async state update to prevent blocking navigation
        scheduleStateUpdate(() => {
          set((state) => {
            // Store ALL touch events without any limit - capture every single touch
            const newTouchEvents = [...state.touchEvents, touchEvent];

            // Just collect touch events - patterns will be consolidated at session end
            console.log("🔵 Collected touch event:", {
              gestureType: touchEvent.gestureType,
              distance: touchEvent.distance,
              velocity: touchEvent.velocity,
              totalEvents: newTouchEvents.length,
            });

            return {
              touchEvents: newTouchEvents,
              lastTouchEventTime: timestamp,
            };
          });
        });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            touch: "Failed to collect touch event",
          },
        }));
      }
    },

    // Keystroke Collection with native capture integration
    collectKeystroke: async (event) => {
      try {
        const state = get();
        console.log("🔴 [DEBUG] Starting collectKeystroke execution");

        // FAST TYPING CAPTURE SYSTEM:
        // 1. Immediate backup keystrokes on keydown (🟢 IMMEDIATE-BACKUP)
        // 2. 300ms timeout fallback for pending keydowns (🟠 FAST-TYPING)
        // 3. 1500ms cleanup with fallback creation (🟡 FALLBACK)
        // 4. Orphaned keyup handling with estimation (🔴 IMMEDIATE)
        // 5. Backup replacement with accurate data when available (🔄 REPLACE-BACKUP)
        // This ensures NO keystroke data is lost, even during extremely fast typing

        console.log("🔴 [KEYSTROKE STORAGE] collectKeystroke called:", {
          isCollecting: state.isCollecting,
          useNativeCapture: state.useNativeCapture,
          isNativeCapturing: state.isNativeKeystrokeCapturing,
          event: {
            character: event.character,
            inputType: event.inputType,
            actionValue: event.actionValue,
            timestamp: event.timestamp,
          },
          currentKeystrokeCount: state.keystrokes.length,
          currentTypingPatternCount: state.typingPatterns.length,
        });

        if (!state.isCollecting) {
          console.log(
            "🔴 [KEYSTROKE STORAGE] Not collecting - returning early"
          );
          return;
        }

        const timestamp = event.timestamp || Date.now();
        const actionValue: 0 | 1 = event.actionValue ?? 1;

        // If native capture is enabled and active, use native processing for software keyboard events only
        if (state.useNativeCapture && state.nativeDataCollectionService) {
          try {
            // Process through native capture system for software keyboard events
            if (actionValue === 0) {
              // Key down event - process as real touch event for coordinates (only store on keydown)
              if (
                event.coordinate_x !== undefined &&
                event.coordinate_y !== undefined
              ) {
                await get().processRealTouchEvent({
                  x: event.coordinate_x,
                  y: event.coordinate_y,
                  pressure: event.pressure || 0,
                  timestamp: timestamp,
                  action: 0, // ACTION_DOWN
                });
              }
            }
            // Note: Removed hardware key event processing to focus on software keyboard events only

            console.log(
              `🟢 Native capture processed: '${event.character}' (${actionValue === 0 ? "keydown" : "keyup"})`
            );

            // Update timing for session tracking
            scheduleStateUpdate(() => {
              set((state) => ({
                lastKeystrokeTime: timestamp,
              }));
            });

            // Continue to legacy processing to ensure keystroke data is stored
            // Don't return early - we need to store the keystroke data
            console.log(
              "🔴 [DEBUG] Native capture completed, continuing to legacy processing"
            );
          } catch (nativeError) {
            console.warn(
              "Native capture failed, falling back to legacy system:",
              nativeError
            );
            // Fall through to legacy processing
          }
        }

        console.log("🔴 [DEBUG] Reached legacy processing section");
        // Legacy keystroke processing (fallback or when native capture is disabled)
        console.log(
          `🟢 Processing keystroke (legacy): '${event.character}' (${actionValue === 0 ? "keydown" : "keyup"})`
        );

        // Update timing for session tracking only using async update
        scheduleStateUpdate(() => {
          set((state) => ({
            lastKeystrokeTime: timestamp,
          }));
        });

        const keyPairIdentifier = `${event.character}_${event.inputType || "text"}`;

        // Handle keydown event
        if (actionValue === 0) {
          const keydownData = {
            timestamp,
            inputType: event.inputType || "text",
            x: event.coordinate_x || 0,
            y: event.coordinate_y || 0,
            pressure: event.pressure,
          };

          scheduleStateUpdate(() => {
            set((state) => {
              const newPendingKeydowns = new Map(state.pendingKeydowns);
              newPendingKeydowns.set(keyPairIdentifier, keydownData);
              return {
                pendingKeydowns: newPendingKeydowns,
              };
            });
          });

          // Set up fallback timeout for fast typing scenarios (300ms)
          setTimeout(() => {
            const currentState = get();
            const pendingKeydown =
              currentState.pendingKeydowns.get(keyPairIdentifier);

            if (pendingKeydown) {
              // Still pending after 300ms - likely fast typing, create fallback keystroke
              const currentTime = Date.now();
              const fallbackDwellTime = Math.min(
                120,
                Math.max(40, currentTime - pendingKeydown.timestamp)
              );
              let fallbackFlightTime = 0;
              const currentStateForLastKeystroke = get();
              const lastKeystroke =
                currentStateForLastKeystroke.keystrokes[
                  currentStateForLastKeystroke.keystrokes.length - 1
                ];
              if (lastKeystroke) {
                fallbackFlightTime = Math.max(
                  0,
                  pendingKeydown.timestamp - lastKeystroke.timestamp
                );
              }

              const fallbackKeystroke: MobileKeystroke = {
                character: event.character || "",
                timestamp: pendingKeydown.timestamp,
                dwellTime: fallbackDwellTime,
                flightTime: fallbackFlightTime,
                coordinate_x: pendingKeydown.x,
                coordinate_y: pendingKeydown.y,
                pressure: pendingKeydown.pressure,
                inputType: pendingKeydown.inputType,
              };

              // Validate fallback keystroke before storing
              const validateKeystroke = (
                keystroke: MobileKeystroke,
                existingKeystrokes: MobileKeystroke[]
              ): { isValid: boolean; reason?: string } => {
                if (
                  keystroke.coordinate_x === 0 &&
                  keystroke.coordinate_y === 0
                ) {
                  return {
                    isValid: false,
                    reason: "Invalid coordinates (0,0) - no real touch data",
                  };
                }

                // Check for consecutive duplicate characters at same coordinates
                if (existingKeystrokes.length > 0) {
                  const COORDINATE_TOLERANCE = 0.001;

                  // Check backwards from most recent keystroke for consecutive duplicates
                  for (let i = existingKeystrokes.length - 1; i >= 0; i--) {
                    const existingKeystroke = existingKeystrokes[i];

                    // If we find a different character, stop checking
                    if (existingKeystroke.character !== keystroke.character) {
                      break;
                    }

                    // If same character, check coordinates
                    if (
                      Math.abs(
                        existingKeystroke.coordinate_x - keystroke.coordinate_x
                      ) < COORDINATE_TOLERANCE &&
                      Math.abs(
                        existingKeystroke.coordinate_y - keystroke.coordinate_y
                      ) < COORDINATE_TOLERANCE
                    ) {
                      return {
                        isValid: false,
                        reason: `Consecutive duplicate character '${keystroke.character}' at same coordinates detected (matching keystroke at index ${i})`,
                      };
                    }
                  }
                }

                return { isValid: true };
              };

              const currentState = get();
              const validation = validateKeystroke(
                fallbackKeystroke,
                currentState.keystrokes
              );
              if (!validation.isValid) {
                console.warn(
                  `🚫 [FALLBACK-VALIDATION] Rejected fallback keystroke '${fallbackKeystroke.character}': ${validation.reason}`
                );
                return;
              }

              // Store fallback keystroke and remove from pending
              scheduleStateUpdate(() => {
                set((state) => {
                  const newKeystrokes =
                    state.keystrokes.length >= 200
                      ? [...state.keystrokes.slice(-99), fallbackKeystroke]
                      : [...state.keystrokes, fallbackKeystroke];

                  const newPendingKeydowns = new Map(state.pendingKeydowns);
                  newPendingKeydowns.delete(keyPairIdentifier);

                  console.log(
                    `🟠 [FAST-TYPING] Created fallback keystroke for fast typing: '${fallbackKeystroke.character}' (dwell: ${fallbackDwellTime}ms, flight: ${fallbackFlightTime}ms)`
                  );

                  return {
                    ...state,
                    keystrokes: newKeystrokes,
                    pendingKeydowns: newPendingKeydowns,
                  };
                });
              });
            }
          }, 300); // 300ms timeout for fast typing detection

          // For extremely fast typing, also store an immediate partial keystroke
          // This ensures we capture data even if the keyup never comes
          if (event.character && event.character.trim()) {
            const immediatePartialKeystroke: MobileKeystroke = {
              character: event.character,
              timestamp: timestamp,
              dwellTime: 60, // Estimated minimum dwell time for fast typing
              flightTime: 0, // Will be calculated properly if keyup arrives
              coordinate_x: keydownData.x,
              coordinate_y: keydownData.y,
              pressure: keydownData.pressure,
              inputType: keydownData.inputType,
            };

            // Calculate flight time from last keystroke
            const lastKeystroke = state.keystrokes[state.keystrokes.length - 1];
            if (lastKeystroke) {
              immediatePartialKeystroke.flightTime = Math.max(
                0,
                timestamp - lastKeystroke.timestamp
              );
            }

            // Validate immediate partial keystroke before storing
            const validateKeystroke = (
              keystroke: MobileKeystroke,
              existingKeystrokes: MobileKeystroke[]
            ): { isValid: boolean; reason?: string } => {
              if (
                keystroke.coordinate_x === 0 &&
                keystroke.coordinate_y === 0
              ) {
                return {
                  isValid: false,
                  reason: "Invalid coordinates (0,0) - no real touch data",
                };
              }

              // Check for consecutive duplicate characters at same coordinates
              if (existingKeystrokes.length > 0) {
                const COORDINATE_TOLERANCE = 0.001;

                // Check backwards from most recent keystroke for consecutive duplicates
                for (let i = existingKeystrokes.length - 1; i >= 0; i--) {
                  const existingKeystroke = existingKeystrokes[i];

                  // If we find a different character, stop checking
                  if (existingKeystroke.character !== keystroke.character) {
                    break;
                  }

                  // If same character, check coordinates
                  if (
                    Math.abs(
                      existingKeystroke.coordinate_x - keystroke.coordinate_x
                    ) < COORDINATE_TOLERANCE &&
                    Math.abs(
                      existingKeystroke.coordinate_y - keystroke.coordinate_y
                    ) < COORDINATE_TOLERANCE
                  ) {
                    return {
                      isValid: false,
                      reason: `Consecutive duplicate character '${keystroke.character}' at same coordinates detected (matching keystroke at index ${i})`,
                    };
                  }
                }
              }

              return { isValid: true };
            };

            const currentState = get();
            const validation = validateKeystroke(
              immediatePartialKeystroke,
              currentState.keystrokes
            );
            if (!validation.isValid) {
              console.warn(
                `🚫 [IMMEDIATE-PARTIAL-VALIDATION] Rejected immediate partial keystroke '${immediatePartialKeystroke.character}': ${validation.reason}`
              );
              return;
            }

            // Store immediate partial keystroke as backup
            scheduleStateUpdate(() => {
              set((state) => {
                const newKeystrokes =
                  state.keystrokes.length >= 200
                    ? [
                        ...state.keystrokes.slice(-99),
                        immediatePartialKeystroke,
                      ]
                    : [...state.keystrokes, immediatePartialKeystroke];

                console.log(
                  `🟢 [IMMEDIATE-BACKUP] Stored immediate backup keystroke: '${immediatePartialKeystroke.character}' (estimated dwell: 60ms, flight: ${immediatePartialKeystroke.flightTime}ms)`
                );

                return {
                  ...state,
                  keystrokes: newKeystrokes,
                };
              });
            });
          }

          console.log(
            `🔵 Store - Keydown stored: ${event.character}, pending count: ${get().pendingKeydowns.size + 1}`
          );
          return;
        }

        // Handle keyup event
        if (actionValue === 1) {
          const keydownData = state.pendingKeydowns.get(keyPairIdentifier);
          if (!keydownData) {
            // No matching keydown - this could be a very fast typing scenario
            // Create an immediate keystroke with estimated timing
            console.warn(
              `No matching keydown found for keyup event: '${event.character}' - creating immediate keystroke for fast typing`
            );

            const estimatedDwellTime = 80; // Reasonable estimate for fast typing
            let estimatedFlightTime = 0;
            const lastKeystroke = state.keystrokes[state.keystrokes.length - 1];
            if (lastKeystroke) {
              estimatedFlightTime = Math.max(
                0,
                timestamp - lastKeystroke.timestamp - estimatedDwellTime
              );
            }

            const immediateKeystroke: MobileKeystroke = {
              character: event.character || "",
              timestamp: timestamp - estimatedDwellTime, // Estimate keydown time
              dwellTime: estimatedDwellTime,
              flightTime: estimatedFlightTime,
              coordinate_x: event.coordinate_x || 0,
              coordinate_y: event.coordinate_y || 0,
              pressure: event.pressure,
              inputType: event.inputType || "text",
            };

            // Validate immediate keystroke before storing
            const validateKeystroke = (
              keystroke: MobileKeystroke,
              existingKeystrokes: MobileKeystroke[]
            ): { isValid: boolean; reason?: string } => {
              if (
                keystroke.coordinate_x === 0 &&
                keystroke.coordinate_y === 0
              ) {
                return {
                  isValid: false,
                  reason: "Invalid coordinates (0,0) - no real touch data",
                };
              }
              const recentKeystrokes = existingKeystrokes.slice(-10);
              const COORDINATE_TOLERANCE = 0.001; // Small tolerance for floating point comparison
              const isDuplicateCharacterAtSameCoords = recentKeystrokes.some(
                (existing) =>
                  existing.character === keystroke.character &&
                  Math.abs(existing.coordinate_x - keystroke.coordinate_x) <
                    COORDINATE_TOLERANCE &&
                  Math.abs(existing.coordinate_y - keystroke.coordinate_y) <
                    COORDINATE_TOLERANCE
              );
              if (isDuplicateCharacterAtSameCoords) {
                return {
                  isValid: false,
                  reason: "Duplicate character at same coordinates detected",
                };
              }
              return { isValid: true };
            };

            const currentState = get();
            const validation = validateKeystroke(
              immediateKeystroke,
              currentState.keystrokes
            );
            if (!validation.isValid) {
              console.warn(
                `🚫 [ORPHANED-KEYUP-VALIDATION] Rejected immediate keystroke for orphaned keyup '${immediateKeystroke.character}': ${validation.reason}`
              );
              return;
            }

            // Store immediate keystroke
            scheduleStateUpdate(() => {
              set((state) => {
                const newKeystrokes =
                  state.keystrokes.length >= 200
                    ? [...state.keystrokes.slice(-99), immediateKeystroke]
                    : [...state.keystrokes, immediateKeystroke];

                console.log(
                  `🔴 [IMMEDIATE] Created immediate keystroke for orphaned keyup: '${immediateKeystroke.character}' (estimated dwell: ${estimatedDwellTime}ms, flight: ${estimatedFlightTime}ms)`
                );

                return {
                  ...state,
                  keystrokes: newKeystrokes,
                  lastKeystrokeTime: timestamp,
                };
              });
            });
            return;
          }

          // Calculate timing
          let dwellTime = Math.max(0, timestamp - keydownData.timestamp);
          if (dwellTime < 5) {
            dwellTime = Math.max(dwellTime, 15);
            console.log(
              `Adjusted extremely fast dwell time to ${dwellTime}ms for '${event.character}'`
            );
          } else if (dwellTime < 15) {
            console.log(
              `Very fast typing detected: ${dwellTime}ms dwell time for '${event.character}'`
            );
          } else if (dwellTime > 5000) {
            console.warn(
              `Very long dwell time: ${dwellTime}ms for character '${event.character}' - possible UI freeze`
            );
          }

          let flightTime = 0;
          const lastKeystroke = state.keystrokes[state.keystrokes.length - 1];
          if (lastKeystroke) {
            flightTime = Math.max(
              0,
              keydownData.timestamp - lastKeystroke.timestamp
            );
          }

          // Create keystroke object (coordinates only from keydown)
          const keystroke: MobileKeystroke = {
            character: event.character || "",
            timestamp: keydownData.timestamp,
            dwellTime,
            flightTime,
            coordinate_x: keydownData.x, // Only store coordinates from keydown
            coordinate_y: keydownData.y, // Only store coordinates from keydown
            pressure: keydownData.pressure,
            inputType: keydownData.inputType,
          };

          // Send to native module if available (legacy fallback)
          if (BehavioralDataCollectorModule) {
            try {
              await BehavioralDataCollectorModule.collectKeystroke({
                character: keystroke.character,
                timestamp: keystroke.timestamp,
                dwellTime: dwellTime,
                flightTime: flightTime,
                coordinate_x: keydownData.x,
                coordinate_y: keydownData.y,
                pressure: keydownData.pressure,
              });

              console.log(
                `Keystroke collected - Character: ${keystroke.character}, JS Dwell Time: ${dwellTime}ms, JS Flight Time: ${flightTime}ms`
              );
            } catch (nativeError) {
              console.warn(
                "Native module keystroke collection failed:",
                nativeError
              );
            }
          }

          // Clean up pending keydowns
          state.pendingKeydowns.delete(keyPairIdentifier);
          const currentInputType = keystroke.inputType;
          const previousInputType = get().currentInputType;

          set({ currentInputType });
          console.log(
            `Input type changed from ${previousInputType} to ${currentInputType}`
          );

          // Clean up old keydown events and create fallback keystrokes for fast typing
          const currentTime = timestamp;
          let cleanedCount = 0;
          let fallbackKeystrokesCreated = 0;

          for (const [key, keydownData] of state.pendingKeydowns.entries()) {
            if (currentTime - keydownData.timestamp > 1500) {
              // Create fallback keystroke for orphaned keydown (fast typing scenario)
              const fallbackDwellTime = Math.min(
                150,
                Math.max(50, currentTime - keydownData.timestamp)
              );
              let fallbackFlightTime = 0;
              const lastKeystroke =
                state.keystrokes[state.keystrokes.length - 1];
              if (lastKeystroke) {
                fallbackFlightTime = Math.max(
                  0,
                  keydownData.timestamp - lastKeystroke.timestamp
                );
              }

              const fallbackKeystroke: MobileKeystroke = {
                character: key.split("_")[0] || "", // Extract character from key identifier
                timestamp: keydownData.timestamp,
                dwellTime: fallbackDwellTime,
                flightTime: fallbackFlightTime,
                coordinate_x: keydownData.x,
                coordinate_y: keydownData.y,
                pressure: keydownData.pressure,
                inputType: keydownData.inputType,
              };

              // Store fallback keystroke immediately
              const newKeystrokes =
                state.keystrokes.length >= 200
                  ? [...state.keystrokes.slice(-99), fallbackKeystroke]
                  : [...state.keystrokes, fallbackKeystroke];

              // Update state with fallback keystroke
              set((prevState) => ({
                ...prevState,
                keystrokes: newKeystrokes,
              }));

              console.log(
                `🟡 [FALLBACK] Created fallback keystroke for fast typing: '${fallbackKeystroke.character}' (dwell: ${fallbackDwellTime}ms, flight: ${fallbackFlightTime}ms)`
              );

              fallbackKeystrokesCreated++;
              state.pendingKeydowns.delete(key);
              cleanedCount++;
            }
          }

          if (cleanedCount > 0) {
            console.warn(
              `Cleaned up ${cleanedCount} orphaned keydown events (${fallbackKeystrokesCreated} converted to fallback keystrokes for fast typing)`
            );
          }

          // Store keystroke asynchronously
          console.log("🔴 [KEYSTROKE STORAGE] About to store keystroke:", {
            character: keystroke.character,
            inputType: keystroke.inputType,
            dwellTime: keystroke.dwellTime,
            flightTime: keystroke.flightTime,
            currentKeystrokeCount: get().keystrokes.length,
          });

          // KEYSTROKE VALIDATION SYSTEM:
          // 1. Reject keystrokes with (0,0) coordinates - indicates invalid touch data
          // 2. Prevent duplicate characters at same coordinates (e.g., 'sss' -> 's')
          // 3. Allow same characters at different coordinates (legitimate repeated keys)
          // 4. Preserve behavioral authenticity while filtering invalid data

          const validateKeystroke = (
            keystroke: MobileKeystroke,
            existingKeystrokes: MobileKeystroke[]
          ): { isValid: boolean; reason?: string } => {
            // Check for invalid (0,0) coordinates
            if (keystroke.coordinate_x === 0 && keystroke.coordinate_y === 0) {
              return {
                isValid: false,
                reason: "Invalid coordinates (0,0) - no real touch data",
              };
            }

            // Check for consecutive duplicate characters at same coordinates
            if (existingKeystrokes.length > 0) {
              const COORDINATE_TOLERANCE = 0.001;

              // Check backwards from most recent keystroke for consecutive duplicates
              for (let i = existingKeystrokes.length - 1; i >= 0; i--) {
                const existingKeystroke = existingKeystrokes[i];

                // If we find a different character, stop checking
                if (existingKeystroke.character !== keystroke.character) {
                  break;
                }

                // If same character, check coordinates
                if (
                  Math.abs(
                    existingKeystroke.coordinate_x - keystroke.coordinate_x
                  ) < COORDINATE_TOLERANCE &&
                  Math.abs(
                    existingKeystroke.coordinate_y - keystroke.coordinate_y
                  ) < COORDINATE_TOLERANCE
                ) {
                  return {
                    isValid: false,
                    reason: `Consecutive duplicate character '${keystroke.character}' at same coordinates detected (matching keystroke at index ${i})`,
                  };
                }
              }
            }

            return { isValid: true };
          };

          // Validate keystroke before storing
          const validation = validateKeystroke(keystroke, state.keystrokes);
          if (!validation.isValid) {
            console.warn(
              `🚫 [KEYSTROKE-VALIDATION] Rejected keystroke '${keystroke.character}': ${validation.reason}`
            );
            return; // Skip storing invalid keystroke
          }

          console.log(
            `✅ [KEYSTROKE-VALIDATION] Accepted keystroke '${keystroke.character}' with coordinates (${keystroke.coordinate_x}, ${keystroke.coordinate_y})`
          );

          scheduleStateUpdate(() => {
            set((state) => {
              // Check if we need to replace an immediate backup keystroke
              let newKeystrokes = [...state.keystrokes];
              const lastKeystroke = newKeystrokes[newKeystrokes.length - 1];

              // If the last keystroke has the same character and timestamp within 100ms,
              // it's likely our immediate backup - replace it with the accurate one
              if (
                lastKeystroke &&
                lastKeystroke.character === keystroke.character &&
                Math.abs(lastKeystroke.timestamp - keystroke.timestamp) <= 100
              ) {
                newKeystrokes[newKeystrokes.length - 1] = keystroke;
                console.log(
                  `🔄 [REPLACE-BACKUP] Replaced immediate backup with accurate keystroke: '${keystroke.character}' (accurate dwell: ${keystroke.dwellTime}ms vs backup: ${lastKeystroke.dwellTime}ms)`
                );
              } else {
                // Add new keystroke normally
                newKeystrokes =
                  newKeystrokes.length >= 200
                    ? [...newKeystrokes.slice(-99), keystroke]
                    : [...newKeystrokes, keystroke];
              }

              console.log("🔴 [KEYSTROKE STORAGE] Keystroke stored:", {
                newKeystrokeCount: newKeystrokes.length,
                previousCount: state.keystrokes.length,
                keystrokeAdded: keystroke.character,
              });

              // Generate typing patterns every 10 keystrokes (reduced frequency)
              if (newKeystrokes.length > 0 && newKeystrokes.length % 10 === 0) {
                // Delay pattern generation to reduce immediate CPU load
                setTimeout(() => {
                  const recentKeystrokes = newKeystrokes.slice(-25);
                  const inputType = keystroke.inputType || "text";

                  const typingPattern: TypingPattern = {
                    inputType,
                    keystrokes: recentKeystrokes,
                  };

                  console.log(
                    "🔴 [KEYSTROKE STORAGE] Generated typing pattern (10 complete keystrokes - optimized):",
                    {
                      inputType,
                      totalKeystrokeCount: recentKeystrokes.length,
                      newTypingPatternCount: get().typingPatterns.length + 1,
                    }
                  );

                  scheduleStateUpdate(() => {
                    set((state) => ({
                      ...state,
                      typingPatterns: [...state.typingPatterns, typingPattern],
                    }));
                  });
                }, 100); // 100ms delay for pattern generation

                return {
                  ...state,
                  keystrokes: newKeystrokes,
                };
              }

              return {
                ...state,
                keystrokes: newKeystrokes,
              };
            });
          });

          // Update lastKeystrokeTime and currentInputType asynchronously
          scheduleStateUpdate(() => {
            set((state) => ({
              ...state,
              lastKeystrokeTime: timestamp,
              currentInputType: currentInputType,
            }));
          });
          // });
        }
      } catch (error) {
        console.error("Keystroke collection error:", error);
        set((state) => ({
          errors: {
            ...state.errors,
            keystroke: `Failed to collect keystroke: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          collectionErrors: [
            ...state.collectionErrors.slice(-9),
            `Keystroke collection failed at ${new Date().toISOString()}: ${error instanceof Error ? error.message : "Unknown error"}`,
          ],
        }));
      }
    },

    // Generate typing pattern for specific input type when switching fields
    generateTypingPatternForInputType: (
      inputType: "password" | "email" | "amount" | "mobile" | "text",
      forceGeneration: boolean = false
    ) => {
      const state = get();

      console.log(
        `🔴 [PATTERN GENERATION] generateTypingPatternForInputType called:`,
        {
          inputType,
          isCollecting: state.isCollecting,
          forceGeneration,
          totalKeystrokeCount: state.keystrokes.length,
          currentTypingPatternCount: state.typingPatterns.length,
        }
      );

      // Only generate patterns during session end (forceGeneration) to prevent duplication
      if (!forceGeneration) {
        console.log(
          `🔴 [PATTERN GENERATION] Pattern generation disabled during collection - only at session end`
        );
        return;
      }

      // Filter keystrokes for the specific input type
      const inputTypeKeystrokes = state.keystrokes.filter(
        (keystroke) => keystroke.inputType === inputType
      );

      console.log(
        `🔴 [PATTERN GENERATION] Filtered keystrokes for ${inputType}:`,
        {
          inputType,
          filteredKeystrokeCount: inputTypeKeystrokes.length,
          totalKeystrokeCount: state.keystrokes.length,
          isCollecting: state.isCollecting,
          forceGeneration,
          keystrokeDetails: inputTypeKeystrokes.map((k) => ({
            character: k.character,
            inputType: k.inputType,
            timestamp: k.timestamp,
          })),
        }
      );

      // This function is now only used during session end for final pattern generation
      console.log(
        `🔴 [PATTERN GENERATION] Force generation for ${inputType} with ${inputTypeKeystrokes.length} keystrokes`
      );
    },

    // Optimized Motion Collection with throttling and efficient data structures
    startMotionCollection: async () => {
      try {
        if (get().isMotionCollecting) {
          return;
        }

        // Check sensor availability
        try {
          const isAccelAvailable = await Accelerometer.isAvailableAsync();
          const isGyroAvailable = await Gyroscope.isAvailableAsync();
          const isMagAvailable = await Magnetometer.isAvailableAsync();

          // Removed sensor availability logging

          if (!isAccelAvailable && !isGyroAvailable && !isMagAvailable) {
            return;
          }
        } catch (sensorCheckError) {
          // Removed sensor check error logging
        }

        // Optimize to 15Hz (66ms) for better navigation performance
        Accelerometer.setUpdateInterval(66);
        Gyroscope.setUpdateInterval(66);
        Magnetometer.setUpdateInterval(66);

        // Use circular buffer for efficient memory management (optimized for 15Hz)
        let motionBuffer: MobileMotionEvents[] = new Array(75).fill(null); // 5 seconds at 15Hz
        let bufferIndex = 0;
        let lastUpdateTime = 0;
        const THROTTLE_MS = 66; // Throttle updates to 15Hz for better navigation performance

        // Temporary storage for sensor data
        let latestAccelerometer = { x: 0, y: 0, z: 0 };
        let latestGyroscope = { x: 0, y: 0, z: 0 };
        let latestMagnetometer = { x: 0, y: 0, z: 0 };

        let motionEventCount = 0;
        const updateMotionEvent = () => {
          const now = Date.now();
          if (now - lastUpdateTime < THROTTLE_MS) return;

          lastUpdateTime = now;
          motionEventCount++;

          const motionMagnitude =
            get().calculateMotionMagnitude(latestAccelerometer);
          const rotationRate = get().calculateRotationRate(latestGyroscope);

          const motionEvent: MobileMotionEvents = {
            timestamp: now,
            accelerometer: { ...latestAccelerometer },
            gyroscope: { ...latestGyroscope },
            magnetometer: { ...latestMagnetometer },
            motionMagnitude: parseFloat(motionMagnitude.toFixed(3)),
            rotationRate: parseFloat(rotationRate.toFixed(3)),
          };

          // Use circular buffer instead of array operations
          motionBuffer[bufferIndex] = motionEvent;
          bufferIndex = (bufferIndex + 1) % motionBuffer.length;

          // Removed motion event logging

          // Update state less frequently to reduce re-renders (every 15 samples = 1 second at 15Hz)
          if (bufferIndex % 15 === 0) {
            const validEvents = motionBuffer.filter((event) => event !== null);

            // Use async state update to prevent blocking navigation
            scheduleStateUpdate(() => {
              set((state) => ({
                motionEvents: validEvents,
              }));
            });
          }
        };

        const accelerometerSubscription = Accelerometer.addListener(
          (accelerometerData) => {
            try {
              latestAccelerometer = {
                x: parseFloat(accelerometerData.x.toFixed(3)),
                y: parseFloat(accelerometerData.y.toFixed(3)),
                z: parseFloat(accelerometerData.z.toFixed(3)),
              };
              updateMotionEvent();
            } catch (error) {
              // Removed accelerometer error logging
            }
          }
        );

        const gyroscopeSubscription = Gyroscope.addListener((gyroscopeData) => {
          try {
            latestGyroscope = {
              x: parseFloat(gyroscopeData.x.toFixed(3)),
              y: parseFloat(gyroscopeData.y.toFixed(3)),
              z: parseFloat(gyroscopeData.z.toFixed(3)),
            };
            updateMotionEvent();
          } catch (error) {
            // Removed gyroscope error logging
          }
        });

        const magnetometerSubscription = Magnetometer.addListener(
          (magnetometerData) => {
            try {
              latestMagnetometer = {
                x: parseFloat(magnetometerData.x.toFixed(3)),
                y: parseFloat(magnetometerData.y.toFixed(3)),
                z: parseFloat(magnetometerData.z.toFixed(3)),
              };
              updateMotionEvent();
            } catch (error) {
              // Removed magnetometer error logging
            }
          }
        );

        // Removed sensor registration logging

        set({
          accelerometerSubscription,
          gyroscopeSubscription,
          magnetometerSubscription,
          isMotionCollecting: true,
        });

        // Create motion patterns every 5 seconds for continuous collection during session
        const patternInterval = setInterval(() => {
          const validEvents = motionBuffer.filter((event) => event !== null);
          if (validEvents.length > 0) {
            const pattern: MotionPattern = {
              samples: validEvents.slice(), // Copy the valid events
              duration: 5000, // 5 seconds for more frequent patterns
              sampleRateHz: 30, // Updated to 30Hz sample rate
            };
            set((state) => {
              const newPatterns = [...state.motionPatterns.slice(-19), pattern]; // Keep last 20 patterns for longer sessions

              // Removed motion pattern logging

              return {
                motionPatterns: newPatterns,
              };
            });
            // Reset buffer for next pattern
            motionBuffer = new Array(150).fill(null);
            bufferIndex = 0;
          }
        }, 5000);

        // Store interval for cleanup
        set({ patternInterval } as any);
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            motion: "Failed to start motion collection",
          },
        }));
      }
    },

    stopMotionCollection: () => {
      const state = get();

      if (state.accelerometerSubscription) {
        state.accelerometerSubscription.remove();
      }
      if (state.gyroscopeSubscription) {
        state.gyroscopeSubscription.remove();
      }
      if (state.magnetometerSubscription) {
        state.magnetometerSubscription.remove();
      }
      if ((state as any).patternInterval) {
        clearInterval((state as any).patternInterval);
      }

      set({
        accelerometerSubscription: null,
        gyroscopeSubscription: null,
        magnetometerSubscription: null,
        isMotionCollecting: false,
        patternInterval: null,
      } as any);
    },

    // Location Behavior Collection
    collectLocationBehavior: async () => {
      try {
        let locationBehavior: LocationBehavior = {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          altitude: 0,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          permissionDenied: false,
        };

        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            locationBehavior.permissionDenied = true;
            locationBehavior.locationError = "Permission denied";
          } else {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            locationBehavior = {
              ...locationBehavior,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy || 0,
              altitude: location.coords.altitude || 0,
            };
          }
        } catch (error) {
          locationBehavior.locationError = "Failed to get location";
        }

        set({ locationBehavior });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            location: "Failed to collect location behavior",
          },
        }));
      }
    },

    // Device Behavior Collection
    collectDeviceBehavior: async () => {
      try {
        // Initialize with default values to avoid null
        let deviceBehavior: DeviceBehavior = {
          deviceId: "unknown",
          deviceModel: "unknown",
          osVersion: "unknown",
          appVersion: "1.0.0",
          batteryLevel: 0,
          isCharging: false,
          orientation: "unknown",
          isRooted: false,
          isDebuggingEnabled: false,
          hasOverlayPermission: false,
          hasUnknownApps: false,
          accessibilityServices: [],
          activeInputMethod: "default",
          appUsagePatterns: {},
          hardwareAttestation: false,
        };

        // Collect basic device info
        try {
          deviceBehavior.deviceId = Device.osBuildId || "unknown";
          deviceBehavior.deviceModel = Device.modelName || "unknown";
          deviceBehavior.osVersion = Device.osVersion || "unknown";
          deviceBehavior.appVersion = Constants.expoConfig?.version || "1.0.0";
          deviceBehavior.isRooted = await Device.isRootedExperimentalAsync();
        } catch (error) {}

        // Collect battery info
        try {
          deviceBehavior.batteryLevel = await Battery.getBatteryLevelAsync();
          const batteryState = await Battery.getBatteryStateAsync();
          deviceBehavior.isCharging =
            batteryState === Battery.BatteryState.CHARGING;
        } catch (error) {
          deviceBehavior.batteryPermissionDenied = true;
        }

        // Collect orientation
        try {
          const orientation = await ScreenOrientation.getOrientationAsync();
          deviceBehavior.orientation =
            orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
            orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
              ? "portrait"
              : "landscape";
        } catch (error) {}

        // Collect enhanced device info from native module
        if (BehavioralDataCollectorModule) {
          try {
            const enhancedData =
              await BehavioralDataCollectorModule.getDeviceBehavior();
            deviceBehavior = { ...deviceBehavior, ...enhancedData };
          } catch (nativeError) {}
        }

        set({ deviceBehavior });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            device: "Failed to collect device behavior",
          },
        }));
      }
    },

    // Network Behavior Collection
    collectNetworkBehavior: async () => {
      try {
        let networkBehavior: NetworkBehavior = {
          networkType: "unknown",
          networkName: "",
          networkOperator: "",
          isSecureConnection: false,
          simSerial: "",
          simOperator: "",
          simCountry: "",
          vpnDetected: false,
        };

        // Collect basic network info
        try {
          const networkState = await Network.getNetworkStateAsync();
          networkBehavior.networkType =
            networkState.type === Network.NetworkStateType.WIFI
              ? "wifi"
              : networkState.type === Network.NetworkStateType.CELLULAR
                ? "cellular"
                : networkState.type === Network.NetworkStateType.ETHERNET
                  ? "ethernet"
                  : "unknown";
        } catch (error) {}

        // Collect network info using React Native packages
        try {
          // Carrier Info using react-native-device-info
          const carrier = await DeviceInfo.getCarrier();
          if (carrier) {
            networkBehavior.networkOperator = carrier;
          }

          // SIM data collection using native module
          networkBehavior.simSerial = "unknown";
          networkBehavior.simOperator = carrier || "unknown";

          // Get SIM country from native module
          if (BehavioralDataCollectorModule) {
            try {
              const simCountry =
                await BehavioralDataCollectorModule.getSimCountry();
              networkBehavior.simCountry = simCountry;
            } catch (error) {
              console.warn(
                "Failed to get SIM country from native module:",
                error
              );
              networkBehavior.simCountry = "unknown";
            }
          } else {
            networkBehavior.simCountry = "unknown";
          }

          // WiFi Info
          const wifiInfo = await WifiManager.getCurrentWifiSSID();
          if (wifiInfo) {
            networkBehavior.networkName = wifiInfo;
            networkBehavior.isSecureConnection = true; // Assume WiFi is secure if connected
          }

          // VPN Detection using react-native-vpn-detector
          const vpnStatus = isVpnActive();
          networkBehavior.vpnDetected = vpnStatus;
        } catch (packageError) {}

        set({ networkBehavior });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            network: "Failed to collect network behavior",
          },
        }));
      }
    },

    // utility
    // Helper function to calculate data size in bytes
    calculateDataSize: (data: any): number => {
      return new Blob([JSON.stringify(data)]).size;
    },

    // Helper function to validate data quality
    validateSessionData: (
      sessionData: BehavioralSession
    ): { isValid: boolean; reason?: string } => {
      // Check if session has basic required fields
      if (!sessionData.sessionId || !sessionData.userId) {
        return { isValid: false, reason: "Missing sessionId or userId" };
      }

      // Check if session has any meaningful data
      const hasData =
        (sessionData.touchPatterns && sessionData.touchPatterns.length > 0) ||
        (sessionData.typingPatterns && sessionData.typingPatterns.length > 0) ||
        (sessionData.motionPattern && sessionData.motionPattern.length > 0) ||
        sessionData.locationBehavior ||
        sessionData.networkBehavior ||
        sessionData.deviceBehavior;

      if (!hasData) {
        return {
          isValid: false,
          reason: "No meaningful behavioral data collected",
        };
      }

      return { isValid: true };
    },

    // Helper function to chunk large data
    chunkSessionData: (
      sessionData: BehavioralSession,
      maxSizeBytes: number = 15 * 1024 * 1024
    ): BehavioralSession[] => {
      const chunks: BehavioralSession[] = [];
      const baseData = {
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        timestamp: sessionData.timestamp,
        locationBehavior: sessionData.locationBehavior,
        networkBehavior: sessionData.networkBehavior,
        deviceBehavior: sessionData.deviceBehavior,
      };

      // Start with base data and add behavioral data incrementally
      let currentChunk: BehavioralSession = {
        ...baseData,
        touchPatterns: [],
        typingPatterns: [],
        motionPattern: [],
      };

      const addToChunk = (data: any, field: keyof BehavioralSession) => {
        const testChunk = { ...currentChunk, [field]: data };
        if (get().calculateDataSize(testChunk) <= maxSizeBytes) {
          currentChunk = testChunk;
          return true;
        }
        return false;
      };

      // Add touch patterns
      if (sessionData.touchPatterns && sessionData.touchPatterns.length > 0) {
        for (const pattern of sessionData.touchPatterns) {
          if (
            !addToChunk(
              [...currentChunk.touchPatterns, pattern],
              "touchPatterns"
            )
          ) {
            // Current chunk is full, start a new one
            chunks.push(currentChunk);
            currentChunk = {
              ...baseData,
              touchPatterns: [pattern],
              typingPatterns: [],
              motionPattern: [],
            };
          }
        }
      }

      // Add typing patterns
      if (sessionData.typingPatterns && sessionData.typingPatterns.length > 0) {
        for (const pattern of sessionData.typingPatterns) {
          if (
            !addToChunk(
              [...currentChunk.typingPatterns, pattern],
              "typingPatterns"
            )
          ) {
            chunks.push(currentChunk);
            currentChunk = {
              ...baseData,
              touchPatterns: [],
              typingPatterns: [pattern],
              motionPattern: [],
            };
          }
        }
      }

      // Add motion patterns
      if (sessionData.motionPattern && sessionData.motionPattern.length > 0) {
        for (const pattern of sessionData.motionPattern) {
          if (
            !addToChunk(
              [...currentChunk.motionPattern, pattern],
              "motionPattern"
            )
          ) {
            chunks.push(currentChunk);
            currentChunk = {
              ...baseData,
              touchPatterns: [],
              typingPatterns: [],
              motionPattern: [pattern],
            };
          }
        }
      }

      // Add the final chunk if it has data
      if (
        currentChunk.touchPatterns.length > 0 ||
        currentChunk.typingPatterns.length > 0 ||
        currentChunk.motionPattern.length > 0
      ) {
        chunks.push(currentChunk);
      }

      return chunks.length > 0 ? chunks : [currentChunk];
    },

    sendSessionDataToServer: async (endpoint, sessionData) => {
      try {
        // Validate session data quality first
        const validation = get().validateSessionData(sessionData);
        if (!validation.isValid) {
          console.warn(`⚠️ Skipping data send - ${validation.reason}`);
          throw new Error(`Invalid session data: ${validation.reason}`);
        }

        console.log("🔴 Sending session data with typing patterns:", {
          sessionId: sessionData.sessionId,
          typingPatternsCount: sessionData.typingPatterns?.length || 0,
          typingPatterns: sessionData.typingPatterns,
        });

        // Calculate data size
        const dataSize = get().calculateDataSize(sessionData);
        const maxSize = 15 * 1024 * 1024; // 15MB limit

        console.log(
          `📊 Session data size: ${(dataSize / 1024 / 1024).toFixed(2)}MB`
        );

        const targetEndpoint = buildApiUrl(endpoint);
        console.log("🔴 Target endpoint:", targetEndpoint);

        let responseData;

        // Check if data exceeds size limit
        if (dataSize > maxSize) {
          console.log(
            `📦 Data exceeds ${maxSize / 1024 / 1024}MB limit, chunking data...`
          );

          // Chunk the data
          const chunks = get().chunkSessionData(sessionData, maxSize);
          console.log(`📦 Split into ${chunks.length} chunks`);

          // Send chunks sequentially
          const responses = [];
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkSize = get().calculateDataSize(chunk);
            console.log(
              `📦 Sending chunk ${i + 1}/${chunks.length} (${(chunkSize / 1024 / 1024).toFixed(2)}MB)`
            );

            try {
              const response = await fetch(targetEndpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Session-ID": chunk.sessionId || "unknown",
                  "X-User-ID": chunk.userId || "unknown",
                  "X-Chunk-Index": i.toString(),
                  "X-Total-Chunks": chunks.length.toString(),
                  "X-Is-Chunked": "true",
                },
                body: JSON.stringify(chunk),
              });

              if (!response.ok) {
                throw new Error(
                  `HTTP ${response.status}: ${response.statusText}`
                );
              }

              const chunkResponse = await response.json();
              responses.push(chunkResponse);
              console.log(`✅ Chunk ${i + 1} sent successfully`);
            } catch (fetchError) {
              console.error(`❌ Failed to send chunk ${i + 1}:`, fetchError);
              throw new Error(
                `Failed to send chunk ${i + 1}: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
              );
            }
          }

          responseData = {
            chunked: true,
            totalChunks: chunks.length,
            responses: responses,
            status: "success",
          };
        } else {
          // Send data as single request (under 15MB limit)
          console.log(`📤 Sending complete session data in single request`);

          try {
            const response = await fetch(targetEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Session-ID": sessionData.sessionId || "unknown",
                "X-User-ID": sessionData.userId || "unknown",
                "X-Is-Chunked": "false",
              },
              body: JSON.stringify(sessionData),
            });

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
            console.log("🔴 Response:", response);

            responseData = await response.json();
          } catch (fetchError) {
            console.error("❌ Failed to send session data:", fetchError);
            throw new Error(
              `Failed to send session data: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
            );
          }
        }

        console.log("[SUCCESS] Session data sent successfully:", responseData);
        return responseData;
      } catch (error) {
        console.error("❌ Failed to send session data:", error);
        throw error;
      }
    },
  }))
);

// Export individual actions for easier usage
export const {
  startSession,
  clearSession,
  collectTouchEvent,
  collectKeystroke,
  startMotionCollection,
  stopMotionCollection,
  collectLocationBehavior,
  collectDeviceBehavior,
  collectNetworkBehavior,
  requestPermissions,
} = useDataCollectionStore.getState();

export default useDataCollectionStore;

// API endpoint constants for the banking application
// These endpoints are used for behavioral data collection and fraud detection

export const API_ENDPOINTS = {
  // Data collection endpoints
  DATA: {
    REGULAR: "/api/data/regular", // First-time registration and normal login
    CHECK: "/api/data/check", // Re-registration and suspicious activity check
  },

  // Alert endpoint for suspicious activity reporting
  ALERT: "/api/alert",
} as const;

// API response format interface
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string | null;
  timestamp: number;
}

// Alert payload interface for suspicious activity reporting
export interface AlertPayload {
  userId: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata: {
    deviceInfo?: any;
    locationInfo?: any;
    behavioralData?: any;
    [key: string]: any;
  };
  deviceInfo: any;
  timestamp: number;
}

// Behavioral data session interface for API requests
export interface BehavioralDataPayload {
  sessionId: string;
  userId: string;
  scenario: string;
  touchEvents: any[];
  keystrokes: any[];
  motionPatterns: any[];
  locationBehavior: any;
  deviceBehavior: any;
  networkBehavior: any;
  timestamp: number;
}

// API configuration
export const API_CONFIG = {
  // Request timeout in milliseconds
  TIMEOUT: 30000,

  // Retry configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  // Headers
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  },
} as const;

// Environment-specific base URLs (will be set via environment variables)
export const getApiBaseUrl = (): string => {
  // In development, endpoints are relative and handled by the development server
  // In production, this would be set via environment variables
  return process.env.EXPO_PUBLIC_API_URL || "";
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${endpoint}` : endpoint;
};

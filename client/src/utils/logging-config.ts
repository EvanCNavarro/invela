/**
 * Centralized logging configuration
 * 
 * This file allows controlling log verbosity without modifying logger implementation
 */

// Define verbosity levels for different parts of the application
export interface LoggingConfig {
  // Form data management & updates
  formDataManager: {
    debug: boolean;
    fieldUpdates: boolean;    // Updates to individual fields
    dataSaving: boolean;      // Save operations
    serverSync: boolean;      // Timestamp synchronization logs
    validationErrors: boolean; // Validation errors
  };
  // Navigation and rendering
  uiComponents: {
    navigation: boolean;      // Section navigation
    rendering: boolean;       // Component rendering
    progressTracking: boolean; // Progress bar and section status
  };
  // Performance monitoring
  performance: {
    metrics: boolean;         // Performance metrics
    timeouts: boolean;        // Timeout operations
    rendering: boolean;       // Render performance
  };
  // General logging (default category)
  general: {
    debug: boolean;
    info: boolean;
    warn: boolean;
  };
  // Enable all error messages regardless of other settings
  alwaysShowErrors: boolean;
}

// Default configuration for production builds
const PRODUCTION_CONFIG: LoggingConfig = {
  formDataManager: {
    debug: false,
    fieldUpdates: false,
    dataSaving: false,
    serverSync: false,
    validationErrors: true
  },
  uiComponents: {
    navigation: false,
    rendering: false,
    progressTracking: false
  },
  performance: {
    metrics: false,
    timeouts: false,
    rendering: false
  },
  general: {
    debug: false,
    info: false,
    warn: true
  },
  alwaysShowErrors: true
};

// Minimal logging for development to maximize performance
const DEVELOPMENT_CONFIG: LoggingConfig = {
  formDataManager: {
    debug: false,
    fieldUpdates: false,
    dataSaving: false,
    serverSync: false,
    validationErrors: false // Only enable when debugging validation issues
  },
  uiComponents: {
    navigation: false,
    rendering: false,
    progressTracking: false
  },
  performance: {
    metrics: false, // Performance metrics can be noisy too
    timeouts: false,
    rendering: false
  },
  general: {
    debug: false,
    info: false,
    warn: true
  },
  alwaysShowErrors: true // Keep errors enabled for troubleshooting
};

// Export the appropriate configuration based on environment
export const loggingConfig = 
  process.env.NODE_ENV === 'production' 
    ? PRODUCTION_CONFIG 
    : DEVELOPMENT_CONFIG;

// Function to check if a particular log should be shown
export function shouldLog(category: keyof LoggingConfig, subcategory?: string): boolean {
  if (!loggingConfig[category]) {
    return false;
  }
  
  if (subcategory && typeof (loggingConfig[category] as any)[subcategory] === 'boolean') {
    return (loggingConfig[category] as any)[subcategory];
  }
  
  return true;
}

// Special case for errors which can have their own override
export function shouldLogError(): boolean {
  return loggingConfig.alwaysShowErrors;
}
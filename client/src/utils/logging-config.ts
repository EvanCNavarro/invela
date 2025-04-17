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
    dataSaving: false,  // Disabled to reduce console noise
    serverSync: false,
    validationErrors: true
  },
  uiComponents: {
    navigation: false,
    rendering: false,
    progressTracking: false
  },
  performance: {
    metrics: false,    // Disabled to reduce console noise
    timeouts: false,
    rendering: false
  },
  general: {
    debug: false,
    info: false,       // Disabled to reduce console noise
    warn: true
  },
  alwaysShowErrors: true
};

// Reduced logging for development to improve performance
const DEVELOPMENT_CONFIG: LoggingConfig = {
  formDataManager: {
    debug: false,      // Disabled to reduce console noise
    fieldUpdates: false, // Disabled to reduce console noise
    dataSaving: false,  // Disabled to reduce console noise
    serverSync: false,  // Disabled to reduce console noise
    validationErrors: true
  },
  uiComponents: {
    navigation: false,  // Disabled to reduce console noise
    rendering: false,   // Disabled to reduce console noise
    progressTracking: false // Disabled to reduce console noise
  },
  performance: {
    metrics: true,      // Keep this enabled to monitor performance
    timeouts: false,    // Disabled to reduce console noise
    rendering: false    // Disabled to reduce console noise
  },
  general: {
    debug: false,      // Disabled to reduce console noise
    info: false,       // Disabled to reduce console noise
    warn: true
  },
  alwaysShowErrors: true
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
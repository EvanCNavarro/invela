/**
 * Risk Score Logger
 * 
 * A specialized logger for risk score module that provides consistent
 * logging with tagged categories for improved debugging and traceability.
 * 
 * Extended with specialized methods for tracking risk score configuration
 * changes, dimension ordering, save operations, and data persistence.
 * 
 * Usage:
 * import riskScoreLogger from '@/lib/risk-score-logger';
 * 
 * riskScoreLogger.log('init', 'Initializing risk score module');
 * riskScoreLogger.warn('websocket', 'Received unexpected data format', data);
 * riskScoreLogger.error('persist', 'Failed to save configuration', error);
 * riskScoreLogger.logDimensionsChanged(oldDimensions, newDimensions, 'drag-operation');
 * riskScoreLogger.logSaveAttempt(prioritiesData);
 */

// Type to avoid importing circular dependencies
interface RiskDimension {
  id: string;
  name: string;
  color: string;
  value: number;
  weight: number;
  description: string;
}

interface RiskPriorities {
  dimensions: RiskDimension[];
  riskAcceptanceLevel?: number;
  lastUpdated?: string;
}

// Define valid tag types to ensure type safety
type LogTag = 
  | 'init' 
  | 'data' 
  | 'data:hook' 
  | 'persist' 
  | 'persist:service' 
  | 'websocket' 
  | 'websocket:service'
  | 'score' 
  | 'priority'
  | 'ui' 
  | 'gauge' 
  | 'radar' 
  | 'config' 
  | 'save'
  | 'fetch'
  | 'default';

// Log tag colors for better console visualization
const tagColors: Record<LogTag, string> = {
  'init': '#3498db',      // Blue
  'data': '#2ecc71',      // Green
  'data:hook': '#27ae60', // Darker Green
  'persist': '#e74c3c',   // Red
  'persist:service': '#c0392b', // Darker Red
  'websocket': '#9b59b6', // Purple
  'websocket:service': '#8e44ad', // Darker Purple
  'score': '#f39c12',     // Orange
  'priority': '#f1c40f',  // Yellow
  'ui': '#1abc9c',        // Teal
  'gauge': '#16a085',     // Darker Teal
  'radar': '#3498db',     // Blue
  'config': '#34495e',    // Dark Blue
  'save': '#e91e63',      // Pink
  'fetch': '#607d8b',     // Blue Gray
  'default': '#7f8c8d'    // Gray
};

// Message prefix for easy identification
const LOG_PREFIX = '[RiskScore]';

/**
 * Risk Score Logger Class
 * Provides consistent, specialized logging for the risk score module
 */
class RiskScoreLogger {
  private debugMode: boolean;
  private showDiff: boolean;
  private enabledTags: Record<string, boolean>;

  constructor() {
    // Initialize with sensible defaults
    this.debugMode = import.meta.env.DEV || false;
    this.showDiff = true;
    this.enabledTags = {};

    // Log the logger initialization in development only
    if (this.debugMode) {
      console.log('Risk Score Logger initialized:', {
        showDiff: this.showDiff,
        debugMode: this.debugMode,
        enabledTags: this.enabledTags
      });
    }
  }

  /**
   * Log an informational message with optional data
   * @param tag Category tag for the message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  log(tag: string | LogTag, message: string, data?: any): void {
    if (!this.debugMode || (Object.keys(this.enabledTags).length > 0 && !this.enabledTags[tag])) {
      return;
    }

    // Cast to LogTag or use default
    const safeTag = (Object.keys(tagColors).includes(tag) ? tag : 'default') as LogTag;
    const color = tagColors[safeTag];
    const formattedTag = `%c${LOG_PREFIX}:${tag}%c`;
    
    if (data) {
      console.log(formattedTag, `color: ${color}; font-weight: bold`, 'color: inherit', message, data);
    } else {
      console.log(formattedTag, `color: ${color}; font-weight: bold`, 'color: inherit', message);
    }
  }

  /**
   * Log a warning message with optional data
   * @param tag Category tag for the message
   * @param message The warning message to log
   * @param data Optional data to include in the log
   */
  warn(tag: string | LogTag, message: string, data?: any): void {
    // Warnings are always logged, even in disabled tags
    const safeTag = (Object.keys(tagColors).includes(tag) ? tag : 'default') as LogTag;
    const color = tagColors[safeTag];
    const formattedTag = `%c${LOG_PREFIX}:${tag}:WARN%c`;
    
    if (data) {
      console.warn(formattedTag, `color: ${color}; font-weight: bold`, 'color: inherit', message, data);
    } else {
      console.warn(formattedTag, `color: ${color}; font-weight: bold`, 'color: inherit', message);
    }
  }

  /**
   * Log an error message with optional error object
   * @param tag Category tag for the message
   * @param message The error message to log
   * @param error Optional error object or data to include
   */
  error(tag: string | LogTag, message: string, error?: any): void {
    // Errors are always logged, even in disabled tags
    const safeTag = (Object.keys(tagColors).includes(tag) ? tag : 'default') as LogTag;
    const color = tagColors[safeTag];
    const formattedTag = `%c${LOG_PREFIX}:${tag}:ERROR%c`;
    
    if (error) {
      console.error(formattedTag, `color: ${color}; font-weight: bold`, 'color: inherit', message, error);
    } else {
      console.error(formattedTag, `color: ${color}; font-weight: bold`, 'color: inherit', message);
    }
  }

  /**
   * Log fetch errors with standardized format
   * @param error The error that occurred
   */
  logFetchError(error: any): void {
    this.error('fetch', 'Error fetching risk score data', error);
  }

  /**
   * Log when dimensions have changed with detailed tracking
   * @param oldDimensions Previous dimensions
   * @param newDimensions New dimensions 
   * @param operation The operation that caused the change
   */
  logDimensionsChanged(oldDimensions: RiskDimension[], newDimensions: RiskDimension[], operation: string): void {
    if (!this.debugMode) return;
    
    const changes: { id: string, oldIndex?: number, newIndex?: number, oldWeight?: number, newWeight?: number }[] = [];
    
    // Track position changes
    oldDimensions.forEach((oldDim, oldIndex) => {
      const newIndex = newDimensions.findIndex(d => d.id === oldDim.id);
      const newDim = newDimensions[newIndex];
      
      if (newIndex !== oldIndex || (newDim && oldDim.weight !== newDim.weight)) {
        changes.push({
          id: oldDim.id,
          oldIndex,
          newIndex,
          oldWeight: oldDim.weight,
          newWeight: newDim?.weight
        });
      }
    });
    
    if (changes.length > 0) {
      this.log('priority', `Dimensions changed (${operation})`, {
        changes,
        oldOrder: oldDimensions.map(d => d.id),
        newOrder: newDimensions.map(d => d.id)
      });
    }
  }

  /**
   * Compare dimensions between two sources for troubleshooting
   * @param tag Category tag for the message
   * @param sourceAName Name of the first source
   * @param sourceADimensions Dimensions from the first source
   * @param sourceBName Name of the second source
   * @param sourceBDimensions Dimensions from the second source
   */
  compareDimensions(
    tag: string,
    sourceAName: string, 
    sourceADimensions: RiskDimension[], 
    sourceBName: string, 
    sourceBDimensions: RiskDimension[]
  ): void {
    if (!this.debugMode) return;
    
    const orderA = sourceADimensions.map(d => d.id);
    const orderB = sourceBDimensions.map(d => d.id);
    const mismatch = JSON.stringify(orderA) !== JSON.stringify(orderB);
    
    this.log(tag, `Comparing dimensions: ${sourceAName} vs ${sourceBName} ${mismatch ? '(MISMATCH)' : '(MATCH)'}`, {
      [`${sourceAName}Order`]: orderA,
      [`${sourceBName}Order`]: orderB,
      mismatch,
      [`${sourceAName}WeightSum`]: sourceADimensions.reduce((sum, d) => sum + d.weight, 0),
      [`${sourceBName}WeightSum`]: sourceBDimensions.reduce((sum, d) => sum + d.weight, 0)
    });
  }

  /**
   * Log an attempt to save risk data
   * @param data The data being saved
   */
  logSaveAttempt(data: any): void {
    this.log('save', 'Attempting to save risk data', {
      timestamp: new Date().toISOString(),
      data: {
        dimensionsCount: data.dimensions?.length,
        riskAcceptanceLevel: data.riskAcceptanceLevel,
        dimensionOrder: data.dimensions?.map((d: RiskDimension) => d.id)
      }
    });
  }

  /**
   * Log a successful save operation
   * @param data The data that was saved
   * @param response The server response
   */
  logSaveSuccess(data: any, response: any): void {
    this.log('save', 'Successfully saved risk data', {
      timestamp: new Date().toISOString(),
      saved: {
        dimensionsCount: data.dimensions?.length,
        riskAcceptanceLevel: data.riskAcceptanceLevel
      },
      response
    });
  }

  /**
   * Log a failed save operation
   * @param data The data that failed to save
   * @param error The error that occurred
   */
  logSaveError(data: any, error: any): void {
    this.error('save', 'Failed to save risk data', {
      timestamp: new Date().toISOString(),
      attempted: {
        dimensionsCount: data.dimensions?.length,
        riskAcceptanceLevel: data.riskAcceptanceLevel
      },
      error
    });
  }

  /**
   * Log a direct update (fallback) operation
   * @param data The data being updated directly
   */
  logDirectUpdate(data: any): void {
    this.log('persist', 'Performing direct update as fallback', {
      timestamp: new Date().toISOString(),
      data: {
        dimensionsCount: data.dimensions?.length,
        riskAcceptanceLevel: data.riskAcceptanceLevel,
        dimensionOrder: data.dimensions?.map((d: RiskDimension) => d.id)
      }
    });
  }

  /**
   * Enable specific log tags
   * @param tags Array of tags to enable
   */
  enableTags(tags: string[]): void {
    tags.forEach(tag => {
      this.enabledTags[tag] = true;
    });
  }

  /**
   * Disable specific log tags
   * @param tags Array of tags to disable
   */
  disableTags(tags: string[]): void {
    tags.forEach(tag => {
      delete this.enabledTags[tag];
    });
  }

  /**
   * Enable all logging
   */
  enableAll(): void {
    this.enabledTags = {};
  }

  /**
   * Disable all logging except warnings and errors
   */
  disableAll(): void {
    this.debugMode = false;
  }

  /**
   * Toggle showing data diffs in object logging
   * @param show Whether to show diffs
   */
  setShowDiff(show: boolean): void {
    this.showDiff = show;
  }

  /**
   * Set debug mode (enable/disable all log messages)
   * @param enabled Whether debug mode is enabled
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

// Create and export a singleton instance
const riskScoreLogger = new RiskScoreLogger();

// In development, expose the logger on window for console debugging
if (import.meta.env.DEV) {
  (window as any).__riskScoreLogger = riskScoreLogger;
}

export default riskScoreLogger;
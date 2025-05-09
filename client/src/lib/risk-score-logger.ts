/**
 * Risk Score Logger
 * 
 * A specialized logger for risk score module that provides consistent
 * logging with tagged categories for improved debugging and traceability.
 * 
 * Usage:
 * import riskScoreLogger from '@/lib/risk-score-logger';
 * 
 * riskScoreLogger.log('init', 'Initializing risk score module');
 * riskScoreLogger.warn('websocket', 'Received unexpected data format', data);
 * riskScoreLogger.error('persist', 'Failed to save configuration', error);
 */

// Log tag colors for better console visualization
const tagColors = {
  'init': '#3498db',      // Blue
  'data': '#2ecc71',      // Green
  'data:hook': '#27ae60', // Darker Green
  'persist': '#e74c3c',   // Red
  'persist:service': '#c0392b', // Darker Red
  'websocket': '#9b59b6', // Purple
  'score': '#f39c12',     // Orange
  'priority': '#f1c40f',  // Yellow
  'ui': '#1abc9c',        // Teal
  'gauge': '#16a085',     // Darker Teal
  'radar': '#3498db',     // Blue
  'config': '#34495e',    // Dark Blue
  'default': '#7f8c8d'    // Gray
};

// Message prefix for easy identification
const LOG_PREFIX = '[RiskScore]';

/**
 * Risk Score Logger Class
 * Provides consistent logging for the risk score module
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
      console.log('Logger instance:', {
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
  log(tag: string, message: string, data?: any): void {
    if (!this.debugMode || (Object.keys(this.enabledTags).length > 0 && !this.enabledTags[tag])) {
      return;
    }

    const color = tagColors[tag] || tagColors.default;
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
  warn(tag: string, message: string, data?: any): void {
    // Warnings are always logged, even in disabled tags
    const color = tagColors[tag] || tagColors.default;
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
  error(tag: string, message: string, error?: any): void {
    // Errors are always logged, even in disabled tags
    const color = tagColors[tag] || tagColors.default;
    const formattedTag = `%c${LOG_PREFIX}:${tag}:ERROR%c`;
    
    if (error) {
      console.error(formattedTag, `color: ${color}; font-weight: bold`, 'color: inherit', message, error);
    } else {
      console.error(formattedTag, `color: ${color}; font-weight: bold`, 'color: inherit', message);
    }
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
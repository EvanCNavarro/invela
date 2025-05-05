/**
 * Standardized Logger
 * 
 * This module provides a standardized logging interface for the application
 * with consistent formatting, log levels, and optional detail inclusion.
 * 
 * OODA Loop Implementation:
 * - Observe: Track state changes and important events
 * - Orient: Categorize log messages by severity and context
 * - Decide: Filter logs based on environment and configuration
 * - Act: Output meaningful, actionable logs
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  // Include timestamp with log message
  includeTimestamp?: boolean;
  // Show detailed object information when true
  showDetails?: boolean;
  // Tags to include with the log message
  tags?: string[];
}

// Default log options
const defaultOptions: LogOptions = {
  includeTimestamp: true,
  showDetails: false,
  tags: []
};

/**
 * Standardized Logger - KISS implementation with everything needed and nothing more
 */
class StandardizedLogger {
  private context: string;
  private logLevel: number;
  
  // Log level numeric values for comparison
  private static LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  
  // Environment-specific default level - safely determine production mode
  private static DEFAULT_LEVEL = 
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production') ? 'info' : 'debug';
  
  constructor(context: string) {
    this.context = context;
    
    // Determine log level - safely access environment variables
    let configuredLevel: string;
    
    // Try to read from import.meta (Vite) first
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      configuredLevel = import.meta.env.VITE_LOG_LEVEL || StandardizedLogger.DEFAULT_LEVEL;
    } else {
      // Fallback to default level
      configuredLevel = StandardizedLogger.DEFAULT_LEVEL;
    }
    
    this.logLevel = StandardizedLogger.LOG_LEVELS[configuredLevel as LogLevel] || StandardizedLogger.LOG_LEVELS.info;
  }
  
  /**
   * General log method that handles all log levels
   * DRY Principle: Single implementation of the logging logic
   */
  private log(level: LogLevel, message: string, data?: any, options?: LogOptions): void {
    // Skip if log level is below the configured threshold
    if (StandardizedLogger.LOG_LEVELS[level] < this.logLevel) {
      return;
    }
    
    // Merge with default options
    const opts = { ...defaultOptions, ...options };
    
    // Format timestamp if needed
    const timestamp = opts.includeTimestamp ? new Date().toISOString() : '';
    const timestampPrefix = timestamp ? `[${timestamp}] ` : '';
    
    // Include context with consistent formatting
    const contextMsg = this.context ? `[${this.context}] ` : '';
    
    // Format tags if present
    const tagsStr = opts.tags && opts.tags.length > 0 ? 
      opts.tags.map(tag => `[${tag}]`).join(' ') + ' ' : '';
    
    // Build the complete log message
    const fullMessage = `${timestampPrefix}${contextMsg}${tagsStr}${message}`;
    
    // Select the appropriate console method based on level
    // KISS: Direct mapping to standard console methods
    switch (level) {
      case 'debug':
        console.debug(fullMessage, data || '');
        break;
      case 'info':
        console.log(fullMessage, data || '');
        break;
      case 'warn':
        console.warn(fullMessage, data || '');
        break;
      case 'error':
        console.error(fullMessage, data || '');
        break;
    }
  }
  
  /**
   * Log state changes only if values actually changed
   * Reduces log volume by eliminating redundant updates
   */
  public logStateChange<T>(label: string, oldValue: T, newValue: T): void {
    // Skip logging if values are equal
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      return;
    }
    
    // Log actual changes with old and new values
    this.info(`${label} changed:`, {
      from: oldValue,
      to: newValue
    });
  }
  
  // Standard log methods
  public debug(message: string, data?: any, options?: LogOptions): void {
    this.log('debug', message, data, options);
  }
  
  public info(message: string, data?: any, options?: LogOptions): void {
    this.log('info', message, data, options);
  }
  
  public warn(message: string, data?: any, options?: LogOptions): void {
    this.log('warn', message, data, options);
  }
  
  public error(message: string, data?: any, options?: LogOptions): void {
    this.log('error', message, data, options);
  }
}

/**
 * Get a logger instance for a specific context
 * Factory function following the DRY principle
 */
export default function getStandardizedLogger(context: string): StandardizedLogger {
  return new StandardizedLogger(context);
}

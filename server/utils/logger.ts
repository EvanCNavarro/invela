/**
 * Logger Utility
 * 
 * This module provides a standardized logging interface for the application,
 * ensuring consistent log formats and levels across all components.
 * 
 * Features:
 * - Structured logging with JSON formatting
 * - Support for different log levels (trace, debug, info, warn, error)
 * - Module-specific logging with child loggers
 * - Context enrichment for tracking request flows
 */

type LogContext = Record<string, any>;

/**
 * Basic logger implementation with child logger support
 */
class Logger {
  private module: string;
  private context: LogContext;

  constructor(module: string = 'App', context: LogContext = {}) {
    this.module = module;
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   * 
   * @param context Additional context for the child logger
   * @returns A new logger instance with merged context
   */
  child(context: LogContext): Logger {
    return new Logger(
      context.module || this.module,
      { ...this.context, ...context }
    );
  }

  /**
   * Format a log message with timestamp, module, and context
   * 
   * @param level Log level
   * @param message Log message
   * @param data Optional additional data
   * @returns Formatted log string
   */
  private formatLog(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const context = { ...this.context, ...(data || {}) };
    const contextStr = Object.keys(context).length > 0 
      ? JSON.stringify(context) 
      : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${message} ${contextStr}`;
  }

  /**
   * Log a message at TRACE level
   * 
   * @param message Log message
   * @param data Optional additional data
   */
  trace(message: string, data?: any): void {
    console.log(this.formatLog('trace', message, data));
  }

  /**
   * Log a message at DEBUG level
   * 
   * @param message Log message
   * @param data Optional additional data
   */
  debug(message: string, data?: any): void {
    console.log(this.formatLog('debug', message, data));
  }

  /**
   * Log a message at INFO level
   * 
   * @param message Log message
   * @param data Optional additional data
   */
  info(message: string, data?: any): void {
    console.log(this.formatLog('info', message, data));
  }

  /**
   * Log a message at WARN level
   * 
   * @param message Log message
   * @param data Optional additional data
   */
  warn(message: string, data?: any): void {
    console.warn(this.formatLog('warn', message, data));
  }

  /**
   * Log a message at ERROR level
   * 
   * @param message Log message
   * @param data Optional additional data
   */
  error(message: string, data?: any): void {
    console.error(this.formatLog('error', message, data));
  }
}

// Create and export the root logger instance
export const logger = new Logger();

// Export the Logger class for type checking
export type { Logger };
/**
 * Logger utility for consistent logging across the application
 */

/**
 * LogLevel type representing different logging levels
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger class for structured logging
 */
class Logger {
  /**
   * Log at debug level
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }
  
  /**
   * Log at info level
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }
  
  /**
   * Log at warn level
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }
  
  /**
   * Log at error level
   */
  error(message: string, meta?: Record<string, any>): void {
    this.log('error', message, meta);
  }
  
  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const formattedMeta = meta ? JSON.stringify(meta) : '';
    
    // Format: [2025-05-01T19:00:00.000Z] [ERROR] Message {"key":"value"}
    console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, formattedMeta);
  }
}

/**
 * Export a single logger instance for use throughout the application
 */
export const logger = new Logger();
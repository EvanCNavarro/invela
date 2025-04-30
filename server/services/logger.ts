/**
 * Enhanced Logging Service
 * 
 * This service provides consistent and structured logging across the application
 * with support for different log levels, contextual information, and formatting.
 */

export class Logger {
  private prefix: string;
  
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  
  /**
   * Log informational message
   * 
   * @param message The message to log
   * @param args Additional data to include in the log
   */
  info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }
  
  /**
   * Log warning message
   * 
   * @param message The message to log
   * @param args Additional data to include in the log
   */
  warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }
  
  /**
   * Log error message
   * 
   * @param message The message to log
   * @param args Additional data to include in the log
   */
  error(message: string, ...args: any[]): void {
    this.log('ERROR', message, ...args);
  }
  
  /**
   * Log debug message (only in development)
   * 
   * @param message The message to log
   * @param args Additional data to include in the log
   */
  debug(message: string, ...args: any[]): void {
    // Only log debug messages in development
    if (process.env.NODE_ENV !== 'production') {
      this.log('DEBUG', message, ...args);
    }
  }
  
  /**
   * Internal method to format and output logs
   * 
   * @param level The log level
   * @param message The message to log
   * @param args Additional data to include in the log
   */
  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.prefix}]`;
    
    if (args.length === 0) {
      console.log(`${prefix} ${message}`);
    } else if (args.length === 1 && typeof args[0] === 'object') {
      // For a single object argument, format it nicely
      console.log(`${prefix} ${message}`, args[0]);
    } else {
      console.log(`${prefix} ${message}`, ...args);
    }
  }
}
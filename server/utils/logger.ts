/**
 * Logger Utility
 * 
 * This utility provides a consistent logging interface with different log levels
 * and context support for better debugging.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, any>;

export class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.namespace}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, context ? context : '');
        break;
      case 'info':
        console.info(formattedMessage, context ? context : '');
        break;
      case 'warn':
        console.warn(formattedMessage, context ? context : '');
        break;
      case 'error':
        console.error(formattedMessage, context ? context : '');
        break;
      default:
        console.log(formattedMessage, context ? context : '');
    }
  }
}

export default Logger;
/**
 * Enhanced logging service for debugging and monitoring
 * Provides a consistent interface for logging with contextual information
 */
export class LoggingService {
  private serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  /**
   * Log an informational message
   */
  info(message: string, context: Record<string, any> = {}) {
    console.log(`[${this.serviceName}] ${message}`, context);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context: Record<string, any> = {}) {
    console.warn(`[${this.serviceName}] WARNING: ${message}`, context);
  }
  
  /**
   * Log an error message
   */
  error(message: string, context: Record<string, any> = {}) {
    console.error(`[${this.serviceName}] ERROR: ${message}`, context);
  }
  
  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context: Record<string, any> = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${this.serviceName}] DEBUG: ${message}`, context);
    }
  }
  
  /**
   * Create a child logger with a sub-context
   */
  child(subContext: string): LoggingService {
    return new LoggingService(`${this.serviceName}:${subContext}`);
  }
}
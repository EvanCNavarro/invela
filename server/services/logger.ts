/**
 * Logger Service
 * 
 * A structured logging service that provides consistent formatting
 * and log levels for server-side logging.
 */
export class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**
   * Log an informational message
   */
  info(message: string, ...args: any[]): void {
    console.log(
      `[${new Date().toISOString()}] [INFO] [${this.prefix}]`,
      message,
      ...args
    );
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    console.warn(
      `[${new Date().toISOString()}] [WARN] [${this.prefix}]`,
      message,
      ...args
    );
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    console.error(
      `[${new Date().toISOString()}] [ERROR] [${this.prefix}]`,
      message,
      ...args
    );
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    console.debug(
      `[${new Date().toISOString()}] [DEBUG] [${this.prefix}]`,
      message,
      ...args
    );
  }
}
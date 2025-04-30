/**
 * Logger Service
 * 
 * Provides consistent logging throughout the application with context support
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogOptions {
  levels?: {
    debug?: boolean;
    info?: boolean;
    warn?: boolean;
    error?: boolean;
  };
}

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private prefix: string;
  private levels: Record<LogLevel, boolean>;

  constructor(prefix: string, options: LogOptions = {}) {
    this.prefix = prefix;
    this.levels = {
      debug: options.levels?.debug ?? process.env.NODE_ENV !== 'production',
      info: options.levels?.info ?? true,
      warn: options.levels?.warn ?? true,
      error: options.levels?.error ?? true,
    };
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    if (this.levels.debug) {
      console.debug(`[${this.prefix}] ${message}`, context || '');
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    if (this.levels.info) {
      console.log(`[${this.prefix}] ${message}`, context || '');
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.levels.warn) {
      console.warn(`[${this.prefix}] ${message}`, context || '');
    }
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext): void {
    if (this.levels.error) {
      console.error(`[${this.prefix}] ${message}`, context || '');
    }
  }
}

export default Logger;
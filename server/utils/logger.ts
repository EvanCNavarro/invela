/**
 * Unified Logger
 * 
 * A central logging utility that provides consistent formatting and levels
 * for all application logs. Implements proper log levels and contextual
 * information consistently across the application.
 * 
 * Usage:
 * import { logger } from '@/utils/logger';
 * 
 * logger.info('User logged in', { userId: 123 });
 * logger.error('Failed to process payment', { error: err.message, orderId: 456 });
 * 
 * // Create a child logger with context
 * const userLogger = logger.child({ module: 'UserService' });
 * userLogger.info('User profile updated', { userId: 123 });
 */

// Log levels in order of verbosity
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

// Current log level (can be configured from environment)
const currentLogLevel = (() => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  switch (envLevel) {
    case 'TRACE': return LogLevel.TRACE;
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    default: return LogLevel.INFO; // Default to INFO level
  }
})();

// The Logger interface type definition
export interface Logger {
  trace: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  child: (context: Record<string, any>) => Logger;
}

/**
 * Format a log message with timestamp, level, and structured data
 * 
 * @param level The log level as a string
 * @param message The main log message
 * @param context Context data to attach to all logs
 * @param data Optional structured data to include
 * @returns Formatted log entry
 */
function formatLogEntry(level: string, message: string, context: Record<string, any> = {}, data?: any): string {
  const timestamp = new Date().toISOString();
  const contextData = Object.keys(context).length > 0 ? { context, ...data } : data;
  
  // Add module name to log prefix if available
  const modulePrefix = context.module ? `[${context.module}] ` : '';
  
  return `[${timestamp}] [${level}] ${modulePrefix}${message}${contextData ? ` ${JSON.stringify(contextData)}` : ''}`;
}

/**
 * Determine if a message at the given level should be logged
 * based on the current log level setting
 */
function shouldLog(level: LogLevel): boolean {
  return level >= currentLogLevel;
}

/**
 * Create a logger instance with optional context
 * 
 * @param context Context data to attach to all logs from this logger
 * @returns A logger instance
 */
function createLogger(context: Record<string, any> = {}): Logger {
  return {
    trace: (message: string, data?: any) => {
      if (shouldLog(LogLevel.TRACE)) {
        console.log(formatLogEntry('TRACE', message, context, data));
      }
    },

    debug: (message: string, data?: any) => {
      if (shouldLog(LogLevel.DEBUG)) {
        console.log(formatLogEntry('DEBUG', message, context, data));
      }
    },

    info: (message: string, data?: any) => {
      if (shouldLog(LogLevel.INFO)) {
        console.log(formatLogEntry('INFO', message, context, data));
      }
    },

    warn: (message: string, data?: any) => {
      if (shouldLog(LogLevel.WARN)) {
        console.warn(formatLogEntry('WARN', message, context, data));
      }
    },

    error: (message: string, data?: any) => {
      if (shouldLog(LogLevel.ERROR)) {
        console.error(formatLogEntry('ERROR', message, context, data));
      }
    },
    
    child: (childContext: Record<string, any>) => {
      return createLogger({ ...context, ...childContext });
    }
  };
}

/**
 * The root logger instance
 */
export const logger = createLogger();

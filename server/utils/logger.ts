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

/**
 * Format a log message with timestamp, level, and structured data
 * 
 * @param level The log level as a string
 * @param message The main log message
 * @param data Optional structured data to include
 * @returns Formatted log entry
 */
function formatLogEntry(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}${data ? ` ${JSON.stringify(data)}` : ''}`;
}

/**
 * Determine if a message at the given level should be logged
 * based on the current log level setting
 */
function shouldLog(level: LogLevel): boolean {
  return level >= currentLogLevel;
}

/**
 * The logger interface with methods for each log level
 */
export const logger = {
  /**
   * Trace level logging - most verbose, for detailed debugging
   * Only enabled when LOG_LEVEL is set to TRACE
   */
  trace: (message: string, data?: any) => {
    if (shouldLog(LogLevel.TRACE)) {
      console.log(formatLogEntry('TRACE', message, data));
    }
  },

  /**
   * Debug level logging - for development information
   * Only enabled when LOG_LEVEL is set to DEBUG or TRACE
   */
  debug: (message: string, data?: any) => {
    if (shouldLog(LogLevel.DEBUG)) {
      console.log(formatLogEntry('DEBUG', message, data));
    }
  },

  /**
   * Info level logging - for general operational information
   * This is the default level
   */
  info: (message: string, data?: any) => {
    if (shouldLog(LogLevel.INFO)) {
      console.log(formatLogEntry('INFO', message, data));
    }
  },

  /**
   * Warning level logging - for potential issues that aren't errors
   */
  warn: (message: string, data?: any) => {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(formatLogEntry('WARN', message, data));
    }
  },

  /**
   * Error level logging - for actual errors that need attention
   */
  error: (message: string, data?: any) => {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(formatLogEntry('ERROR', message, data));
    }
  },
};

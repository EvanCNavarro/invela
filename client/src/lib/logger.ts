/**
 * Client-side Unified Logger
 * 
 * A central logging utility for the frontend that provides consistent formatting
 * and levels across all components. Implements proper log levels with
 * contextual information to improve debugging and reduce noise.
 * 
 * Usage:
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('User profile updated', { userId: 123 });
 * logger.error('Failed to load data', { error: err.message, component: 'UserList' });
 */

// Log levels in order of verbosity
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

/**
 * Determine if we're in a production environment
 * In production, default to higher log level (less verbose)
 */
const isProduction = import.meta.env.PROD;

// Current log level (can be configured)
const currentLogLevel = (() => {
  // Allow override with localStorage for debugging
  const localStorageLevel = localStorage.getItem('LOG_LEVEL')?.toUpperCase();
  if (localStorageLevel) {
    switch (localStorageLevel) {
      case 'TRACE': return LogLevel.TRACE;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
    }
  }

  // Default based on environment
  return isProduction ? LogLevel.INFO : LogLevel.DEBUG;
})();

/**
 * Format a log message with timestamp, level and structured data
 */
function formatLogEntry(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Determine if a message at the given level should be logged
 * based on the current log level setting
 */
function shouldLog(level: LogLevel): boolean {
  return level >= currentLogLevel;
}

/**
 * Apply styling to console output when possible
 */
function getStyleForLevel(level: string): string {
  switch (level) {
    case 'TRACE': return 'color: #6c757d';
    case 'DEBUG': return 'color: #17a2b8';
    case 'INFO': return 'color: #28a745';
    case 'WARN': return 'color: #ffc107; font-weight: bold';
    case 'ERROR': return 'color: #dc3545; font-weight: bold';
    default: return '';
  }
}

/**
 * The logger interface with methods for each log level
 */
export const logger = {
  /**
   * Trace level logging - most verbose, for fine-grained debugging
   * Only enabled when LOG_LEVEL is set to TRACE
   */
  trace: (message: string, data?: any) => {
    if (shouldLog(LogLevel.TRACE)) {
      console.log(
        `%c${formatLogEntry('TRACE', message)}`, 
        getStyleForLevel('TRACE'), 
        data
      );
    }
  },

  /**
   * Debug level logging - for development information
   * Enabled when LOG_LEVEL is set to DEBUG or TRACE
   */
  debug: (message: string, data?: any) => {
    if (shouldLog(LogLevel.DEBUG)) {
      console.log(
        `%c${formatLogEntry('DEBUG', message)}`, 
        getStyleForLevel('DEBUG'), 
        data
      );
    }
  },

  /**
   * Info level logging - for general operational information
   * This is the default level in production
   */
  info: (message: string, data?: any) => {
    if (shouldLog(LogLevel.INFO)) {
      console.log(
        `%c${formatLogEntry('INFO', message)}`, 
        getStyleForLevel('INFO'), 
        data
      );
    }
  },

  /**
   * Warning level logging - for potential issues that aren't errors
   */
  warn: (message: string, data?: any) => {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(
        `%c${formatLogEntry('WARN', message)}`, 
        getStyleForLevel('WARN'), 
        data
      );
    }
  },

  /**
   * Error level logging - for actual errors that need attention
   */
  error: (message: string, data?: any) => {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(
        `%c${formatLogEntry('ERROR', message)}`, 
        getStyleForLevel('ERROR'), 
        data
      );
    }
  },

  /**
   * Group related log messages together to reduce noise
   */
  group: (label: string, collapsed = false) => {
    if (collapsed) {
      console.groupCollapsed(label);
    } else {
      console.group(label);
    }
  },

  /**
   * End the current log group
   */
  groupEnd: () => {
    console.groupEnd();
  },
};

/**
 * Helper to create a component-specific logger
 * that prefixes all messages with the component name
 * 
 * @param componentName Name of the component using the logger
 * @returns A logger instance with component context
 */
export function createComponentLogger(componentName: string) {
  return {
    trace: (message: string, data?: any) => logger.trace(`[${componentName}] ${message}`, data),
    debug: (message: string, data?: any) => logger.debug(`[${componentName}] ${message}`, data),
    info: (message: string, data?: any) => logger.info(`[${componentName}] ${message}`, data),
    warn: (message: string, data?: any) => logger.warn(`[${componentName}] ${message}`, data),
    error: (message: string, data?: any) => logger.error(`[${componentName}] ${message}`, data),
    group: (label: string, collapsed = false) => logger.group(`[${componentName}] ${label}`, collapsed),
    groupEnd: () => logger.groupEnd(),
  };
}

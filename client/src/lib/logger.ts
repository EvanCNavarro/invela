/**
 * ========================================
 * Application Logger Utility
 * ========================================
 * 
 * Centralized logging utility for client-side debugging and monitoring.
 * Provides structured logging with context preservation and production optimization.
 * 
 * Key Features:
 * - Structured logging with consistent formatting
 * - Context preservation for debugging
 * - Production-safe logging levels
 * - Performance monitoring capabilities
 * - Integration with demo flow tracking
 * 
 * @module lib/logger
 * @version 1.0.0
 * @since 2025-05-25
 */

// ========================================
// TYPES & INTERFACES
// ========================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  module?: string;
}

// ========================================
// CONSTANTS
// ========================================

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
} as const;

// Only log warnings and errors in production
const PRODUCTION_LOG_LEVEL: LogLevel = 'warn';
const DEVELOPMENT_LOG_LEVEL: LogLevel = 'debug';

// ========================================
// LOGGER IMPLEMENTATION
// ========================================

class Logger {
  private currentLogLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.currentLogLevel = this.isProduction ? PRODUCTION_LOG_LEVEL : DEVELOPMENT_LOG_LEVEL;
  }

  /**
   * Checks if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLogLevel];
  }

  /**
   * Formats log message with consistent structure
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      return `${baseMessage} ${JSON.stringify(context)}`;
    }
    
    return baseMessage;
  }

  /**
   * Debug level logging - development only
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info level logging - general information
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  /**
   * Warning level logging - potential issues
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  /**
   * Error level logging - serious issues
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  /**
   * Performance timing utility
   */
  time(label: string): void {
    if (!this.isProduction) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (!this.isProduction) {
      console.timeEnd(label);
    }
  }
}

// ========================================
// EXPORTS
// ========================================

export const logger = new Logger();
export default logger;
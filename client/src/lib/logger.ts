/**
 * ========================================
 * Logger Utility - Application Logging System
 * ========================================
 * 
 * Centralized logging system for the enterprise risk assessment platform.
 * Provides namespace-based logging with multiple severity levels and
 * consistent output formatting for debugging and monitoring.
 * 
 * @module lib/logger
 * @version 1.0.0
 * @since 2025-05-23
 */

interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

/**
 * Creates a logger with the specified namespace
 * @param namespace The namespace for the logger
 * @returns A logger object
 */
export function createLogger(namespace: string): Logger {
  return {
    info: (message: string, ...args: any[]) => {
      console.log(`[${namespace}]`, message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[${namespace}]`, message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[${namespace}]`, message, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[${namespace}:debug]`, message, ...args);
      }
    }
  };
}

// Default logger instance
export const logger = createLogger('App');
/**
 * Logger utility for consistent logging across the application
 * Provides namespaced log messages with color coding for better debugging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
  /** Enable or disable all logging */
  enabled?: boolean;
  /** Enable or disable specific log levels */
  levels?: {
    info?: boolean;
    warn?: boolean;
    error?: boolean;
    debug?: boolean;
  };
}

const defaultOptions: LoggerOptions = {
  enabled: process.env.NODE_ENV !== 'production',
  levels: {
    info: true,
    warn: true,
    error: true,
    debug: process.env.NODE_ENV !== 'production'
  }
};

// Color styles for different log levels
const styles = {
  info: 'color: #2196F3; font-weight: bold;',
  warn: 'color: #FF9800; font-weight: bold;',
  error: 'color: #F44336; font-weight: bold;',
  debug: 'color: #9C27B0; font-weight: bold;',
  reset: 'color: inherit'
};

/**
 * Creates a namespaced logger for a specific component or module
 * 
 * @param namespace The name of the component or module
 * @param options Configuration options for the logger
 * @returns A logger object with methods for different log levels
 */
export function createLogger(namespace: string, options: LoggerOptions = {}) {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    levels: {
      ...defaultOptions.levels,
      ...options.levels
    }
  };

  return {
    /**
     * Log informational messages
     */
    info: (...args: any[]) => {
      if (mergedOptions.enabled && mergedOptions.levels?.info) {
        console.log(`%c[${namespace}]%c`, styles.info, styles.reset, ...args);
      }
    },

    /**
     * Log warning messages
     */
    warn: (...args: any[]) => {
      if (mergedOptions.enabled && mergedOptions.levels?.warn) {
        console.warn(`%c[${namespace}]%c`, styles.warn, styles.reset, ...args);
      }
    },

    /**
     * Log error messages
     */
    error: (...args: any[]) => {
      if (mergedOptions.enabled && mergedOptions.levels?.error) {
        console.error(`%c[${namespace}]%c`, styles.error, styles.reset, ...args);
      }
    },

    /**
     * Log debug messages (disabled in production)
     */
    debug: (...args: any[]) => {
      if (mergedOptions.enabled && mergedOptions.levels?.debug) {
        console.log(`%c[${namespace}:debug]%c`, styles.debug, styles.reset, ...args);
      }
    }
  };
}
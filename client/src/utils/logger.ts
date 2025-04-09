/**
 * Logger utility to manage console logging in a centralized way
 * Allows for enabling/disabling logs by level and namespace
 * 
 * OPTIMIZED FOR PERFORMANCE: 
 * - Aggressive log filtering
 * - Lazy initialization of loggers
 * - Minimal overhead when logging is disabled
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  // Enable/disable all logs in development or production
  enabled?: boolean;
  // Enable specific log levels
  levels?: Partial<Record<LogLevel, boolean>>;
  // Enable console group for grouped logs
  grouping?: boolean;
  // Enable lazy initialization (only create logger when needed)
  lazy?: boolean;
}

// Default global options - aggressive throttling for performance
const DEFAULT_OPTIONS: LoggerOptions = {
  enabled: process.env.NODE_ENV !== 'production' && false, // Disable logging completely by default
  levels: {
    debug: false, // Debug is off by default
    info: false,  // Info is off by default
    warn: false,  // Warnings are off by default
    error: true,  // Only show true errors
  },
  grouping: false, // Disable grouping for performance
  lazy: true      // Enable lazy initialization by default
};

// Store created loggers by namespace to maintain their state
const loggers: Record<string, Logger> = {};

/**
 * Logger class to manage console logging with namespaces
 */
export class Logger {
  private namespace: string;
  private _options: LoggerOptions;
  private activeGroups: number = 0;

  constructor(namespace: string, options: LoggerOptions = {}) {
    this.namespace = namespace;
    this._options = {
      ...DEFAULT_OPTIONS,
      ...options,
      levels: {
        ...DEFAULT_OPTIONS.levels,
        ...(options.levels || {})
      }
    };
  }

  /**
   * Get the current logger options
   */
  get options(): LoggerOptions {
    return this._options;
  }

  /**
   * Set new logger options
   */
  set options(newOptions: LoggerOptions) {
    this._options = {
      ...this._options,
      ...newOptions,
      levels: {
        ...this._options.levels,
        ...(newOptions.levels || {})
      }
    };
  }

  /**
   * Check if logging is enabled for a specific level
   */
  private isEnabled(level: LogLevel): boolean {
    return (
      !!this._options.enabled &&
      !!this._options.levels?.[level]
    );
  }

  /**
   * Format the namespace prefix for log messages
   */
  private getPrefix(): string {
    return `[${this.namespace}]`;
  }

  /**
   * Log a debug message
   */
  debug(...args: any[]): void {
    if (!this.isEnabled('debug')) return;
    console.debug(this.getPrefix(), ...args);
  }

  /**
   * Log an info message
   */
  info(...args: any[]): void {
    if (!this.isEnabled('info')) return;
    console.info(this.getPrefix(), ...args);
  }

  /**
   * Log a warning message
   */
  warn(...args: any[]): void {
    if (!this.isEnabled('warn')) return;
    console.warn(this.getPrefix(), ...args);
  }

  /**
   * Log an error message
   */
  error(...args: any[]): void {
    if (!this.isEnabled('error')) return;
    console.error(this.getPrefix(), ...args);
  }

  /**
   * Start a console group with the namespace prefix
   */
  group(label: string): void {
    if (!this.isEnabled('debug') || !this._options.grouping) return;
    console.group(`${this.getPrefix()} ${label}`);
    this.activeGroups++;
  }

  /**
   * End the current console group
   */
  groupEnd(): void {
    if (!this.isEnabled('debug') || !this._options.grouping || this.activeGroups <= 0) return;
    console.groupEnd();
    this.activeGroups--;
  }

  /**
   * Time an operation and log its duration
   */
  time(label: string): () => void {
    if (!this.isEnabled('debug')) return () => {};
    
    const start = performance.now();
    const timeLabel = `${this.getPrefix()} ${label}`;
    
    return () => {
      const duration = performance.now() - start;
      console.log(`${timeLabel} (${duration.toFixed(2)}ms)`);
    };
  }
}

/**
 * Get a logger instance for a specific namespace
 * Reuses existing loggers for the same namespace
 * Supports lazy initialization (no logger objects created if logging is disabled)
 */
export function getLogger(namespace: string, options: LoggerOptions = {}): Logger {
  // Merge options with defaults
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    levels: {
      ...DEFAULT_OPTIONS.levels,
      ...(options.levels || {})
    }
  };
  
  // Fast return - if lazy initialization is enabled and logging is disabled
  // return a minimal logger object without actually creating/storing one
  if (mergedOptions.lazy && !mergedOptions.enabled) {
    // Return a lightweight no-op logger that doesn't get stored
    return new Proxy({} as Logger, {
      get: (target, prop) => {
        // For log methods (debug, info, warn, error) return no-op function
        if (['debug', 'info', 'warn', 'error', 'group', 'groupEnd'].includes(prop as string)) {
          return () => {};
        }
        
        // For time method return function that returns no-op function
        if (prop === 'time') {
          return () => () => {};
        }
        
        // For other properties
        return undefined;
      }
    });
  }
  
  // Regular initialization - create and store the logger instance
  if (!loggers[namespace]) {
    loggers[namespace] = new Logger(namespace, mergedOptions);
  }
  return loggers[namespace];
}

/**
 * Enable or disable all loggers
 */
export function configureAllLoggers(options: LoggerOptions): void {
  Object.values(loggers).forEach(logger => {
    logger.options = options;
  });
}

export default getLogger;
/**
 * Logger utility to manage console logging in a centralized way
 * Allows for enabling/disabling logs by level and namespace
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  // Enable/disable all logs in development or production
  enabled?: boolean;
  // Enable specific log levels
  levels?: Partial<Record<LogLevel, boolean>>;
  // Enable console group for grouped logs
  grouping?: boolean;
}

// Default global options - much more aggressive throttling for performance
const DEFAULT_OPTIONS: LoggerOptions = {
  enabled: process.env.NODE_ENV !== 'production' && false, // Disable logging completely for performance
  levels: {
    debug: false, // Debug is off by default to reduce spam
    info: false,  // Disable info logs completely for performance
    warn: false,  // Disable warn logs for performance except in critical sections
    error: true,  // Only show true errors
  },
  grouping: false // Disable grouping for performance
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
 */
export function getLogger(namespace: string, options: LoggerOptions = {}): Logger {
  if (!loggers[namespace]) {
    loggers[namespace] = new Logger(namespace, options);
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
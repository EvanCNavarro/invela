/**
 * A configurable logger utility for consistent logging throughout the application
 */

// Logger levels that can be enabled or disabled
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Logger configuration options
export interface LoggerConfig {
  levels?: {
    debug?: boolean;
    info?: boolean;
    warn?: boolean;
    error?: boolean;
  };
  prefix?: string;
  colors?: {
    debug?: string;
    info?: string;
    warn?: string;
    error?: string;
  };
}

// Default colors for each log level
const DEFAULT_COLORS = {
  debug: '#888888',  // Gray
  info: '#2196F3',   // Blue
  warn: '#FF9800',   // Orange
  error: '#F44336'   // Red
};

// Default configuration with all levels enabled
const DEFAULT_CONFIG: LoggerConfig = {
  levels: {
    debug: process.env.NODE_ENV === 'development',
    info: true,
    warn: true,
    error: true
  },
  colors: DEFAULT_COLORS
};

// Logger class that handles all logging operations
export class Logger {
  private module: string;
  private config: LoggerConfig;
  
  constructor(module: string, config: LoggerConfig = {}) {
    this.module = module;
    
    // Merge provided config with defaults
    this.config = {
      levels: { ...DEFAULT_CONFIG.levels, ...config.levels },
      colors: { ...DEFAULT_CONFIG.colors, ...config.colors },
      prefix: config.prefix
    };
  }
  
  // Create prefixed message for consistent formatting
  private createMessage(level: LogLevel, message: string): string {
    const prefix = this.config.prefix || this.module;
    return `[${prefix}] ${message}`;
  }
  
  // Debug level logging
  debug(message: string, ...data: any[]): void {
    if (this.config.levels?.debug) {
      const formattedMessage = this.createMessage('debug', message);
      console.log(
        `%c${formattedMessage}`,
        `color: ${this.config.colors?.debug || DEFAULT_COLORS.debug}`,
        ...data
      );
    }
  }
  
  // Info level logging
  info(message: string, ...data: any[]): void {
    if (this.config.levels?.info) {
      const formattedMessage = this.createMessage('info', message);
      console.info(
        `%c${formattedMessage}`,
        `color: ${this.config.colors?.info || DEFAULT_COLORS.info}`,
        ...data
      );
    }
  }
  
  // Warning level logging
  warn(message: string, ...data: any[]): void {
    if (this.config.levels?.warn) {
      const formattedMessage = this.createMessage('warn', message);
      console.warn(
        `%c${formattedMessage}`,
        `color: ${this.config.colors?.warn || DEFAULT_COLORS.warn}`,
        ...data
      );
    }
  }
  
  // Error level logging
  error(message: string, ...data: any[]): void {
    if (this.config.levels?.error) {
      const formattedMessage = this.createMessage('error', message);
      console.error(
        `%c${formattedMessage}`,
        `color: ${this.config.colors?.error || DEFAULT_COLORS.error}`,
        ...data
      );
    }
  }
}

// Factory function to create loggers with backwards compatibility
function createLogger(module: string, config: LoggerConfig = {}): Logger {
  return new Logger(module, config);
}

// Export both as named export and default export for backward compatibility
export const getLogger = createLogger;
export default createLogger;

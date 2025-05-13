/**
 * Standardized Logger Implementation
 * 
 * This provides a consistent logging interface that can be used
 * throughout the application. It wraps console methods to add
 * timestamps and structured context data.
 */

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Format log messages consistently
function formatLogMessage(level: LogLevel, message: string, context?: any): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${context ? ' ' + JSON.stringify(context) : ''}`;
}

// Logger interface with context support
const logger = {
  debug: (message: string, context?: any) => {
    console.debug(formatLogMessage('debug', message, context));
  },
  
  info: (message: string, context?: any) => {
    console.info(formatLogMessage('info', message, context));
  },
  
  warn: (message: string, context?: any) => {
    console.warn(formatLogMessage('warn', message, context));
  },
  
  error: (message: string, context?: any) => {
    console.error(formatLogMessage('error', message, context));
  }
};

export { logger };
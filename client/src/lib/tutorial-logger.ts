/**
 * Tutorial Logger Utility
 * 
 * This utility provides a standardized logging mechanism for the tutorial system.
 * It helps with debugging and monitoring tutorial functionality by providing
 * consistent logging across different components.
 */

// Type definition for log levels
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Interface for the logger object returned by createTutorialLogger
interface TutorialLogger {
  info: (message: string, ...data: any[]) => void;
  warn: (message: string, ...data: any[]) => void;
  error: (message: string, ...data: any[]) => void;
  debug: (message: string, ...data: any[]) => void;
}

// Whether to show debug level logs
const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

/**
 * Creates a logger instance with a specific module name
 * 
 * @param moduleName The name of the module using the logger
 * @returns A logger instance
 */
export function createTutorialLogger(moduleName: string): TutorialLogger {
  const formatMessage = (level: LogLevel, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${moduleName}] ${message}`;
  };

  return {
    info: (message: string, ...data: any[]) => {
      console.info(formatMessage('info', message), ...(data.length ? data : []));
    },
    
    warn: (message: string, ...data: any[]) => {
      console.warn(formatMessage('warn', message), ...(data.length ? data : []));
    },
    
    error: (message: string, ...data: any[]) => {
      console.error(formatMessage('error', message), ...(data.length ? data : []));
    },
    
    debug: (message: string, ...data: any[]) => {
      if (DEBUG_ENABLED) {
        console.debug(formatMessage('debug', message), ...(data.length ? data : []));
      }
    }
  };
}

// Create a system-wide logger instance
export const tutorialLogger = createTutorialLogger('System');
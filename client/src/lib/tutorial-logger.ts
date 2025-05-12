/**
 * Tutorial Logger Utility
 * 
 * This module provides standardized logging functionality for the tutorial system
 * with consistent formatting, log levels, and optional module prefixing.
 */

// Flag to enable or disable specific log levels
const LOG_LEVELS = {
  debug: true,   // Detailed debugging information
  info: true,    // General information about normal operation
  warn: true,    // Warnings about potential issues
  error: true,   // Error conditions that should be addressed
  render: true,  // Logging for component rendering cycles
  init: true     // Logging for initialization processes
};

// Interface for a logger instance
interface TutorialLogger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  render: (message: string, data?: any) => void;
  init: (message: string, data?: any) => void;
}

/**
 * Create a tutorial logger instance for a specific module
 * 
 * @param moduleName The name of the module using this logger
 * @returns A logger object with various log methods
 */
export function createTutorialLogger(moduleName: string): TutorialLogger {
  // Helper to format log messages with module name and consistent styling
  const formatMessage = (level: string, message: string): string => {
    return `[Tutorial:${moduleName}] ${message}`;
  };

  // Helper to get the appropriate console styling for each log level
  const getStyle = (level: string): string => {
    switch (level) {
      case 'debug': return 'color: #9E9E9E; font-weight: bold;';
      case 'info': return 'color: #2196F3; font-weight: bold;';
      case 'warn': return 'color: #FF9800; font-weight: bold;';
      case 'error': return 'color: #F44336; font-weight: bold;';
      case 'render': return 'color: #4CAF50; font-weight: bold;';
      case 'init': return 'color: #9C27B0; font-weight: bold;';
      default: return 'color: #212121;';
    }
  };

  return {
    debug: (message: string, data?: any) => {
      if (LOG_LEVELS.debug) {
        if (data !== undefined) {
          console.debug(`%c${formatMessage('debug', message)}`, getStyle('debug'), data);
        } else {
          console.debug(`%c${formatMessage('debug', message)}`, getStyle('debug'));
        }
      }
    },
    
    info: (message: string, data?: any) => {
      if (LOG_LEVELS.info) {
        if (data !== undefined) {
          console.log(`%c${formatMessage('info', message)}`, getStyle('info'), data);
        } else {
          console.log(`%c${formatMessage('info', message)}`, getStyle('info'));
        }
      }
    },
    
    warn: (message: string, data?: any) => {
      if (LOG_LEVELS.warn) {
        if (data !== undefined) {
          console.warn(`%c${formatMessage('warn', message)}`, getStyle('warn'), data);
        } else {
          console.warn(`%c${formatMessage('warn', message)}`, getStyle('warn'));
        }
      }
    },
    
    error: (message: string, data?: any) => {
      if (LOG_LEVELS.error) {
        if (data !== undefined) {
          console.error(`%c${formatMessage('error', message)}`, getStyle('error'), data);
        } else {
          console.error(`%c${formatMessage('error', message)}`, getStyle('error'));
        }
      }
    },

    render: (message: string, data?: any) => {
      if (LOG_LEVELS.render) {
        if (data !== undefined) {
          console.log(`%c${formatMessage('render', message)}`, getStyle('render'), data);
        } else {
          console.log(`%c${formatMessage('render', message)}`, getStyle('render'));
        }
      }
    },

    init: (message: string, data?: any) => {
      if (LOG_LEVELS.init) {
        if (data !== undefined) {
          console.log(`%c${formatMessage('init', message)}`, getStyle('init'), data);
        } else {
          console.log(`%c${formatMessage('init', message)}`, getStyle('init'));
        }
      }
    }
  };
}

// Default export for easy importing
export default createTutorialLogger;
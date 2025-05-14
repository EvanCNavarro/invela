/**
 * Logger utility for tracking component lifecycle and interactions
 * 
 * Provides structured logging with category labels and styling for easier debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogStyles {
  debug: string;
  info: string;
  warn: string;
  error: string;
  [key: string]: string; // For custom categories
}

// Default styling for different log levels
const LOG_STYLES: LogStyles = {
  debug: 'color: #7986cb; font-weight: normal',
  info: 'color: #2196F3; font-weight: normal',
  warn: 'color: #FF9800; font-weight: bold',
  error: 'color: #F44336; font-weight: bold',
  component: 'color: #4CAF50; font-weight: normal',
  focus: 'color: #9C27B0; font-weight: normal',
  select: 'color: #00BCD4; font-weight: normal',
  modal: 'color: #795548; font-weight: normal'
};

// Environment-based log level filtering
const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_ENABLED = isProduction ? ['error', 'warn'] : ['debug', 'info', 'warn', 'error'];

// Enabled log categories (can be extended at runtime)
let enabledCategories = [...DEFAULT_ENABLED];

/**
 * Creates a logger instance for a specific category
 * 
 * @param category The logging category (affects styling and can be filtered)
 * @returns A logger object with methods for different log levels
 */
export function createLogger(category: string) {
  const categoryStyle = LOG_STYLES[category] || LOG_STYLES.info;
  
  // Format the log prefix for this category
  const getPrefix = () => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${category.toUpperCase()}]`;
  };
  
  return {
    /**
     * Log at debug level (for detailed diagnostic information)
     */
    debug: (...args: any[]) => {
      if (enabledCategories.includes('debug')) {
        console.debug(`%c${getPrefix()}`, categoryStyle, ...args);
      }
    },
    
    /**
     * Log at info level (for general operational information)
     */
    info: (...args: any[]) => {
      if (enabledCategories.includes('info')) {
        console.log(`%c${getPrefix()}`, categoryStyle, ...args);
      }
    },
    
    /**
     * Log at warn level (for concerning but non-critical issues)
     */
    warn: (...args: any[]) => {
      if (enabledCategories.includes('warn')) {
        console.warn(`%c${getPrefix()}`, categoryStyle, ...args);
      }
    },
    
    /**
     * Log at error level (for critical issues)
     */
    error: (...args: any[]) => {
      if (enabledCategories.includes('error')) {
        console.error(`%c${getPrefix()}`, categoryStyle, ...args);
      }
    }
  };
}

/**
 * Enable additional log categories
 * 
 * @param categories List of categories to enable
 */
export function enableLogCategories(...categories: string[]) {
  enabledCategories = [...new Set([...enabledCategories, ...categories])];
}

/**
 * Disable specific log categories
 * 
 * @param categories List of categories to disable
 */
export function disableLogCategories(...categories: string[]) {
  enabledCategories = enabledCategories.filter(c => !categories.includes(c));
}

/**
 * Reset log categories to default
 */
export function resetLogCategories() {
  enabledCategories = [...DEFAULT_ENABLED];
}

// Create pre-configured loggers for common uses
export const logger = {
  component: createLogger('component'),
  focus: createLogger('focus'),
  select: createLogger('select'),
  modal: createLogger('modal')
};
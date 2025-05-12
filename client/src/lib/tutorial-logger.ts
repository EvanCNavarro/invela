/**
 * Tutorial Logger Utility
 * 
 * This utility provides consistent, structured logging for tutorial components.
 * It helps with debugging and diagnostics by categorizing logs and providing
 * consistent formatting across components.
 */

// Define log levels for consistent categorization
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Base colors for different log types
const LOG_COLORS = {
  info: '#2196F3',   // Blue
  warn: '#FF9800',   // Orange
  error: '#F44336', // Red
  debug: '#4CAF50', // Green
  
  // Component-specific colors
  manager: '#9C27B0',   // Purple
  modal: '#00BCD4',     // Cyan
  websocket: '#FF5722', // Deep Orange
  claims: '#3F51B5',    // Indigo
  
  // Action colors
  init: '#8BC34A',       // Light Green
  render: '#673AB7',     // Deep Purple
  interaction: '#FFC107', // Amber
};

/**
 * Create a logger for a specific tutorial component
 * 
 * @param component The component name (used as log prefix)
 * @returns An object with logging methods
 */
export function createTutorialLogger(component: string) {
  // Create the base log function with component name in prefix
  const baseLog = (level: LogLevel, color: string, message: string, data?: any) => {
    const prefix = `[Tutorial:${component}]`;
    
    if (data) {
      console[level](`%c${prefix} ${message}`, `color: ${color}; font-weight: bold;`, data);
    } else {
      console[level](`%c${prefix} ${message}`, `color: ${color}; font-weight: bold;`);
    }
  };
  
  return {
    // Standard logging levels
    info: (message: string, data?: any) => baseLog('info', LOG_COLORS.info, message, data),
    warn: (message: string, data?: any) => baseLog('warn', LOG_COLORS.warn, message, data),
    error: (message: string, data?: any) => baseLog('error', LOG_COLORS.error, message, data),
    debug: (message: string, data?: any) => baseLog('info' as LogLevel, LOG_COLORS.debug, message, data),
    
    // Specialized logs for specific events
    init: (message: string, data?: any) => baseLog('info', LOG_COLORS.init, `🚀 ${message}`, data),
    render: (message: string, data?: any) => baseLog('info', LOG_COLORS.render, `🎨 ${message}`, data),
    interaction: (message: string, data?: any) => baseLog('info', LOG_COLORS.interaction, `👆 ${message}`, data),
    
    // Log groups for related logs
    group: (title: string) => {
      console.group(`%c[Tutorial:${component}] ${title}`, `color: ${LOG_COLORS[component as keyof typeof LOG_COLORS] || LOG_COLORS.info}; font-weight: bold;`);
    },
    groupEnd: () => console.groupEnd(),
    
    // Table format for structured data
    table: (data: any) => {
      console.log(`%c[Tutorial:${component}] Data Table:`, `color: ${LOG_COLORS.info}; font-weight: bold;`);
      console.table(data);
    }
  };
}

// Export a single instance for shared tutorial logging
export const tutorialLogger = createTutorialLogger('System');
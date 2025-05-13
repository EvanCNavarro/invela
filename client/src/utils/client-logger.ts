/**
 * Client-side logger utility
 * 
 * This module provides a browser-safe logger with the same API as the server logger.
 * It can be safely imported into client components without causing 'logger is not defined' errors.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Color map for console output styling
const colors = {
  debug: '#9e9e9e', // Gray
  info: '#2196f3',  // Blue
  warn: '#ff9800',  // Orange
  error: '#f44336', // Red
};

/**
 * Log formatter that adds timestamp and formats message for console output
 */
const formatLogMessage = (level: LogLevel, message: string, ...data: any[]) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Return a formatted string for server environment
  if (!isBrowser) {
    return `${prefix} ${message}`;
  }
  
  // For browser, we'll return the raw components for console formatting
  return [`%c${prefix} ${message}`, `color: ${colors[level]}`];
};

/**
 * Client-side compatible logger that uses the browser console
 */
export const logger = {
  debug(message: string, ...data: any[]) {
    const formattedMessage = formatLogMessage('debug', message, ...data);
    console.debug(...(Array.isArray(formattedMessage) ? formattedMessage : [formattedMessage]), ...data);
  },
  
  info(message: string, ...data: any[]) {
    const formattedMessage = formatLogMessage('info', message, ...data);
    console.info(...(Array.isArray(formattedMessage) ? formattedMessage : [formattedMessage]), ...data);
  },
  
  warn(message: string, ...data: any[]) {
    const formattedMessage = formatLogMessage('warn', message, ...data);
    console.warn(...(Array.isArray(formattedMessage) ? formattedMessage : [formattedMessage]), ...data);
  },
  
  error(message: string, ...data: any[]) {
    const formattedMessage = formatLogMessage('error', message, ...data);
    console.error(...(Array.isArray(formattedMessage) ? formattedMessage : [formattedMessage]), ...data);
  },
};

// Default export for easier imports
export default logger;

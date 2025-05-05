import { logger } from './logger';

/**
 * Tab Access Control Logger
 * 
 * A specialized logger for tab access control operations that ensures
 * consistent and detailed logging across all tab access functionality.
 */
export const tabLogger = {
  /**
   * Log debug level messages
   * @param message The message to log
   * @param meta Additional metadata
   */
  debug: (message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[TabAccess] ${message}`, meta);
  },
  
  /**
   * Log info level messages
   * @param message The message to log
   * @param meta Additional metadata
   */
  info: (message: string, meta: Record<string, any> = {}) => {
    logger.info(`[TabAccess] ${message}`, meta);
  },
  
  /**
   * Log warn level messages
   * @param message The message to log
   * @param meta Additional metadata
   */
  warn: (message: string, meta: Record<string, any> = {}) => {
    logger.warn(`[TabAccess] ${message}`, meta);
  },
  
  /**
   * Log error level messages
   * @param message The message to log
   * @param meta Additional metadata
   */
  error: (message: string, meta: Record<string, any> = {}) => {
    logger.error(`[TabAccess] ${message}`, meta);
  }
};

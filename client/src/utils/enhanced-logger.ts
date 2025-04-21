/**
 * Enhanced logger with category-based filtering
 * 
 * This logger extends the base logger to add category-based filtering,
 * reducing log noise while preserving important messages.
 */

import { Logger, LoggerConfig } from './logger';
import { loggingConfig, shouldLog, shouldLogError } from './logging-config';

// Categories for log messages
export type LogCategory = 
  | 'formDataManager'
  | 'uiComponents'
  | 'performance'
  | 'general';

// Subcategories for more granular control
export type LogSubcategory = 
  | 'fieldUpdates'
  | 'dataSaving'
  | 'serverSync'
  | 'validationErrors'
  | 'navigation'
  | 'rendering'
  | 'progressTracking'
  | 'metrics'
  | 'timeouts';

// Enhanced logger that respects category configuration
export interface EnhancedLoggerConfig extends LoggerConfig {
  disableAllLogs?: boolean;
  preserveErrors?: boolean;
}

export class EnhancedLogger extends Logger {
  private category: LogCategory;
  private disableAllLogs: boolean;
  private preserveErrors: boolean;
  
  constructor(module: string, category: LogCategory = 'general', config: EnhancedLoggerConfig = {}) {
    super(module, config);
    this.category = category;
    this.disableAllLogs = config.disableAllLogs || false;
    this.preserveErrors = config.preserveErrors || false;
  }
  
  // Check if a log should be shown based on its category and subcategory
  private shouldShowLog(subcategory?: LogSubcategory): boolean {
    // First check global disableAllLogs config
    if (loggingConfig.disableAllLogs) {
      return false;
    }
    
    // Then check instance-level disableAllLogs setting
    if (this.disableAllLogs) {
      return false;
    }
    
    // Finally check category/subcategory settings
    return shouldLog(this.category, subcategory as string);
  }
  
  // Override debug method with category filtering
  debug(message: string, subcategory?: LogSubcategory, ...data: any[]): void {
    // Always provide a no-op implementation even when logs are disabled
    if (this.shouldShowLog(subcategory)) {
      super.debug(message, ...data);
    }
  }
  
  // Override info method with category filtering
  info(message: string, subcategory?: LogSubcategory, ...data: any[]): void {
    if (this.shouldShowLog(subcategory)) {
      super.info(message, ...data);
    }
  }
  
  // Override warn method with category filtering
  warn(message: string, subcategory?: LogSubcategory, ...data: any[]): void {
    if (this.shouldShowLog(subcategory)) {
      super.warn(message, ...data);
    }
  }
  
  // Override error method with category filtering - but respect the global error setting
  error(message: string, ...data: any[]): void {
    // Check if errors should be preserved even when all logs are disabled
    if (loggingConfig.disableAllLogs) {
      // Only show errors if they should be preserved with disableAllLogs
      if ((this.preserveErrors && shouldLogError())) {
        super.error(message, ...data);
      }
    }
    // Instance-level handling
    else if (this.disableAllLogs) {
      if (this.preserveErrors) {
        super.error(message, ...data);
      }
    }
    // Standard error handling
    else if (shouldLogError()) {
      super.error(message, ...data);
    }
  }
}

// Factory function to create enhanced loggers
export function createEnhancedLogger(
  module: string, 
  category: LogCategory = 'general', 
  config: EnhancedLoggerConfig = {}
): EnhancedLogger {
  return new EnhancedLogger(module, category, config);
}

// Export default factory
export default createEnhancedLogger;
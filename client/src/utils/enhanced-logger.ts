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
export class EnhancedLogger extends Logger {
  private category: LogCategory;
  
  constructor(module: string, category: LogCategory = 'general', config: LoggerConfig = {}) {
    super(module, config);
    this.category = category;
  }
  
  // Check if a log should be shown based on its category and subcategory
  private shouldShowLog(subcategory?: LogSubcategory): boolean {
    return shouldLog(this.category, subcategory as string);
  }
  
  // Override debug method with category filtering
  debug(message: string, subcategory?: LogSubcategory, ...data: any[]): void {
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
    if (shouldLogError()) {
      super.error(message, ...data);
    }
  }
}

// Factory function to create enhanced loggers
export function createEnhancedLogger(
  module: string, 
  category: LogCategory = 'general', 
  config: LoggerConfig = {}
): EnhancedLogger {
  return new EnhancedLogger(module, category, config);
}

// Export default factory
export default createEnhancedLogger;
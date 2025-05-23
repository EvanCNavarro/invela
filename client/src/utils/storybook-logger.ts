/**
 * ========================================
 * Storybook Development Logger Utility
 * ========================================
 * 
 * Enhanced logging system specifically designed for Storybook component
 * development and build process tracking. Provides comprehensive visibility
 * into component loading, import resolution, and build status.
 * 
 * Features:
 * - Color-coded log levels for easy identification
 * - Build process progress tracking
 * - Component import resolution monitoring
 * - Error context preservation
 * - Performance timing measurements
 * 
 * @module client/src/utils/storybook-logger
 * @version 1.0.0
 * @since 2025-05-23
 */

/**
 * Log Level Enumeration
 * Defines severity levels for categorized logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARN = 'warn',
  ERROR = 'error',
  SUCCESS = 'success'
}

/**
 * Build Status Enumeration
 * Tracks Storybook build pipeline states
 */
export enum BuildStatus {
  INITIALIZING = 'initializing',
  RESOLVING_IMPORTS = 'resolving_imports',
  BUILDING_MANAGER = 'building_manager',
  BUILDING_PREVIEW = 'building_preview',
  OPTIMIZING = 'optimizing',
  COMPLETE = 'complete',
  FAILED = 'failed'
}

/**
 * Enhanced Storybook Logger Class
 * Provides comprehensive logging with context and formatting
 */
export class StorybookLogger {
  private context: string;
  private startTime: number;
  private buildProgress: number = 0;

  constructor(context: string = 'Storybook') {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Log with specified level and color coding
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const colors = {
      [LogLevel.DEBUG]: '#6B7280',
      [LogLevel.INFO]: '#2196F3',
      [LogLevel.WARN]: '#F59E0B',
      [LogLevel.ERROR]: '#EF4444',
      [LogLevel.SUCCESS]: '#10B981'
    };

    const prefix = `[${timestamp}] [${this.context}]`;
    const color = colors[level];

    if (data) {
      console.log(`%c${prefix} ${message}`, `color: ${color}`, data);
    } else {
      console.log(`%c${prefix} ${message}`, `color: ${color}`);
    }
  }

  /**
   * Track build progress with visual indicators
   */
  public trackProgress(status: BuildStatus, percentage: number, details?: string): void {
    this.buildProgress = percentage;
    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    
    this.log(LogLevel.INFO, `Build Progress: [${progressBar}] ${percentage}%`, {
      status,
      details,
      elapsed: `${Date.now() - this.startTime}ms`
    });
  }

  /**
   * Log component import resolution
   */
  public logImportResolution(componentName: string, path: string, success: boolean): void {
    const level = success ? LogLevel.SUCCESS : LogLevel.ERROR;
    const status = success ? '✅ Resolved' : '❌ Failed';
    
    this.log(level, `Component Import ${status}: ${componentName}`, {
      importPath: path,
      success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log build step completion
   */
  public logBuildStep(step: string, duration: number, success: boolean): void {
    const level = success ? LogLevel.SUCCESS : LogLevel.ERROR;
    const status = success ? '✅ Complete' : '❌ Failed';
    
    this.log(level, `Build Step ${status}: ${step}`, {
      duration: `${duration}ms`,
      success
    });
  }

  /**
   * Standard logging methods
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  public success(message: string, data?: any): void {
    this.log(LogLevel.SUCCESS, message, data);
  }
}

/**
 * Global Storybook Logger Instance
 * Pre-configured for component development use
 */
export const storybookLogger = new StorybookLogger('Storybook Development');

/**
 * Performance Timer Utility
 * Measures and logs operation durations
 */
export class PerformanceTimer {
  private timers: Map<string, number> = new Map();

  public start(operation: string): void {
    this.timers.set(operation, Date.now());
    storybookLogger.debug(`Timer started: ${operation}`);
  }

  public end(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      storybookLogger.warn(`Timer not found: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);
    storybookLogger.success(`Timer completed: ${operation}`, { duration: `${duration}ms` });
    return duration;
  }
}

/**
 * Global Performance Timer Instance
 */
export const performanceTimer = new PerformanceTimer();
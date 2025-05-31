/**
 * Form Optimization Utilities
 * 
 * This module provides utilities and configuration for optimizing form performance.
 * It includes feature flags, performance monitoring, and helper functions for
 * implementing optimization strategies.
 */

// Feature flags for controlling optimization strategies
export const OptimizationFeatures = {
  // When enabled, virtualized rendering will only render fields that are visible
  // in the viewport, significantly improving performance for large forms
  VIRTUALIZED_RENDERING: true,
  
  // When enabled, form sections will be loaded progressively rather than all at once,
  // improving initial render time and perceived performance
  PROGRESSIVE_LOADING: true,
  
  // When enabled, field updates will be batched and debounced to reduce
  // unnecessary re-renders and API calls
  DEBOUNCED_UPDATES: true,
  
  // When enabled, form data is saved by section to reduce payload size
  SECTION_BASED_SAVING: false,
  
  // When enabled, field-level timestamps are tracked for precise synchronization
  OPTIMIZED_TIMESTAMPS: true,
  
  // Debug mode enables additional logging and performance metrics
  DEBUG_MODE: false
};

/**
 * Safely run optimized code with fallback
 * 
 * This utility function runs optimized code with a fallback in case of errors.
 * It's useful for running experimental optimizations without breaking the application.
 * 
 * @param optimizedFn The optimized function to run
 * @param fallbackFn The fallback function to run if the optimized function fails
 * @param errorHandler Optional handler for errors
 * @returns The result of the optimized function, or the fallback if it fails
 */
export function safelyRunOptimizedCode<T>(
  optimizedFn: () => T,
  fallbackFn: () => T,
  errorHandler?: (error: Error) => void
): T {
  if (!OptimizationFeatures.DEBUG_MODE) {
    try {
      return optimizedFn();
    } catch (error) {
      if (errorHandler && error instanceof Error) {
        errorHandler(error);
      } else {
        console.error('[Optimization] Error in optimized code:', error);
      }
      return fallbackFn();
    }
  } else {
    // In debug mode, let errors bubble up for better debugging
    return optimizedFn();
  }
}

/**
 * Check the health of the optimization system
 * 
 * This function performs a series of checks to ensure that the optimization
 * system is working correctly. It returns a report of the checks performed.
 * 
 * @returns A report of the health checks performed
 */
export function healthCheck(): Record<string, any> {
  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    features: { ...OptimizationFeatures },
    status: 'healthy',
    checks: {}
  };

  // Check performance monitoring
  try {
    performanceMonitor.startTimer('healthCheck');
    const timer = performanceMonitor.endTimer('healthCheck');
    report.checks.performanceMonitor = {
      status: timer !== undefined ? 'ok' : 'failed',
      timerWorks: timer !== undefined
    };
  } catch (error) {
    report.checks.performanceMonitor = {
      status: 'error',
      error: String(error)
    };
    report.status = 'degraded';
  }

  // Check progressive loader
  try {
    const initialCount = progressiveLoader.loadedCount;
    const dummyCallback = () => {};
    progressiveLoader.loadSectionImmediately('test-section', dummyCallback);
    const afterCount = progressiveLoader.loadedCount;
    progressiveLoader.reset();
    
    report.checks.progressiveLoader = {
      status: afterCount > initialCount ? 'ok' : 'failed',
      loaderWorks: afterCount > initialCount
    };
  } catch (error) {
    report.checks.progressiveLoader = {
      status: 'error',
      error: String(error)
    };
    report.status = 'degraded';
  }

  // Check batch update manager
  try {
    const batchManager = new BatchUpdateManagerImpl();
    batchManager.addUpdate('test', 'value');
    const size = batchManager.size;
    const updates = batchManager.processQueue();
    
    report.checks.batchUpdateManager = {
      status: size === 1 && Object.keys(updates).length === 1 ? 'ok' : 'failed',
      managerWorks: size === 1 && Object.keys(updates).length === 1
    };
  } catch (error) {
    report.checks.batchUpdateManager = {
      status: 'error',
      error: String(error)
    };
    report.status = 'degraded';
  }

  return report;
}

/**
 * Form Performance Monitor
 * 
 * This class provides methods for measuring and tracking form performance.
 * It can be used to measure render times, update times, and other performance metrics.
 */
class FormPerformanceMonitor {
  private timers: Record<string, { start: number; end?: number }> = {};
  private measurements: Record<string, number[]> = {};
  private memorySnapshots: number[] = [];
  
  /**
   * Start a timer for a specific operation
   * @param operationName The name of the operation to time
   */
  startTimer(operationName: string): void {
    if (OptimizationFeatures.DEBUG_MODE) {
      this.timers[operationName] = { start: performance.now() };
      // Removed debug console logging
    }
  }
  
  /**
   * End a timer and record the measurement
   * @param operationName The name of the operation to end timing for
   * @returns The measured time in milliseconds, or undefined if timing is disabled
   */
  endTimer(operationName: string): number | undefined {
    if (OptimizationFeatures.DEBUG_MODE && this.timers[operationName]) {
      const start = this.timers[operationName].start;
      const end = performance.now();
      const duration = end - start;
      
      this.timers[operationName].end = end;
      
      // Store the measurement
      if (!this.measurements[operationName]) {
        this.measurements[operationName] = [];
      }
      this.measurements[operationName].push(duration);
      
      // Removed console logging
      return duration;
    }
    return undefined;
  }
  
  /**
   * Record memory usage at the current point
   * This is useful for tracking memory usage over time
   */
  recordMemoryUsage(): void {
    if (OptimizationFeatures.DEBUG_MODE && window.performance && (window.performance as any).memory) {
      const memoryInfo = (window.performance as any).memory;
      const usedHeapSize = memoryInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
      this.memorySnapshots.push(usedHeapSize);
      // Removed console logging
    }
  }
  
  /**
   * Get all measurements for a specific operation
   * @param operationName The operation to get measurements for
   * @returns An array of timing measurements in milliseconds
   */
  getMeasurements(operationName: string): number[] {
    return this.measurements[operationName] || [];
  }
  
  /**
   * Get the last measurement for a specific operation
   * @param operationName The operation to get the last measurement for
   * @returns The last measurement in milliseconds, or undefined if no measurements exist
   */
  getLastMeasurement(operationName: string): number | undefined {
    const measurements = this.getMeasurements(operationName);
    return measurements.length > 0 ? measurements[measurements.length - 1] : undefined;
  }
  
  /**
   * Get the average measurement for a specific operation
   * @param operationName The operation to get the average for
   * @returns The average measurement in milliseconds, or undefined if no measurements exist
   */
  getAverageMeasurement(operationName: string): number | undefined {
    const measurements = this.getMeasurements(operationName);
    if (measurements.length === 0) return undefined;
    
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    return sum / measurements.length;
  }
  
  /**
   * Get all performance data as a summary object
   * @returns An object containing all performance data
   */
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      operations: {},
      memory: {
        snapshots: this.memorySnapshots,
        current: undefined,
        peak: undefined
      }
    };
    
    // Add operation measurements
    Object.keys(this.measurements).forEach(operation => {
      const measurements = this.measurements[operation];
      summary.operations[operation] = {
        count: measurements.length,
        total: measurements.reduce((acc, val) => acc + val, 0),
        average: this.getAverageMeasurement(operation),
        min: Math.min(...measurements),
        max: Math.max(...measurements),
        last: this.getLastMeasurement(operation)
      };
    });
    
    // Add memory information
    if (this.memorySnapshots.length > 0) {
      summary.memory.current = this.memorySnapshots[this.memorySnapshots.length - 1];
      summary.memory.peak = Math.max(...this.memorySnapshots);
    }
    
    return summary;
  }
  
  /**
   * Reset all timers and measurements
   */
  reset(): void {
    this.timers = {};
    this.measurements = {};
    this.memorySnapshots = [];
    // Removed console logging
  }
}

/**
 * Batch Update Manager
 * 
 * This utility helps to batch multiple field updates together to reduce
 * unnecessary re-renders and API calls. It's especially useful for forms
 * with many fields or frequent updates.
 * 
 * The manager implements batching through a debounced update mechanism - 
 * multiple rapid updates are collected and then processed together after
 * a specified delay, significantly reducing unnecessary re-renders.
 */
class BatchUpdateManagerImpl<T = any> {
  private queue: Map<string, T> = new Map();
  private timeout: number | null = null;
  private _delay: number;
  private updateListeners: Array<(updates: Record<string, T>, timestamps?: Record<string, number>) => void> = [];
  private completionListeners: Array<(updates: Record<string, T>) => void> = [];
  private timestamps: Record<string, number> = {};
  
  /**
   * Create a new BatchUpdateManager
   * @param delay The delay in milliseconds before processing the batch (default: 300ms)
   * @param initialValues Optional initial values to populate the queue with
   */
  constructor(delay = 1500, initialValues?: Record<string, T>) {
    // COMPLETELY DISABLED: Set delay to Infinity to disable automatic batch processing
    // This eliminates the persistent 60-second timer causing artificial polling
    this._delay = Infinity;
    
    // Initialize with any provided values
    if (initialValues) {
      Object.entries(initialValues).forEach(([key, value]) => {
        this.queue.set(key, value);
        this.timestamps[key] = Date.now();
      });
    }
  }
  
  /**
   * Configure the batch manager settings
   * @param options Configuration options
   */
  configure(options: { delay?: number }) {
    if (options.delay !== undefined) {
      this._delay = options.delay;
    }
  }
  
  /**
   * Get the current delay setting
   */
  get delay(): number {
    return this._delay;
  }
  
  /**
   * Set the delay between batch processing
   */
  set delay(value: number) {
    this._delay = value;
  }
  
  /**
   * Add an update to the batch queue
   * @param key The key for the update (typically a field name)
   * @param value The value to update
   * @param immediate If true, process the batch immediately instead of waiting
   */
  addUpdate(key: string, value: T, immediate = false): void {
    performanceMonitor.startTimer('batchUpdate_add');
    
    // IMPORTANT: For string values, preserve spaces exactly as they are
    // This prevents spaces from being removed when typing quickly
    // Do NOT modify string values here as it can cause issues with whitespace
    
    // Add to queue - store the exact value without modification
    this.queue.set(key, value);
    this.timestamps[key] = Date.now();
    
    // Process immediately if requested
    if (immediate) {
      this.processQueue();
    } else {
      // COMPLETELY DISABLED: Never create automatic timers to eliminate persistent polling
      // This prevents the 60-second timer that was causing artificial API calls every minute
      // All batch processing must now be triggered manually via processQueue() calls
      // This ensures genuine event-driven architecture without artificial timers
      
      // Timer creation is completely disabled - no automatic batch processing
    }
    
    performanceMonitor.endTimer('batchUpdate_add');
  }
  
  /**
   * Alias for addUpdate - used for compatibility with different naming conventions
   * @param key The key for the update (typically a field name)
   * @param value The value to update
   * @param options Optional settings or boolean flag for immediate processing
   */
  queueUpdate(key: string, value: T, options?: boolean | { sectionId?: string, immediate?: boolean }): void {
    // Handle different parameter formats
    if (typeof options === 'object') {
      this.addUpdate(key, value, options.immediate || false);
    } else {
      this.addUpdate(key, value, options || false);
    }
  }
  
  /**
   * Register a listener for update events
   * @param listener Callback function that receives updates and optional timestamps
   * @returns A function that unsubscribes the listener when called
   */
  onUpdate(listener: (updates: Record<string, T>, timestamps?: Record<string, number>) => void): () => void {
    this.updateListeners.push(listener);
    
    // Return an unsubscribe function
    return () => {
      const index = this.updateListeners.indexOf(listener);
      if (index !== -1) {
        this.updateListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Register a listener for batch completion events
   * @param listener Callback function called when a batch is processed
   */
  onComplete(listener: (updates: Record<string, T>) => void): void {
    this.completionListeners.push(listener);
  }
  
  /**
   * Process the current batch queue
   * @param callback Optional callback to execute with the processed updates
   * @returns A record of all updates in the queue
   */
  processQueue(callback?: (updates: Record<string, T>) => void): Record<string, T> {
    performanceMonitor.startTimer('batchUpdate_process');
    
    // Convert queue to a regular object
    const updates: Record<string, T> = {};
    this.queue.forEach((value, key) => {
      updates[key] = value;
    });
    
    // Create a copy of the timestamps for this batch
    const currentTimestamps: Record<string, number> = {};
    Object.keys(updates).forEach(key => {
      if (this.timestamps[key]) {
        currentTimestamps[key] = this.timestamps[key];
      }
    });
    
    // Clear the queue
    this.queue.clear();
    
    // Clear any pending timeout
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    // Execute callback if provided
    if (callback && Object.keys(updates).length > 0) {
      callback(updates);
    }
    
    // Notify update listeners
    if (Object.keys(updates).length > 0) {
      this.updateListeners.forEach(listener => {
        try {
          // Check if timestamps object is empty before passing it
          const hasTimestamps = Object.keys(currentTimestamps).length > 0;
          listener(updates, hasTimestamps ? currentTimestamps : undefined);
        } catch (err) {
          console.error('[BatchUpdateManager] Error in update listener:', err);
        }
      });
      
      // Notify completion listeners
      this.completionListeners.forEach(listener => {
        try {
          listener(updates);
        } catch (err) {
          console.error('[BatchUpdateManager] Error in completion listener:', err);
        }
      });
    }
    
    performanceMonitor.endTimer('batchUpdate_process');
    return updates;
  }
  
  /**
   * Alias for processQueue - used for compatibility with different naming conventions
   */
  flush(callback?: (updates: Record<string, T>) => void): Record<string, T> {
    return this.processQueue(callback);
  }
  
  /**
   * Cancel any pending updates and clear the queue
   */
  cancelUpdates(): void {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.queue.clear();
  }
  
  /**
   * Alias for cancelUpdates - used for compatibility with different naming conventions
   */
  clear(): void {
    this.cancelUpdates();
  }
  
  /**
   * Reset the batch manager to its initial state
   */
  reset(): void {
    this.cancelUpdates();
    this.updateListeners = [];
    this.completionListeners = [];
    this.timestamps = {};
  }
  
  /**
   * Get the current size of the batch queue
   * @returns The number of pending updates
   */
  get size(): number {
    return this.queue.size;
  }
  
  /**
   * Check if the batch queue is empty
   * @returns True if the queue is empty, false otherwise
   */
  get isEmpty(): boolean {
    return this.queue.size === 0;
  }
}

/**
 * Section Loader for Progressive Loading
 * 
 * This utility helps implement progressive loading of form sections.
 * It loads sections incrementally based on priority, visibility, or other criteria.
 */
export class ProgressiveSectionLoader {
  private loadedSections: Set<string> = new Set();
  private initialBatchSize: number;
  private loadBatchSize: number;
  private loadDelay: number;
  private timeout: number | null = null;
  
  /**
   * Create a new ProgressiveSectionLoader
   * @param initialBatchSize Number of sections to load initially (default: 2)
   * @param loadBatchSize Number of sections to load in each subsequent batch (default: 1)
   * @param loadDelay Delay in ms between loading batches (default: 300)
   */
  constructor(initialBatchSize = 2, loadBatchSize = 1, loadDelay = 300) {
    this.initialBatchSize = initialBatchSize;
    this.loadBatchSize = loadBatchSize;
    this.loadDelay = loadDelay;
  }
  
  /**
   * Initialize the loader with sections to load
   * @param sectionIds Array of all section IDs that will be loaded
   * @param initialSections Optional array of section IDs to load immediately
   * @param onSectionLoaded Callback called when a section is loaded
   */
  initialize(
    sectionIds: string[],
    initialSections: string[] | null = null,
    onSectionLoaded: (sectionId: string) => void
  ): void {
    performanceMonitor.startTimer('progressiveLoader_init');
    
    // If initial sections are specified, load them directly
    if (initialSections && initialSections.length > 0) {
      initialSections.forEach(sectionId => {
        this.loadedSections.add(sectionId);
        onSectionLoaded(sectionId);
      });
    } else {
      // Otherwise, load the initial batch based on the order
      const initialBatch = sectionIds.slice(0, this.initialBatchSize);
      initialBatch.forEach(sectionId => {
        this.loadedSections.add(sectionId);
        onSectionLoaded(sectionId);
      });
    }
    
    // Schedule loading the remaining sections
    this.scheduleNextBatch(sectionIds, onSectionLoaded);
    
    performanceMonitor.endTimer('progressiveLoader_init');
  }
  
  /**
   * Schedule loading the next batch of sections
   * @param allSections Array of all section IDs
   * @param onSectionLoaded Callback called when a section is loaded
   */
  private scheduleNextBatch(
    allSections: string[],
    onSectionLoaded: (sectionId: string) => void
  ): void {
    // Filter out already loaded sections
    const remainingSections = allSections.filter(id => !this.loadedSections.has(id));
    
    // If there are no remaining sections, we're done
    if (remainingSections.length === 0) {
      return;
    }
    
    // Get the next batch of sections to load
    const nextBatch = remainingSections.slice(0, this.loadBatchSize);
    
    // Schedule loading the next batch
    this.timeout = window.setTimeout(() => {
      performanceMonitor.startTimer('progressiveLoader_batch');
      
      // Load each section in the batch
      nextBatch.forEach(sectionId => {
        this.loadedSections.add(sectionId);
        onSectionLoaded(sectionId);
      });
      
      performanceMonitor.endTimer('progressiveLoader_batch');
      
      // Schedule the next batch
      this.scheduleNextBatch(allSections, onSectionLoaded);
    }, this.loadDelay);
  }
  
  /**
   * Check if a section has been loaded
   * @param sectionId The ID of the section to check
   * @returns True if the section has been loaded, false otherwise
   */
  isSectionLoaded(sectionId: string): boolean {
    return this.loadedSections.has(sectionId);
  }
  
  /**
   * Load a specific section immediately
   * @param sectionId The ID of the section to load
   * @param onSectionLoaded Callback called when the section is loaded
   * @returns True if the section was newly loaded, false if already loaded
   */
  loadSectionImmediately(
    sectionId: string,
    onSectionLoaded: (sectionId: string) => void
  ): boolean {
    if (!this.loadedSections.has(sectionId)) {
      this.loadedSections.add(sectionId);
      onSectionLoaded(sectionId);
      return true;
    }
    return false;
  }
  
  /**
   * Cancel any pending section loads
   */
  cancelLoading(): void {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
  
  /**
   * Get the number of loaded sections
   * @returns The number of loaded sections
   */
  get loadedCount(): number {
    return this.loadedSections.size;
  }
  
  /**
   * Reset the loader and clear all loaded sections
   */
  reset(): void {
    this.cancelLoading();
    this.loadedSections.clear();
  }
}



// Create a singleton instance of the performance monitor
export const performanceMonitor = new FormPerformanceMonitor();

// Create a singleton instance of the progressive section loader
export const progressiveLoader = new ProgressiveSectionLoader();

// Create a singleton instance of the batch update manager
export const FormBatchUpdater = new BatchUpdateManagerImpl();

// Export the BatchUpdateManager type for compatibility with existing code
export type BatchUpdateManager<T = any> = BatchUpdateManagerImpl<T>;
export const BatchUpdateManager = BatchUpdateManagerImpl;
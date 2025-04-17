/**
 * Form Optimization Toolkit
 * 
 * This module provides utilities for measuring, monitoring, and optimizing form performance
 * with a focus on large forms (120+ fields). It includes:
 * 
 * - Feature flags for enabling/disabling optimizations
 * - Performance metrics collection and reporting
 * - Verification systems for ensuring optimization safety
 * - Fallback mechanisms to maintain stability
 * 
 * IMPORTANT: All optimizations must be feature-flagged and have fallback mechanisms
 */

// Configuration for enabling/disabling optimization features
export const OptimizationFeatures = {
  // Controls section-based progressive loading
  PROGRESSIVE_LOADING: false,
  
  // Controls section-based saving instead of whole-form saving
  SECTION_BASED_SAVING: false,
  
  // Controls virtual scrolling for large sections
  VIRTUALIZED_RENDERING: false,
  
  // Controls batched updates instead of per-field updates
  DEBOUNCED_UPDATES: false,
  
  // Controls timestamp optimization for conflict resolution
  OPTIMIZED_TIMESTAMPS: false
};

// Performance metrics tracking
interface PerformanceMetrics {
  // Load time metrics
  initialLoadStartTime: number;
  initialLoadEndTime: number;
  loadDuration: number;
  
  // Field processing metrics
  fieldCount: number;
  sectionCount: number;
  fieldsPerSecond: number;
  
  // UI metrics
  renderStartTime: number;
  renderEndTime: number;
  renderDuration: number;
  
  // Save operation metrics
  saveCount: number;
  lastSaveDuration: number;
  totalSaveDuration: number;
  averageSaveDuration: number;
  
  // Memory metrics
  initialMemoryUsage: number;
  peakMemoryUsage: number;
  currentMemoryUsage: number;
  
  // Custom timers for specific operations
  timers: Record<string, {
    startTime: number;
    endTime: number;
    duration: number;
    count: number;
    average: number;
  }>;
}

/**
 * Performance Monitoring Utility
 */
class FormPerformanceMonitor {
  private static instance: FormPerformanceMonitor;
  private metrics: PerformanceMetrics;
  private debugMode: boolean = false;
  private lastMemoryCheck: number = 0;
  private memoryCheckInterval: number = 5000; // 5 seconds
  
  // Event tracking for operations
  private events: Array<{
    timestamp: number;
    event: string;
    duration?: number;
    details?: any;
  }> = [];
  
  private constructor() {
    // Initialize performance metrics
    this.metrics = {
      initialLoadStartTime: 0,
      initialLoadEndTime: 0,
      loadDuration: 0,
      
      fieldCount: 0,
      sectionCount: 0,
      fieldsPerSecond: 0,
      
      renderStartTime: 0,
      renderEndTime: 0,
      renderDuration: 0,
      
      saveCount: 0,
      lastSaveDuration: 0,
      totalSaveDuration: 0,
      averageSaveDuration: 0,
      
      initialMemoryUsage: this.getMemoryUsage(),
      peakMemoryUsage: this.getMemoryUsage(),
      currentMemoryUsage: this.getMemoryUsage(),
      
      timers: {}
    };
    
    this.lastMemoryCheck = Date.now();
    
    // Setup interval to check memory usage periodically
    setInterval(() => this.updateMemoryMetrics(), this.memoryCheckInterval);
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): FormPerformanceMonitor {
    if (!FormPerformanceMonitor.instance) {
      FormPerformanceMonitor.instance = new FormPerformanceMonitor();
    }
    return FormPerformanceMonitor.instance;
  }
  
  /**
   * Enable or disable debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.logInfo(`Performance monitoring debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Start tracking initial form load
   */
  public startInitialLoad(): void {
    this.metrics.initialLoadStartTime = performance.now();
    this.addEvent('initialLoadStart');
    this.logInfo('Starting initial load timing');
  }
  
  /**
   * End tracking initial form load
   */
  public endInitialLoad(fieldCount: number, sectionCount: number): void {
    this.metrics.initialLoadEndTime = performance.now();
    this.metrics.loadDuration = this.metrics.initialLoadEndTime - this.metrics.initialLoadStartTime;
    this.metrics.fieldCount = fieldCount;
    this.metrics.sectionCount = sectionCount;
    
    // Calculate fields processed per second
    if (this.metrics.loadDuration > 0) {
      this.metrics.fieldsPerSecond = (fieldCount / this.metrics.loadDuration) * 1000;
    }
    
    this.addEvent('initialLoadEnd', this.metrics.loadDuration, {
      fieldCount,
      sectionCount,
      fieldsPerSecond: this.metrics.fieldsPerSecond
    });
    
    this.logInfo(`Initial load completed in ${this.metrics.loadDuration.toFixed(2)}ms`);
    this.logInfo(`Processed ${fieldCount} fields across ${sectionCount} sections`);
    this.logInfo(`Processing speed: ${this.metrics.fieldsPerSecond.toFixed(2)} fields/second`);
  }
  
  /**
   * Start tracking render time
   */
  public startRender(): void {
    this.metrics.renderStartTime = performance.now();
    this.addEvent('renderStart');
    this.logInfo('Starting render timing');
  }
  
  /**
   * End tracking render time
   */
  public endRender(): void {
    this.metrics.renderEndTime = performance.now();
    this.metrics.renderDuration = this.metrics.renderEndTime - this.metrics.renderStartTime;
    
    this.addEvent('renderEnd', this.metrics.renderDuration);
    this.logInfo(`Render completed in ${this.metrics.renderDuration.toFixed(2)}ms`);
  }
  
  /**
   * Start tracking a save operation
   */
  public startSaveOperation(): number {
    const startTime = performance.now();
    this.addEvent('saveStart');
    this.logInfo('Starting save operation timing');
    return startTime;
  }
  
  /**
   * End tracking a save operation
   */
  public endSaveOperation(startTime: number): void {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.metrics.saveCount++;
    this.metrics.lastSaveDuration = duration;
    this.metrics.totalSaveDuration += duration;
    this.metrics.averageSaveDuration = this.metrics.totalSaveDuration / this.metrics.saveCount;
    
    this.addEvent('saveEnd', duration, {
      saveCount: this.metrics.saveCount,
      averageDuration: this.metrics.averageSaveDuration
    });
    
    this.logInfo(`Save operation completed in ${duration.toFixed(2)}ms`);
    this.logInfo(`Average save duration: ${this.metrics.averageSaveDuration.toFixed(2)}ms`);
  }
  
  /**
   * Start a custom timer
   */
  public startTimer(name: string): void {
    if (!this.metrics.timers[name]) {
      this.metrics.timers[name] = {
        startTime: performance.now(),
        endTime: 0,
        duration: 0,
        count: 0,
        average: 0
      };
    } else {
      this.metrics.timers[name].startTime = performance.now();
    }
    
    this.addEvent(`timer:${name}:start`);
    this.logInfo(`Starting timer: ${name}`);
  }
  
  /**
   * End a custom timer
   */
  public endTimer(name: string): number {
    if (!this.metrics.timers[name]) {
      this.logError(`Timer "${name}" was never started`);
      return 0;
    }
    
    this.metrics.timers[name].endTime = performance.now();
    this.metrics.timers[name].duration = this.metrics.timers[name].endTime - this.metrics.timers[name].startTime;
    this.metrics.timers[name].count++;
    this.metrics.timers[name].average = 
      (this.metrics.timers[name].average * (this.metrics.timers[name].count - 1) + 
      this.metrics.timers[name].duration) / this.metrics.timers[name].count;
    
    const duration = this.metrics.timers[name].duration;
    
    this.addEvent(`timer:${name}:end`, duration, {
      count: this.metrics.timers[name].count,
      average: this.metrics.timers[name].average
    });
    
    this.logInfo(`Timer "${name}" completed in ${duration.toFixed(2)}ms`);
    this.logInfo(`Average time for "${name}": ${this.metrics.timers[name].average.toFixed(2)}ms`);
    
    return duration;
  }
  
  /**
   * Get the current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    // Update memory usage before returning metrics
    this.updateMemoryMetrics();
    return { ...this.metrics };
  }
  
  /**
   * Get performance events
   */
  public getEvents(): Array<{
    timestamp: number;
    event: string;
    duration?: number;
    details?: any;
  }> {
    return [...this.events];
  }
  
  /**
   * Clear all metrics and events
   */
  public reset(): void {
    this.events = [];
    
    // Reset metrics while preserving initial memory value
    const initialMemory = this.metrics.initialMemoryUsage;
    
    this.metrics = {
      initialLoadStartTime: 0,
      initialLoadEndTime: 0,
      loadDuration: 0,
      
      fieldCount: 0,
      sectionCount: 0,
      fieldsPerSecond: 0,
      
      renderStartTime: 0,
      renderEndTime: 0,
      renderDuration: 0,
      
      saveCount: 0,
      lastSaveDuration: 0,
      totalSaveDuration: 0,
      averageSaveDuration: 0,
      
      initialMemoryUsage: initialMemory,
      peakMemoryUsage: this.getMemoryUsage(),
      currentMemoryUsage: this.getMemoryUsage(),
      
      timers: {}
    };
    
    this.addEvent('metricsReset');
    this.logInfo('Performance metrics have been reset');
  }
  
  /**
   * Create a performance report
   */
  public generateReport(): string {
    const report = [
      '## Form Performance Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '### Load Metrics',
      `- Initial Load Time: ${this.metrics.loadDuration.toFixed(2)}ms`,
      `- Fields: ${this.metrics.fieldCount}`,
      `- Sections: ${this.metrics.sectionCount}`,
      `- Processing Speed: ${this.metrics.fieldsPerSecond.toFixed(2)} fields/second`,
      '',
      '### Render Metrics',
      `- Render Time: ${this.metrics.renderDuration.toFixed(2)}ms`,
      '',
      '### Save Operation Metrics',
      `- Save Operations: ${this.metrics.saveCount}`,
      `- Last Save Duration: ${this.metrics.lastSaveDuration.toFixed(2)}ms`,
      `- Average Save Duration: ${this.metrics.averageSaveDuration.toFixed(2)}ms`,
      '',
      '### Memory Usage',
      `- Initial: ${this.formatMemory(this.metrics.initialMemoryUsage)}`,
      `- Peak: ${this.formatMemory(this.metrics.peakMemoryUsage)}`,
      `- Current: ${this.formatMemory(this.metrics.currentMemoryUsage)}`,
      '',
      '### Custom Timers'
    ];
    
    // Add custom timers to report
    Object.entries(this.metrics.timers).forEach(([name, timer]) => {
      report.push(`- ${name}: ${timer.average.toFixed(2)}ms (${timer.count} executions)`);
    });
    
    // Add optimization feature status
    report.push('', '### Optimization Features');
    Object.entries(OptimizationFeatures).forEach(([feature, enabled]) => {
      report.push(`- ${feature}: ${enabled ? 'Enabled' : 'Disabled'}`);
    });
    
    // Return formatted report
    return report.join('\n');
  }
  
  /**
   * Add an event to the event log
   */
  private addEvent(event: string, duration?: number, details?: any): void {
    this.events.push({
      timestamp: Date.now(),
      event,
      duration,
      details
    });
    
    // Keep only the last 100 events to prevent memory issues
    if (this.events.length > 100) {
      this.events.shift();
    }
  }
  
  /**
   * Update memory usage metrics
   */
  private updateMemoryMetrics(): void {
    // Only check memory every few seconds to avoid performance impact
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }
    
    this.lastMemoryCheck = now;
    const currentMemory = this.getMemoryUsage();
    
    this.metrics.currentMemoryUsage = currentMemory;
    
    // Update peak memory if current is higher
    if (currentMemory > this.metrics.peakMemoryUsage) {
      this.metrics.peakMemoryUsage = currentMemory;
      this.addEvent('newPeakMemory', undefined, { memory: this.formatMemory(currentMemory) });
      this.logInfo(`New peak memory usage: ${this.formatMemory(currentMemory)}`);
    }
  }
  
  /**
   * Get current memory usage if available
   */
  private getMemoryUsage(): number {
    try {
      // Chrome-specific memory API
      if (typeof window !== 'undefined' && 
          window.performance && 
          (window.performance as any).memory && 
          (window.performance as any).memory.usedJSHeapSize) {
        return (window.performance as any).memory.usedJSHeapSize;
      }
      
      // Fallback for environments where memory API is not available
      return 0;
    } catch (e) {
      // Some browsers might throw security exceptions when accessing memory
      return 0;
    }
  }
  
  /**
   * Format memory size for display
   */
  private formatMemory(bytes: number): string {
    if (bytes === 0) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }
  
  /**
   * Log information message if debug mode is enabled
   */
  private logInfo(message: string): void {
    if (this.debugMode) {
      console.log(`%c[Form Performance] ${message}`, 'color: #2196F3');
    }
  }
  
  /**
   * Log error message
   */
  private logError(message: string): void {
    console.error(`%c[Form Performance] ${message}`, 'color: #F44336');
  }
}

/**
 * Health Check System for Form Optimizations
 */
class OptimizationHealthCheck {
  private static instance: OptimizationHealthCheck;
  
  // Health status tracking
  private healthStatus = {
    isHealthy: true,
    failedChecks: 0,
    lastError: null as Error | null,
    errors: [] as Array<{
      operation: string;
      timestamp: string;
      error: string;
    }>,
    disabledFeatures: [] as string[]
  };
  
  // Check thresholds
  private failureThreshold = 3; // Disable optimization after 3 failures
  private autoResetInterval = 30 * 60 * 1000; // Try re-enabling after 30 minutes
  
  private constructor() {
    // Setup reset timer
    setInterval(() => this.resetFailureCounters(), this.autoResetInterval);
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): OptimizationHealthCheck {
    if (!OptimizationHealthCheck.instance) {
      OptimizationHealthCheck.instance = new OptimizationHealthCheck();
    }
    return OptimizationHealthCheck.instance;
  }
  
  /**
   * Run a health check on an optimization operation
   */
  public check(operation: string, data: any): boolean {
    try {
      // Operation-specific validation
      switch(operation) {
        case 'formDataLoaded':
          if (!data || !data.values || Object.keys(data.values).length === 0) {
            throw new Error('Form data is empty after loading');
          }
          break;
          
        case 'sectionSaved':
          if (!data || !data.success) {
            throw new Error('Section save operation failed');
          }
          break;
          
        case 'fieldProcessing':
          if (!data || !data.fields || !Array.isArray(data.fields) || data.fields.length === 0) {
            throw new Error('Field processing failed to produce valid fields');
          }
          break;
          
        case 'stateUpdate':
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid state update data');
          }
          break;
          
        // Add more validation cases as needed
      }
      
      // Log success
      console.log(`%c[HEALTH CHECK] ✅ Operation "${operation}" passed validation`, 'color: #4CAF50');
      return true;
      
    } catch (error: any) {
      // Update health status
      this.healthStatus.isHealthy = false;
      this.healthStatus.failedChecks++;
      this.healthStatus.lastError = error;
      this.healthStatus.errors.push({
        operation,
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      // Keep only last 10 errors
      if (this.healthStatus.errors.length > 10) {
        this.healthStatus.errors.shift();
      }
      
      // Log failure
      console.error(`%c[HEALTH CHECK] ❌ Operation "${operation}" failed validation:`, 'color: #F44336', error);
      
      // If too many failures, disable related optimizations
      if (this.healthStatus.failedChecks >= this.failureThreshold) {
        console.error('%c[HEALTH CHECK] ⛔ Too many failures, disabling related optimizations', 'color: #F44336; font-weight: bold');
        
        // Determine which feature to disable based on operation
        const feature = this.mapOperationToFeature(operation);
        if (feature && OptimizationFeatures[feature as keyof typeof OptimizationFeatures]) {
          // Disable the feature
          (OptimizationFeatures as any)[feature] = false;
          
          // Track disabled features
          if (!this.healthStatus.disabledFeatures.includes(feature)) {
            this.healthStatus.disabledFeatures.push(feature);
          }
          
          console.error(`%c[HEALTH CHECK] Disabled optimization feature: ${feature}`, 'color: #F44336');
        }
      }
      
      return false;
    }
  }
  
  /**
   * Get current health status
   */
  public getStatus(): typeof this.healthStatus {
    return { ...this.healthStatus };
  }
  
  /**
   * Map an operation to a feature flag
   */
  private mapOperationToFeature(operation: string): string | null {
    const mapping: Record<string, keyof typeof OptimizationFeatures> = {
      'formDataLoaded': 'PROGRESSIVE_LOADING',
      'sectionSaved': 'SECTION_BASED_SAVING',
      'fieldProcessing': 'PROGRESSIVE_LOADING',
      'stateUpdate': 'DEBOUNCED_UPDATES',
      'virtualScroll': 'VIRTUALIZED_RENDERING',
      'timestampMerge': 'OPTIMIZED_TIMESTAMPS'
    };
    
    return mapping[operation] || null;
  }
  
  /**
   * Reset failure counters periodically to retry optimizations
   */
  private resetFailureCounters(): void {
    if (this.healthStatus.failedChecks > 0) {
      console.log('%c[HEALTH CHECK] Resetting failure counters and re-enabling optimizations', 'color: #2196F3');
      
      // Reset counters
      this.healthStatus.failedChecks = 0;
      
      // Re-enable disabled features
      this.healthStatus.disabledFeatures.forEach(feature => {
        if (feature in OptimizationFeatures) {
          (OptimizationFeatures as any)[feature] = true;
          console.log(`%c[HEALTH CHECK] Re-enabled optimization feature: ${feature}`, 'color: #4CAF50');
        }
      });
      
      this.healthStatus.disabledFeatures = [];
      this.healthStatus.isHealthy = true;
    }
  }
}

// Export singleton instances
export const performanceMonitor = FormPerformanceMonitor.getInstance();
export const healthCheck = OptimizationHealthCheck.getInstance();

/**
 * Safely run an optimized implementation with fallback
 */
export function safelyRunOptimizedCode<T>(
  optimizedFn: () => T,
  fallbackFn: () => T,
  operationName: string,
  featureFlag: keyof typeof OptimizationFeatures
): T {
  // Check if the optimization is enabled
  if (!OptimizationFeatures[featureFlag]) {
    return fallbackFn();
  }
  
  // Start timing the operation
  performanceMonitor.startTimer(`${operationName}`);
  
  try {
    // Run the optimized implementation
    const result = optimizedFn();
    
    // Verify that the result is valid
    const isValid = healthCheck.check(operationName, result);
    
    // End timing
    performanceMonitor.endTimer(`${operationName}`);
    
    if (!isValid) {
      console.warn(`%c[OPTIMIZATION] ${operationName} produced invalid result, using fallback`, 'color: #FF9800');
      return fallbackFn();
    }
    
    return result;
  } catch (error) {
    // Log the error
    console.error(`%c[OPTIMIZATION] Error in ${operationName}:`, 'color: #F44336', error);
    
    // End timing (even though it failed)
    performanceMonitor.endTimer(`${operationName}`);
    
    // Record the failure in health check
    healthCheck.check(operationName, { error });
    
    // Fall back to original implementation
    return fallbackFn();
  }
}

/**
 * Initialize optimization monitoring
 * Call this early in the application lifecycle
 */
export function initializeOptimizationMonitoring(debugMode: boolean = false): void {
  performanceMonitor.setDebugMode(debugMode);
  console.log('%c[OPTIMIZATION] Monitoring initialized', 'color: #2196F3');
  
  // Enable debug mode in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    performanceMonitor.setDebugMode(true);
  }
}
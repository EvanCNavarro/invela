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
  PROGRESSIVE_LOADING: true,
  
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
/**
 * Progressive Loading Utility for Form Sections
 * 
 * This utility implements progressive loading strategies for large forms,
 * prioritizing visible sections first and then loading additional sections
 * in the background to improve perceived performance.
 */
class ProgressiveLoader {
  private static instance: ProgressiveLoader;
  private loadQueue: Array<{
    sectionId: string;
    priority: number;
    loaded: boolean;
    startTime?: number;
    endTime?: number;
  }> = [];
  private loading: boolean = false;
  private currentSection: string | null = null;
  private loadedSections: Set<string> = new Set();
  private callbacks: {
    onSectionLoad: Array<(sectionId: string) => void>;
    onAllSectionsLoad: Array<() => void>;
  } = {
    onSectionLoad: [],
    onAllSectionsLoad: []
  };
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ProgressiveLoader {
    if (!ProgressiveLoader.instance) {
      ProgressiveLoader.instance = new ProgressiveLoader();
    }
    return ProgressiveLoader.instance;
  }
  
  /**
   * Initialize the progressive loader with section information
   */
  public initialize(sections: Array<{ id: string; title: string; priority?: number }>, currentSectionId?: string): void {
    this.reset();
    
    // Set current section if provided
    if (currentSectionId) {
      this.currentSection = currentSectionId;
    }
    
    // Add sections to load queue
    this.loadQueue = sections.map(section => ({
      sectionId: section.id,
      // Priority: 1 = highest, 10 = lowest
      // Current section gets priority 1, rest are ordered based on provided priority or default to 5
      priority: section.id === this.currentSection ? 1 : (section.priority || 5),
      loaded: false
    }));
    
    // Sort by priority (lower number = higher priority)
    this.sortQueue();
    
    console.log('%c[PROGRESSIVE LOADING] Initialized with', 'color: #4CAF50', 
      { sections: this.loadQueue.length, currentSection: this.currentSection });
  }
  
  /**
   * Mark the current visible section (updates priorities)
   */
  public setCurrentSection(sectionId: string): void {
    if (this.currentSection === sectionId) return;
    
    this.currentSection = sectionId;
    
    // Update priorities: current section gets highest priority
    this.loadQueue.forEach(item => {
      if (item.sectionId === sectionId && !item.loaded) {
        item.priority = 1;
      }
    });
    
    this.sortQueue();
    
    console.log('%c[PROGRESSIVE LOADING] Current section set to', 'color: #4CAF50', sectionId);
  }
  
  /**
   * Start the loading process for all sections based on priority
   */
  public startLoading(parallel: boolean = false): void {
    if (this.loading) return;
    
    this.loading = true;
    
    if (parallel) {
      // Load all sections in parallel
      this.loadAllSectionsParallel();
    } else {
      // Load sections sequentially based on priority
      this.loadNextSection();
    }
  }
  
  /**
   * Load all sections in parallel (faster but may impact performance)
   */
  private loadAllSectionsParallel(): void {
    const unloadedSections = this.loadQueue.filter(item => !item.loaded);
    
    if (unloadedSections.length === 0) {
      this.finishLoading();
      return;
    }
    
    // Load all remaining sections at once
    Promise.all(unloadedSections.map(item => this.simulateLoadSection(item.sectionId)))
      .then(() => {
        console.log('%c[PROGRESSIVE LOADING] All sections loaded in parallel', 'color: #4CAF50');
        this.finishLoading();
      });
  }
  
  /**
   * Load the next section in the queue
   */
  private loadNextSection(): void {
    // Find the next unloaded section with highest priority
    const nextSection = this.loadQueue.find(item => !item.loaded);
    
    if (!nextSection) {
      this.finishLoading();
      return;
    }
    
    nextSection.startTime = performance.now();
    
    // Simulate loading the section data
    this.simulateLoadSection(nextSection.sectionId)
      .then(() => {
        nextSection.loaded = true;
        nextSection.endTime = performance.now();
        this.loadedSections.add(nextSection.sectionId);
        
        // Notify listeners
        this.notifySectionLoaded(nextSection.sectionId);
        
        // Continue loading the next section
        setTimeout(() => this.loadNextSection(), 0);
      });
  }
  
  /**
   * Simulate loading a section (in a real app, this would fetch actual data)
   */
  private simulateLoadSection(sectionId: string): Promise<void> {
    return new Promise((resolve) => {
      console.log('%c[PROGRESSIVE LOADING] Loading section', 'color: #4CAF50', sectionId);
      
      // Log start for metrics
      performanceMonitor.startTimer(`loadSection_${sectionId}`);
      
      // Simulate network delay based on priority
      // Higher priority sections load faster
      const section = this.loadQueue.find(s => s.sectionId === sectionId);
      const delay = section ? Math.max(50, 100 * section.priority) : 500;
      
      setTimeout(() => {
        // Log completion for metrics
        performanceMonitor.endTimer(`loadSection_${sectionId}`);
        console.log('%c[PROGRESSIVE LOADING] Section loaded', 'color: #4CAF50', sectionId);
        resolve();
      }, delay);
    });
  }
  
  /**
   * Finish the loading process
   */
  private finishLoading(): void {
    this.loading = false;
    
    // Check if all sections are loaded
    const allLoaded = this.loadQueue.every(item => item.loaded);
    
    if (allLoaded) {
      console.log('%c[PROGRESSIVE LOADING] All sections loaded', 'color: #4CAF50');
      this.notifyAllSectionsLoaded();
    }
  }
  
  /**
   * Sort the loading queue by priority
   */
  private sortQueue(): void {
    this.loadQueue.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Check if a section is loaded
   */
  public isSectionLoaded(sectionId: string): boolean {
    return this.loadedSections.has(sectionId);
  }
  
  /**
   * Get loading stats for all sections
   */
  public getLoadingStats(): Array<{
    sectionId: string;
    priority: number;
    loaded: boolean;
    loadTime?: number;
  }> {
    return this.loadQueue.map(item => ({
      sectionId: item.sectionId,
      priority: item.priority,
      loaded: item.loaded,
      loadTime: item.startTime && item.endTime ? item.endTime - item.startTime : undefined
    }));
  }
  
  /**
   * Register a callback for when a section is loaded
   */
  public onSectionLoad(callback: (sectionId: string) => void): void {
    this.callbacks.onSectionLoad.push(callback);
  }
  
  /**
   * Register a callback for when all sections are loaded
   */
  public onAllSectionsLoad(callback: () => void): void {
    this.callbacks.onAllSectionsLoad.push(callback);
  }
  
  /**
   * Notify listeners that a section has loaded
   */
  private notifySectionLoaded(sectionId: string): void {
    this.callbacks.onSectionLoad.forEach(callback => callback(sectionId));
  }
  
  /**
   * Notify listeners that all sections have loaded
   */
  private notifyAllSectionsLoaded(): void {
    this.callbacks.onAllSectionsLoad.forEach(callback => callback());
  }
  
  /**
   * Reset the loader state
   */
  public reset(): void {
    this.loadQueue = [];
    this.loading = false;
    this.currentSection = null;
    this.loadedSections.clear();
  }
}

export const performanceMonitor = FormPerformanceMonitor.getInstance();
export const healthCheck = OptimizationHealthCheck.getInstance();
export const progressiveLoader = ProgressiveLoader.getInstance();

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
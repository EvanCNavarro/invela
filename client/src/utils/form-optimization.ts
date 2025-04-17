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
    this.metrics.fieldsPerSecond = fieldCount / (this.metrics.loadDuration / 1000);
    
    this.addEvent('initialLoadEnd', this.metrics.loadDuration, {
      fieldCount,
      sectionCount,
      fieldsPerSecond: this.metrics.fieldsPerSecond
    });
    
    this.logInfo(`Finished initial load timing: ${this.metrics.loadDuration.toFixed(2)}ms, ${fieldCount} fields, ${sectionCount} sections`);
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
    
    this.logInfo(`Finished render timing: ${this.metrics.renderDuration.toFixed(2)}ms`);
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
      average: this.metrics.averageSaveDuration
    });
    
    this.logInfo(`Finished save timing: ${duration.toFixed(2)}ms, avg: ${this.metrics.averageSaveDuration.toFixed(2)}ms`);
  }
  
  /**
   * Start a custom timer
   */
  public startTimer(name: string): void {
    if (!this.metrics.timers[name]) {
      this.metrics.timers[name] = {
        startTime: 0,
        endTime: 0,
        duration: 0,
        count: 0,
        average: 0
      };
    }
    
    this.metrics.timers[name].startTime = performance.now();
    this.addEvent(`timerStart_${name}`);
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
      (this.metrics.timers[name].average * (this.metrics.timers[name].count - 1) + this.metrics.timers[name].duration) / 
      this.metrics.timers[name].count;
    
    this.addEvent(`timerEnd_${name}`, this.metrics.timers[name].duration, {
      count: this.metrics.timers[name].count,
      average: this.metrics.timers[name].average
    });
    
    this.logInfo(`Ended timer "${name}": ${this.metrics.timers[name].duration.toFixed(2)}ms, avg: ${this.metrics.timers[name].average.toFixed(2)}ms`);
    
    return this.metrics.timers[name].duration;
  }
  
  /**
   * Get the current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    // Update memory metrics before returning
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
    
    this.events = [];
    this.logInfo('Performance metrics reset');
  }
  
  /**
   * Create a performance report
   */
  public generateReport(): string {
    // Update memory metrics before generating report
    this.updateMemoryMetrics();
    
    let report = `=== FORM PERFORMANCE REPORT ===\n`;
    report += `Time: ${new Date().toISOString()}\n\n`;
    
    // Load metrics
    report += `LOAD METRICS:\n`;
    report += `- Load time: ${this.metrics.loadDuration.toFixed(2)}ms\n`;
    report += `- Fields: ${this.metrics.fieldCount}\n`;
    report += `- Sections: ${this.metrics.sectionCount}\n`;
    report += `- Fields per second: ${this.metrics.fieldsPerSecond.toFixed(2)}\n\n`;
    
    // Render metrics
    report += `RENDER METRICS:\n`;
    report += `- Last render time: ${this.metrics.renderDuration.toFixed(2)}ms\n\n`;
    
    // Save metrics
    report += `SAVE METRICS:\n`;
    report += `- Save operations: ${this.metrics.saveCount}\n`;
    report += `- Last save time: ${this.metrics.lastSaveDuration.toFixed(2)}ms\n`;
    report += `- Average save time: ${this.metrics.averageSaveDuration.toFixed(2)}ms\n\n`;
    
    // Memory metrics
    report += `MEMORY METRICS:\n`;
    report += `- Initial: ${this.formatMemory(this.metrics.initialMemoryUsage)}\n`;
    report += `- Peak: ${this.formatMemory(this.metrics.peakMemoryUsage)}\n`;
    report += `- Current: ${this.formatMemory(this.metrics.currentMemoryUsage)}\n\n`;
    
    // Custom timers
    report += `CUSTOM TIMERS:\n`;
    Object.entries(this.metrics.timers).forEach(([name, timer]) => {
      report += `- ${name}: ${timer.duration.toFixed(2)}ms (avg: ${timer.average.toFixed(2)}ms, count: ${timer.count})\n`;
    });
    
    return report;
  }
  
  /**
   * Add an event to the event log
   */
  private addEvent(event: string, duration?: number, details?: any): void {
    this.events.push({
      timestamp: performance.now(),
      event,
      duration,
      details
    });
    
    // Limit event log size to avoid memory issues
    if (this.events.length > 1000) {
      this.events.shift();
    }
  }
  
  /**
   * Update memory usage metrics
   */
  private updateMemoryMetrics(): void {
    // Only check memory every few seconds to avoid performance issues
    if (Date.now() - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }
    
    this.lastMemoryCheck = Date.now();
    const currentMemory = this.getMemoryUsage();
    
    this.metrics.currentMemoryUsage = currentMemory;
    
    // Update peak memory usage
    if (currentMemory > this.metrics.peakMemoryUsage) {
      this.metrics.peakMemoryUsage = currentMemory;
    }
  }
  
  /**
   * Get current memory usage if available
   */
  private getMemoryUsage(): number {
    try {
      if (typeof performance !== 'undefined' && performance.memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }
  
  /**
   * Format memory size for display
   */
  private formatMemory(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

/**
 * Health Check Monitor for Optimization Features
 * 
 * Tracks the health of optimization features and ensures they're producing valid results.
 * This allows for graceful fallbacks when optimizations fail or produce unexpected results.
 */
class OptimizationHealthCheck {
  private static instance: OptimizationHealthCheck;
  private healthStatus: Record<string, {
    lastSuccess: number;
    lastFailure: number;
    successCount: number;
    failureCount: number;
    enabled: boolean;
  }> = {};
  
  private constructor() {}
  
  public static getInstance(): OptimizationHealthCheck {
    if (!OptimizationHealthCheck.instance) {
      OptimizationHealthCheck.instance = new OptimizationHealthCheck();
    }
    return OptimizationHealthCheck.instance;
  }
  
  /**
   * Check if a result is valid and track health status
   */
  public check(operationName: string, result: any): boolean {
    // Initialize health status for this operation if it doesn't exist
    if (!this.healthStatus[operationName]) {
      this.healthStatus[operationName] = {
        lastSuccess: 0,
        lastFailure: 0,
        successCount: 0,
        failureCount: 0,
        enabled: true
      };
    }
    
    // Basic sanity checks
    const isValid = this.validateResult(operationName, result);
    
    // Update health status
    if (isValid) {
      this.healthStatus[operationName].lastSuccess = Date.now();
      this.healthStatus[operationName].successCount++;
    } else {
      this.healthStatus[operationName].lastFailure = Date.now();
      this.healthStatus[operationName].failureCount++;
      
      // Disable the optimization if it fails too frequently
      if (this.healthStatus[operationName].failureCount > 5 && 
          this.healthStatus[operationName].failureCount > this.healthStatus[operationName].successCount) {
        this.healthStatus[operationName].enabled = false;
      }
    }
    
    return isValid;
  }
  
  /**
   * Validate a result based on operation type
   */
  private validateResult(operationName: string, result: any): boolean {
    // Handle errors
    if (result && result.error) {
      return false;
    }
    
    // Different validations for different operations
    switch (operationName) {
      case 'getFields':
        return Array.isArray(result) && result.length > 0;
        
      case 'getSections':
        return Array.isArray(result) && result.length > 0;
        
      case 'getFormData':
        return result && typeof result === 'object';
        
      case 'calculateProgress':
        return typeof result === 'number' && result >= 0 && result <= 100;
        
      // Add more validations as needed
        
      default:
        // For operations without specific validation, just check it's not null/undefined
        return result !== null && result !== undefined;
    }
  }
  
  /**
   * Check if an optimization is still enabled based on health status
   */
  public isEnabled(operationName: string): boolean {
    return !this.healthStatus[operationName] || this.healthStatus[operationName].enabled;
  }
  
  /**
   * Get current health status for all operations
   */
  public getHealthStatus(): Record<string, {
    lastSuccess: number;
    lastFailure: number;
    successCount: number;
    failureCount: number;
    enabled: boolean;
  }> {
    return { ...this.healthStatus };
  }
  
  /**
   * Reset health status (typically used in testing)
   */
  public reset(): void {
    this.healthStatus = {};
  }
}

/**
 * Progressive Loader Manager
 * 
 * Manages section-based loading for large forms.
 * This utility tracks which sections are loaded, which are currently loading,
 * and which should be loaded next based on user navigation patterns.
 */
class ProgressiveLoaderManager {
  private static instance: ProgressiveLoaderManager;
  private activeSectionId: string | null = null;
  private loadedSections: Set<string> = new Set();
  private loadingSections: Set<string> = new Set();
  private sectionLoadStats: Array<{
    id: string;
    loaded: boolean;
    loading: boolean;
    loadTime?: number;
    priority: number;
  }> = [];
  
  private constructor() {}
  
  public static getInstance(): ProgressiveLoaderManager {
    if (!ProgressiveLoaderManager.instance) {
      ProgressiveLoaderManager.instance = new ProgressiveLoaderManager();
    }
    return ProgressiveLoaderManager.instance;
  }
  
  /**
   * Set the active section that the user is currently viewing
   * This triggers the loading of that section and adjacent sections
   */
  public setActiveSection(sectionId: string): void {
    // Start performance monitoring
    performanceMonitor.startTimer('sectionActivation');
    
    this.activeSectionId = sectionId;
    
    // Mark section as loading if not already loaded
    if (!this.loadedSections.has(sectionId)) {
      this.loadingSections.add(sectionId);
      
      // Update stats
      const statIndex = this.sectionLoadStats.findIndex(s => s.id === sectionId);
      if (statIndex >= 0) {
        this.sectionLoadStats[statIndex].loading = true;
      }
    }
    
    // End performance monitoring
    performanceMonitor.endTimer('sectionActivation');
  }
  
  /**
   * Mark a section as loaded
   */
  public markSectionLoaded(sectionId: string): void {
    this.loadedSections.add(sectionId);
    this.loadingSections.delete(sectionId);
    
    // Update stats
    const loadTime = performanceMonitor.endTimer(`loadSection_${sectionId}`);
    const statIndex = this.sectionLoadStats.findIndex(s => s.id === sectionId);
    
    if (statIndex >= 0) {
      this.sectionLoadStats[statIndex].loaded = true;
      this.sectionLoadStats[statIndex].loading = false;
      this.sectionLoadStats[statIndex].loadTime = loadTime;
    } else {
      this.sectionLoadStats.push({
        id: sectionId,
        loaded: true,
        loading: false,
        loadTime,
        priority: 0
      });
    }
  }
  
  /**
   * Check if a section is currently loaded
   */
  public isSectionLoaded(sectionId: string): boolean {
    return this.loadedSections.has(sectionId);
  }
  
  /**
   * Check if a section is currently loading
   */
  public isSectionLoading(sectionId: string): boolean {
    return this.loadingSections.has(sectionId);
  }
  
  /**
   * Add a section to track (typically called during initialization)
   */
  public trackSection(sectionId: string, priority: number = 0): void {
    const existingStat = this.sectionLoadStats.find(s => s.id === sectionId);
    
    if (!existingStat) {
      this.sectionLoadStats.push({
        id: sectionId,
        loaded: false,
        loading: false,
        priority
      });
    } else {
      existingStat.priority = priority;
    }
  }
  
  /**
   * Get the current active section ID
   */
  public getActiveSectionId(): string | null {
    return this.activeSectionId;
  }
  
  /**
   * Get loading statistics for all tracked sections
   */
  public getLoadingStats(): Array<{
    id: string;
    loaded: boolean;
    loading: boolean;
    loadTime?: number;
    priority: number;
  }> {
    return [...this.sectionLoadStats];
  }
  
  /**
   * Should a section be included in the current view based on loading state
   * This is the core of the progressive loading algorithm
   */
  public shouldIncludeSection(sectionId: string): boolean {
    if (!OptimizationFeatures.PROGRESSIVE_LOADING) {
      return true; // Include all sections if progressive loading is disabled
    }
    
    // Always include the active section
    if (sectionId === this.activeSectionId) {
      return true;
    }
    
    // Include already loaded sections
    if (this.loadedSections.has(sectionId)) {
      return true;
    }
    
    // Include sections currently being loaded
    if (this.loadingSections.has(sectionId)) {
      return true;
    }
    
    // Otherwise, don't include the section yet
    return false;
  }
  
  /**
   * Reset the loader state (typically used when navigating to a new form)
   */
  public reset(): void {
    this.activeSectionId = null;
    this.loadedSections.clear();
    this.loadingSections.clear();
    this.sectionLoadStats = [];
  }
}

export const progressiveLoader = ProgressiveLoaderManager.getInstance();
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
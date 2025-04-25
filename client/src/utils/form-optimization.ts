/**
 * Form Optimization Utilities
 * 
 * This module provides optimizations for form updates, particularly for demo auto-fill
 * functionality where many field updates can occur in a short period of time.
 * 
 * The primary optimization is batch processing, which consolidates multiple updates to
 * the same field within a small time window, reducing redundant rendering and improving
 * performance.
 */

// Constants for batch processing
const BATCH_PROCESSING_INTERVAL = 100; // ms between batch processing cycles
const BATCH_SIZE_LIMIT = 10; // maximum number of fields to process per cycle

// Queued updates by field key
let pendingUpdates: Record<string, any> = {};

// Timestamp of when processing was last performed
let lastProcessTimestamp = 0;

// Current processing interval ID
let processingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Form Batch Updater
 * 
 * Provides methods to manage batched form field updates for improved performance
 * during operations like demo auto-fill where many fields might be updated rapidly.
 */
export const FormBatchUpdater = {
  /**
   * Add a field update to the batch processing queue
   * 
   * @param fieldKey The field identifier
   * @param value The value to set for the field
   */
  addUpdate: (fieldKey: string, value: any): void => {
    // Store the update, overwriting any previous update for the same field
    pendingUpdates[fieldKey] = value;
    
    // Start processing interval if not already running
    if (!processingInterval) {
      processingInterval = setInterval(() => {
        const currentTimestamp = Date.now();
        const elapsed = currentTimestamp - lastProcessTimestamp;
        
        // Only process if sufficient time has elapsed
        if (elapsed >= BATCH_PROCESSING_INTERVAL) {
          lastProcessTimestamp = currentTimestamp;
          FormBatchUpdater.processQueue();
        }
      }, BATCH_PROCESSING_INTERVAL);
      
      // Update timestamp for the first time
      lastProcessTimestamp = Date.now();
    }
  },
  
  /**
   * Process pending updates in the queue
   * 
   * @returns Object with processed field values
   */
  processQueue: (): Record<string, any> => {
    // Exit early if no updates
    if (Object.keys(pendingUpdates).length === 0) {
      return {};
    }
    
    const processed: Record<string, any> = {};
    const fieldKeys = Object.keys(pendingUpdates);
    const keysToProcess = fieldKeys.slice(0, BATCH_SIZE_LIMIT);
    
    // Process updates up to the batch size limit
    for (const fieldKey of keysToProcess) {
      processed[fieldKey] = pendingUpdates[fieldKey];
      delete pendingUpdates[fieldKey];
    }
    
    // Stop interval if queue is empty
    if (Object.keys(pendingUpdates).length === 0 && processingInterval) {
      clearInterval(processingInterval);
      processingInterval = null;
    }
    
    return processed;
  },
  
  /**
   * Clear all pending updates
   */
  clearQueue: (): void => {
    pendingUpdates = {};
    if (processingInterval) {
      clearInterval(processingInterval);
      processingInterval = null;
    }
  },
  
  /**
   * Get the current size of the update queue
   * 
   * @returns Number of pending updates
   */
  queueSize: (): number => {
    return Object.keys(pendingUpdates).length;
  }
};

/**
 * Debounce function for form field updates
 * 
 * @param func The function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounceFormUpdate<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 200
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

export default {
  FormBatchUpdater,
  debounceFormUpdate
};
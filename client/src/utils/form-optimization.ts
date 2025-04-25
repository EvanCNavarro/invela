import getLogger from '@/utils/logger';

// Create a logger for form optimization utilities
const logger = getLogger('FormOptimization', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

/**
 * Form Batch Updater
 * 
 * Provides methods to manage batched form field updates for improved performance
 * during operations like demo auto-fill where many fields might be updated rapidly.
 */
export const FormBatchUpdater = {
  // Queue for pending field updates - fieldKey → value mapping
  private: {
    updateQueue: new Map<string, any>(),
    debounceTimers: new Map<string, NodeJS.Timeout>()
  },

  /**
   * Add a field update to the batch processing queue
   * 
   * @param fieldKey The field identifier
   * @param value The value to set for the field
   */
  addUpdate(fieldKey: string, value: any): void {
    this.private.updateQueue.set(fieldKey, value);
    logger.debug(`Added field update to batch: ${fieldKey}`);
  },

  /**
   * Get all pending updates from the queue
   * 
   * @returns Object with field keys mapped to their values
   */
  getPendingUpdates(): Record<string, any> {
    const updates: Record<string, any> = {};
    this.private.updateQueue.forEach((value, key) => {
      updates[key] = value;
    });
    return updates;
  },

  /**
   * Process pending updates in the queue
   * 
   * @returns Object with processed field values
   */
  processUpdates(): Record<string, any> {
    const updates = this.getPendingUpdates();
    this.clearUpdates();
    return updates;
  },

  /**
   * Clear all pending updates
   */
  clearUpdates(): void {
    this.private.updateQueue.clear();
    logger.debug('Cleared all pending field updates');
  },

  /**
   * Get the current size of the update queue
   * 
   * @returns Number of pending updates
   */
  getQueueSize(): number {
    return this.private.updateQueue.size;
  },

  /**
   * Add a debounced field update
   * 
   * @param fieldKey The field identifier
   * @param value The value to set
   * @param callback The function to call with the update
   * @param delay The debounce delay in milliseconds
   */
  addDebouncedUpdate(
    fieldKey: string,
    value: any,
    callback: (fieldKey: string, value: any) => void,
    delay = 300
  ): void {
    // Clear existing timer if any
    if (this.private.debounceTimers.has(fieldKey)) {
      clearTimeout(this.private.debounceTimers.get(fieldKey));
    }

    // Set new timer
    const timer = setTimeout(() => {
      callback(fieldKey, value);
      this.private.debounceTimers.delete(fieldKey);
    }, delay);

    this.private.debounceTimers.set(fieldKey, timer);
  },

  /**
   * Clear all debounce timers
   */
  clearDebouncedUpdates(): void {
    this.private.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.private.debounceTimers.clear();
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
  wait = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for form field updates
 * 
 * @param func The function to throttle
 * @param limit Minimum time between invocations in milliseconds
 * @returns Throttled function
 */
export function throttleFormUpdate<T extends (...args: any[]) => any>(
  func: T,
  limit = 300
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return function(...args: Parameters<T>): void {
    // Store the latest arguments
    lastArgs = args;

    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        
        // Call with latest arguments if there were any updates during throttle
        if (lastArgs && lastArgs !== args) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    }
  };
}

/**
 * Create a batch processor for form updates
 * 
 * @param processor Function to process updates
 * @param options Configuration options
 * @returns Batch processor functions
 */
export function createBatchProcessor(
  processor: (updates: Record<string, any>) => Promise<void>,
  options: {
    batchSize?: number;
    batchDelay?: number;
  } = {}
) {
  const { batchSize = 10, batchDelay = 500 } = options;
  const updates: Record<string, any> = {};
  let timer: NodeJS.Timeout | null = null;
  let count = 0;

  const processUpdates = async () => {
    if (Object.keys(updates).length === 0) return;
    
    const batch = { ...updates };
    // Clear processed updates
    Object.keys(batch).forEach(key => {
      delete updates[key];
    });
    
    // Reset counter
    count = 0;
    
    // Process the batch
    await processor(batch);
  };

  return {
    /**
     * Add an update to the batch
     */
    add(key: string, value: any) {
      updates[key] = value;
      count++;
      
      // Process batch if we hit the batch size
      if (count >= batchSize) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        processUpdates();
      } else if (!timer) {
        // Start a timer if not already running
        timer = setTimeout(() => {
          timer = null;
          processUpdates();
        }, batchDelay);
      }
    },
    
    /**
     * Force process any pending updates
     */
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return processUpdates();
    },
    
    /**
     * Clear all pending updates
     */
    clear() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      Object.keys(updates).forEach(key => {
        delete updates[key];
      });
      count = 0;
    }
  };
}
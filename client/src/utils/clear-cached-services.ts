/**
 * Service Cache Clearing Utility
 * 
 * This utility forcefully clears all cached service instances that might
 * have persistent timers running in the background, eliminating artificial
 * polling and enabling true event-driven architecture.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('ServiceCacheClearer');

/**
 * Clear all cached service instances and timers
 * This function should be called during app initialization to ensure
 * no persistent timers from cached instances continue running
 */
export function clearAllCachedServices(): void {
  logger.info('[ServiceCacheClearer] Starting systematic cache clearing to eliminate persistent timers');
  
  try {
    // Clear any global service caches that might exist
    if (typeof window !== 'undefined') {
      // Clear any window-level service caches
      const windowKeys = Object.keys(window);
      windowKeys.forEach(key => {
        if (key.includes('service') || key.includes('Service') || key.includes('factory') || key.includes('Factory')) {
          logger.info(`[ServiceCacheClearer] Clearing window.${key}`);
          delete (window as any)[key];
        }
      });
      
      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
        logger.info('[ServiceCacheClearer] Forced garbage collection');
      }
    }
    
    // Clear any module-level caches by invalidating imports
    // This forces fresh instantiation of all services
    if (typeof window !== 'undefined' && (window as any).__webpack_require__ && (window as any).__webpack_require__.cache) {
      const cache = (window as any).__webpack_require__.cache;
      Object.keys(cache).forEach(key => {
        if (key.includes('service') || key.includes('Service')) {
          logger.info(`[ServiceCacheClearer] Clearing webpack cache for ${key}`);
          delete cache[key];
        }
      });
    }
    
    logger.info('[ServiceCacheClearer] Service cache clearing completed successfully');
  } catch (error) {
    logger.error('[ServiceCacheClearer] Error during cache clearing:', error);
  }
}

/**
 * Clear all active timers globally
 * This is a nuclear option to eliminate any persistent timers
 */
export function clearAllActiveTimers(): void {
  logger.info('[ServiceCacheClearer] Starting global timer clearing');
  
  try {
    // Clear all setTimeout/setInterval timers up to a reasonable limit
    const maxTimerId = 10000;
    let clearedCount = 0;
    
    for (let i = 1; i <= maxTimerId; i++) {
      clearTimeout(i);
      clearInterval(i);
      clearedCount++;
    }
    
    logger.info(`[ServiceCacheClearer] Cleared ${clearedCount} potential timer IDs`);
  } catch (error) {
    logger.error('[ServiceCacheClearer] Error during timer clearing:', error);
  }
}

/**
 * Emergency reset - clears all caches and timers
 * Use this as a last resort to eliminate persistent background services
 */
export function emergencyServiceReset(): void {
  logger.warn('[ServiceCacheClearer] EMERGENCY RESET: Clearing all cached services and timers');
  
  clearAllCachedServices();
  clearAllActiveTimers();
  
  // Force a small delay to let cleanup complete
  setTimeout(() => {
    logger.info('[ServiceCacheClearer] Emergency reset completed - all cached services and timers cleared');
  }, 100);
}
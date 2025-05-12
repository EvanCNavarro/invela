/**
 * Enhanced Image Cache Utility
 * 
 * This module provides an advanced caching system for tutorial images
 * with browser cache integration, LRU (Least Recently Used) eviction,
 * and detailed performance monitoring.
 */
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { getImageBaseName } from '@/lib/tutorial-config';

// Create a dedicated logger for the image cache system
const logger = createTutorialLogger('ImageCache');

// Configure cache settings
const CACHE_CONFIG = {
  // Maximum number of images to keep in memory cache
  MAX_CACHE_SIZE: 50,
  // Enable detailed logging of cache operations
  ENABLE_DETAILED_LOGGING: true,
  // Time in ms to consider cache stale and refresh
  CACHE_REFRESH_TIME: 3600000, // 1 hour
};

// Define cache entry type with metadata
interface CacheEntry {
  // Whether the image is loaded and cached
  loaded: boolean;
  // When the image was last accessed (for LRU eviction)
  lastAccessed: number;
  // When the image was first loaded
  timestamp: number;
  // Image dimensions for debugging
  dimensions?: {
    width: number;
    height: number;
  };
  // Track hits for performance monitoring
  hits: number;
}

// Define the type for our memory cache store
type ImageCacheStore = {
  [key: string]: CacheEntry;
};

// Central in-memory cache storage - shared across the application
const memoryCache: ImageCacheStore = {};

// Keep track of the LRU order for eviction
const lruQueue: string[] = [];

/**
 * Update the LRU status of an image in the cache
 * 
 * @param src Image URL to update
 */
function updateLRU(src: string): void {
  // Remove from current position
  const index = lruQueue.indexOf(src);
  if (index !== -1) {
    lruQueue.splice(index, 1);
  }
  
  // Add to front of queue (most recently used)
  lruQueue.unshift(src);
  
  // Update last accessed timestamp
  if (memoryCache[src]) {
    memoryCache[src].lastAccessed = Date.now();
    memoryCache[src].hits += 1;
  }
}

/**
 * Enforce cache size limits by removing least recently used items
 */
function enforceCacheLimits(): void {
  if (lruQueue.length > CACHE_CONFIG.MAX_CACHE_SIZE) {
    // Calculate how many items to remove
    const itemsToRemove = lruQueue.length - CACHE_CONFIG.MAX_CACHE_SIZE;
    
    if (itemsToRemove > 0) {
      // Get the least recently used items
      const itemsToEvict = lruQueue.splice(lruQueue.length - itemsToRemove);
      
      // Remove from memory cache
      itemsToEvict.forEach(src => {
        delete memoryCache[src];
      });
      
      logger.debug(`Cache limit reached. Evicted ${itemsToRemove} least recently used items`);
    }
  }
}

/**
 * Check if image is in browser cache using performance API
 * This is more reliable than just checking in-memory cache
 * 
 * @param src Image URL to check
 * @returns Promise resolving to boolean
 */
async function isInBrowserCache(src: string): Promise<boolean> {
  try {
    // Use fetch() with cache: 'only-if-cached' to check browser cache
    // This only works for same-origin URLs due to CORS restrictions
    const response = await fetch(src, {
      method: 'HEAD',
      cache: 'only-if-cached',
      mode: 'same-origin'
    }).catch(() => null);
    
    return response !== null && response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Preload a single image and store in cache
 * 
 * @param src The image URL to preload
 * @returns Promise that resolves when the image is loaded
 */
export function preloadImage(src: string): Promise<void> {
  // Handle invalid or empty URLs
  if (!src || typeof src !== 'string' || src.trim() === '') {
    logger.warn(`Invalid image path provided: ${src}`);
    return Promise.resolve();
  }
  
  // Skip if already in cache and recently accessed
  if (isImageCached(src)) {
    const cacheEntry = memoryCache[src];
    const now = Date.now();
    
    // If recently accessed, just update LRU and return
    if (now - cacheEntry.lastAccessed < CACHE_CONFIG.CACHE_REFRESH_TIME) {
      logger.debug(`Using cached image (${cacheEntry.hits} hits): ${src}`);
      updateLRU(src);
      return Promise.resolve();
    }
    
    // Otherwise, refresh the cache but don't block UI
    logger.debug(`Refreshing cached image: ${src}`);
  } else {
    logger.debug(`Preloading new image: ${src}`);
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      // Store in memory cache with metadata
      memoryCache[src] = {
        loaded: true,
        lastAccessed: Date.now(),
        timestamp: Date.now(),
        dimensions: {
          width: img.width,
          height: img.height
        },
        hits: 1
      };
      
      // Update LRU tracking
      updateLRU(src);
      
      // Make sure we don't exceed cache limits
      enforceCacheLimits();
      
      logger.debug(`Successfully loaded image: ${src} (${img.width}x${img.height})`);
      resolve();
    };
    
    img.onerror = (error) => {
      logger.error(`Failed to load image: ${src}`, error);
      // Store failure in cache to avoid repeated failures
      memoryCache[src] = {
        loaded: false,
        lastAccessed: Date.now(),
        timestamp: Date.now(),
        hits: 1
      };
      
      // Still resolve to prevent React hook errors
      resolve();
    };
    
    // Set cache-control header for browser caching
    img.setAttribute('crossorigin', 'anonymous');
    img.src = src;
  });
}

/**
 * Preload multiple images in parallel with batch size control
 * 
 * @param sources Array of image URLs to preload
 * @param batchSize Optional number of parallel downloads (default: 3)
 * @returns Promise that resolves when all images are loaded
 */
export async function preloadImages(sources: string[], batchSize: number = 3): Promise<void> {
  if (!sources || !sources.length) {
    return Promise.resolve();
  }

  logger.debug(`Preloading ${sources.length} images in batches of ${batchSize}`);
  
  // Filter out already cached images that don't need refreshing
  const now = Date.now();
  const imagesToLoad = sources.filter(src => {
    const cacheEntry = memoryCache[src];
    return !cacheEntry || (now - cacheEntry.lastAccessed >= CACHE_CONFIG.CACHE_REFRESH_TIME);
  });
  
  if (imagesToLoad.length === 0) {
    logger.debug('All images already cached and fresh');
    return Promise.resolve();
  }
  
  logger.debug(`Preloading ${imagesToLoad.length} new/stale images`);
  
  // Process in batches to avoid overwhelming network connections
  for (let i = 0; i < imagesToLoad.length; i += batchSize) {
    const batch = imagesToLoad.slice(i, i + batchSize);
    await Promise.all(batch.map(src => preloadImage(src)));
  }
}

/**
 * Check if an image is already in the cache (memory or browser)
 * 
 * @param src Image URL to check
 * @returns True if the image is cached and successfully loaded
 */
export function isImageCached(src: string): boolean {
  // Always update LRU status when checking cache
  if (memoryCache[src]?.loaded) {
    updateLRU(src);
    return true;
  }
  
  return false;
}

/**
 * Clear specific images from the cache
 * 
 * @param sources Optional array of image URLs to clear. If not provided, clears all.
 */
export function clearImageCache(sources?: string[]): void {
  if (sources && sources.length > 0) {
    sources.forEach(src => {
      delete memoryCache[src];
      
      // Remove from LRU queue
      const index = lruQueue.indexOf(src);
      if (index !== -1) {
        lruQueue.splice(index, 1);
      }
    });
    logger.debug(`Cleared ${sources.length} images from cache`);
  } else {
    // Clear all
    Object.keys(memoryCache).forEach(key => {
      delete memoryCache[key];
    });
    // Clear LRU queue
    lruQueue.length = 0;
    
    logger.debug('Cleared entire image cache');
  }
}

/**
 * Preload a tutorial's images based on current step and prefetch next step
 * 
 * @param tabName The tab name for the tutorial
 * @param currentStep Current tutorial step index
 * @param totalSteps Total number of steps
 */
// Import from the centralized constants file
import { normalizeTabName, createTutorialImageUrl } from '@/constants/tutorial-constants';

export function preloadTutorialImages(
  tabName: string,
  currentStep: number,
  totalSteps: number
): void {
  // Normalize the tab name to ensure consistency
  const normalizedTabName = normalizeTabName(tabName);
  
  // Calculate which images to preload
  const imagesToPreload: string[] = [];
  
  // Always preload current step - use step+1 because our indexes are 0-based but image names are 1-based
  const currentImageUrl = createTutorialImageUrl(normalizedTabName, currentStep + 1);
  imagesToPreload.push(currentImageUrl);
  
  // Preload next step if not at the end
  if (currentStep < totalSteps - 1) {
    const nextImageUrl = createTutorialImageUrl(normalizedTabName, currentStep + 2);
    imagesToPreload.push(nextImageUrl);
  }
  
  // Optionally preload previous step for back navigation
  if (currentStep > 0) {
    const prevImageUrl = createTutorialImageUrl(normalizedTabName, currentStep);
    imagesToPreload.push(prevImageUrl);
  }
  
  // Preload all images
  preloadImages(imagesToPreload);
  logger.debug(`Preloaded ${imagesToPreload.length} tutorial images for ${normalizedTabName}`);
}

/**
 * Get the current cache size
 * 
 * @returns Number of images in the cache
 */
export function getCacheSize(): number {
  return Object.keys(memoryCache).length;
}

/**
 * Get detailed statistics about the cache
 * 
 * @returns Object with cache statistics
 */
export function getCacheStats() {
  const items = Object.entries(memoryCache).map(([src, entry]) => ({
    src,
    loaded: entry.loaded,
    hits: entry.hits,
    lastAccessed: new Date(entry.lastAccessed).toISOString(),
    age: Date.now() - entry.timestamp,
    dimensions: entry.dimensions
  }));
  
  // Calculate hit rates and popular images
  const totalHits = items.reduce((sum, item) => sum + item.hits, 0);
  const mostPopular = [...items].sort((a, b) => b.hits - a.hits).slice(0, 5);
  
  return {
    size: items.length,
    maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
    totalHits,
    averageHits: totalHits / (items.length || 1),
    items,
    lruOrder: lruQueue,
    mostPopular
  };
}

// Default export for convenient importing
export default {
  preloadImage,
  preloadImages,
  isImageCached,
  clearImageCache,
  preloadTutorialImages,
  getCacheSize,
  getCacheStats
};
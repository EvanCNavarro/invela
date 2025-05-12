/**
 * Image Cache Utility
 * 
 * This module provides a centralized way to preload and cache images
 * for the tutorial system, ensuring fast, snappy transitions between steps.
 */

// Define the type for our image cache store
type ImageCacheStore = {
  [key: string]: boolean;
};

// Central cache storage - shared across the application
const imageCache: ImageCacheStore = {};

// Flag to enable or disable detailed logging
const ENABLE_DETAILED_LOGGING = true;

/**
 * Logger function with consistent format
 */
function log(message: string, data?: any) {
  if (ENABLE_DETAILED_LOGGING) {
    if (data) {
      console.log(`[ImageCache] ${message}`, data);
    } else {
      console.log(`[ImageCache] ${message}`);
    }
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
    log(`Invalid image path provided: ${src}`);
    return Promise.resolve();
  }
  
  // Skip if already in cache
  if (imageCache[src]) {
    log(`Image already cached: ${src}`);
    return Promise.resolve();
  }

  log(`Preloading image: ${src}`);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      imageCache[src] = true;
      log(`Successfully loaded image: ${src}`);
      resolve();
    };
    
    img.onerror = (error) => {
      log(`Failed to load image: ${src}`, error);
      // Don't reject; this can cause React hook errors when used with useEffect
      // Instead, resolve but don't add to cache
      resolve();
    };
    
    img.src = src;
  });
}

/**
 * Preload multiple images in parallel
 * 
 * @param sources Array of image URLs to preload
 * @returns Promise that resolves when all images are loaded
 */
export function preloadImages(sources: string[]): Promise<void[]> {
  log(`Preloading ${sources.length} images`);
  return Promise.all(sources.map(src => preloadImage(src)));
}

/**
 * Check if an image is already in the cache
 * 
 * @param src Image URL to check
 * @returns True if the image is cached
 */
export function isImageCached(src: string): boolean {
  return !!imageCache[src];
}

/**
 * Clear specific images from the cache
 * 
 * @param sources Optional array of image URLs to clear. If not provided, clears all.
 */
export function clearImageCache(sources?: string[]): void {
  if (sources && sources.length > 0) {
    sources.forEach(src => {
      delete imageCache[src];
    });
    log(`Cleared ${sources.length} images from cache`);
  } else {
    // Clear all
    Object.keys(imageCache).forEach(key => {
      delete imageCache[key];
    });
    log('Cleared entire image cache');
  }
}

/**
 * Get the current cache size
 * 
 * @returns Number of images in the cache
 */
export function getCacheSize(): number {
  return Object.keys(imageCache).length;
}

/**
 * Get details about the current cache state
 * 
 * @returns Object with cache statistics
 */
export function getCacheStats() {
  return {
    size: getCacheSize(),
    items: Object.keys(imageCache)
  };
}

// Default export for convenient importing
export default {
  preloadImage,
  preloadImages,
  isImageCached,
  clearImageCache,
  getCacheSize,
  getCacheStats
};
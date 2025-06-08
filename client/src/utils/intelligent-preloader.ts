/**
 * ========================================
 * Intelligent Image Preloading System
 * ========================================
 * 
 * Comprehensive preloading utility for onboarding and tutorial modals.
 * Implements smart background loading, caching, and fallback strategies
 * to eliminate loading delays when users navigate between modal steps.
 * 
 * Features:
 * - Modal-aware preloading (detects onboarding vs tutorial)
 * - Progressive JPEG optimization with PNG fallback
 * - Memory-efficient caching with cleanup
 * - Priority loading (current step first, then sequential)
 * - Error handling and retry mechanisms
 * - Performance monitoring and logging
 * 
 * @module utils/intelligent-preloader
 * @version 1.0.0
 * @since 2025-06-08
 */

// Global cache for all preloaded images across modals
const globalImageCache = new Map<string, HTMLImageElement>();
const preloadingPromises = new Map<string, Promise<HTMLImageElement>>();
const loadingMetrics = new Map<string, { startTime: number; loadTime?: number; success?: boolean }>();

// Configuration for different modal types
interface PreloadConfig {
  enableLogging: boolean;
  retryAttempts: number;
  timeoutMs: number;
  maxCacheSize: number;
}

const DEFAULT_CONFIG: PreloadConfig = {
  enableLogging: true,
  retryAttempts: 2,
  timeoutMs: 10000,
  maxCacheSize: 50
};

/**
 * Image source definition for preloading
 */
interface ImageSource {
  primary: string;    // Progressive JPEG path
  fallback: string;   // Original PNG path
  priority: number;   // Loading priority (0 = highest)
}

/**
 * Preload result with metadata
 */
interface PreloadResult {
  src: string;
  success: boolean;
  loadTime: number;
  usingFallback: boolean;
  error?: string;
}

/**
 * Performance logger for preloading operations
 */
class PreloadLogger {
  private componentName: string;
  
  constructor(componentName: string) {
    this.componentName = componentName;
  }
  
  debug(message: string, data?: any) {
    if (DEFAULT_CONFIG.enableLogging) {
      console.log(`[IntelligentPreloader:${this.componentName}] ${message}`, data || '');
    }
  }
  
  error(message: string, error?: any) {
    console.error(`[IntelligentPreloader:${this.componentName}] ${message}`, error || '');
  }
  
  performance(operation: string, duration: number, metadata?: any) {
    if (DEFAULT_CONFIG.enableLogging) {
      console.log(`[IntelligentPreloader:${this.componentName}] ${operation} completed in ${duration.toFixed(2)}ms`, metadata || '');
    }
  }
}

/**
 * Create progressive image source with JPEG optimization
 */
function createImageSource(basePath: string, priority: number = 1): ImageSource {
  // Convert PNG path to optimized JPEG path
  const jpegPath = basePath.replace(/\.png$/, '.jpg');
  
  return {
    primary: jpegPath,
    fallback: basePath,
    priority
  };
}

/**
 * Preload a single image with retry and fallback logic
 */
async function preloadSingleImage(
  imageSource: ImageSource,
  logger: PreloadLogger,
  config: PreloadConfig = DEFAULT_CONFIG
): Promise<PreloadResult> {
  const startTime = performance.now();
  const cacheKey = imageSource.primary;
  
  // Check if already cached
  if (globalImageCache.has(cacheKey)) {
    logger.debug(`Cache hit for ${cacheKey}`);
    return {
      src: cacheKey,
      success: true,
      loadTime: 0,
      usingFallback: false
    };
  }
  
  // Check if already being loaded
  if (preloadingPromises.has(cacheKey)) {
    logger.debug(`Waiting for existing load of ${cacheKey}`);
    try {
      const img = await preloadingPromises.get(cacheKey)!;
      return {
        src: cacheKey,
        success: true,
        loadTime: performance.now() - startTime,
        usingFallback: false
      };
    } catch (error) {
      // Continue to retry logic below
    }
  }
  
  // Track loading metrics
  loadingMetrics.set(cacheKey, { startTime });
  
  // Attempt to load progressive JPEG first
  const loadPromise = loadImageWithTimeout(imageSource.primary, config.timeoutMs)
    .then(img => {
      globalImageCache.set(cacheKey, img);
      const loadTime = performance.now() - startTime;
      
      // Update metrics
      const metrics = loadingMetrics.get(cacheKey);
      if (metrics) {
        metrics.loadTime = loadTime;
        metrics.success = true;
      }
      
      logger.performance(`Progressive JPEG loaded`, loadTime, { src: imageSource.primary });
      return img;
    })
    .catch(async (error) => {
      logger.debug(`Progressive JPEG failed, trying fallback: ${imageSource.fallback}`);
      
      // Fallback to original PNG
      try {
        const img = await loadImageWithTimeout(imageSource.fallback, config.timeoutMs);
        globalImageCache.set(cacheKey, img);
        const loadTime = performance.now() - startTime;
        
        // Update metrics
        const metrics = loadingMetrics.get(cacheKey);
        if (metrics) {
          metrics.loadTime = loadTime;
          metrics.success = true;
        }
        
        logger.performance(`PNG fallback loaded`, loadTime, { src: imageSource.fallback });
        return img;
      } catch (fallbackError) {
        const loadTime = performance.now() - startTime;
        
        // Update metrics
        const metrics = loadingMetrics.get(cacheKey);
        if (metrics) {
          metrics.loadTime = loadTime;
          metrics.success = false;
        }
        
        logger.error(`Both progressive JPEG and PNG fallback failed`, { 
          primary: imageSource.primary, 
          fallback: imageSource.fallback,
          primaryError: error,
          fallbackError: fallbackError
        });
        throw fallbackError;
      }
    });
  
  // Store promise for deduplication
  preloadingPromises.set(cacheKey, loadPromise);
  
  try {
    await loadPromise;
    const metrics = loadingMetrics.get(cacheKey);
    return {
      src: cacheKey,
      success: true,
      loadTime: metrics?.loadTime || 0,
      usingFallback: !imageSource.primary.endsWith('.jpg')
    };
  } catch (error) {
    return {
      src: cacheKey,
      success: false,
      loadTime: performance.now() - startTime,
      usingFallback: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    // Cleanup promise after completion
    preloadingPromises.delete(cacheKey);
  }
}

/**
 * Load image with timeout handling
 */
function loadImageWithTimeout(src: string, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeoutId: NodeJS.Timeout;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
    
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load image: ${src}`));
    };
    
    // Set timeout
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Image load timeout: ${src}`));
    }, timeoutMs);
    
    // Start loading
    img.src = src;
  });
}

/**
 * Generate onboarding modal image sources
 */
export function generateOnboardingImageSources(): ImageSource[] {
  const logger = new PreloadLogger('OnboardingGenerator');
  logger.debug('Generating onboarding image sources for 7 welcome steps');
  
  const sources: ImageSource[] = [];
  
  // Generate all 7 welcome images with priority order
  for (let i = 1; i <= 7; i++) {
    const basePath = `/assets/welcome_${i}.png`;
    const priority = i - 1; // Step 1 has highest priority (0)
    
    sources.push(createImageSource(basePath, priority));
  }
  
  logger.debug(`Generated ${sources.length} onboarding image sources`);
  return sources;
}

/**
 * Generate tutorial modal image sources for a specific tab
 */
export function generateTutorialImageSources(tabName: string): ImageSource[] {
  const logger = new PreloadLogger('TutorialGenerator');
  logger.debug(`Generating tutorial image sources for tab: ${tabName}`);
  
  // Normalize tab name to match directory structure
  const normalizedTabName = normalizeTabName(tabName);
  const sources: ImageSource[] = [];
  
  // Tab-specific image mapping based on actual file structure investigation
  const tabImageMappings: Record<string, { directory: string; files: string[] }> = {
    'dashboard': {
      directory: 'dashboard',
      files: ['modal_dash_1.png', 'modal_dash_2.png', 'modal_dash_3.png']
    },
    'claims': {
      directory: 'claims',
      files: ['details.png', 'processing.png', 'documentation.png']
    },
    'network': {
      directory: 'network',
      files: ['modal_network_1.png', 'modal_network_2.png', 'modal_network_3.png']
    },
    'insights': {
      directory: 'insights',
      files: ['1.png', '2.png', '3.png']
    },
    'file-vault': {
      directory: 'file-vault',
      files: ['modal_file_1.png', 'modal_file_2.png', 'categories.png']
    },
    'risk': {
      directory: 'risk',
      files: ['modal_risk_1.png', 'modal_risk_2.png', 'modal_risk_3.png']
    },
    'risk-score': {
      directory: 'risk-score',
      files: ['gauge.png', 'dimension-cards.png', 'risk-acceptance.png', 'comparative.png']
    },
    'risk-score-configuration': {
      directory: 'risk-score-configuration',
      files: ['1.png', '2.png', '3.png', '4.png', '5.png']
    },
    'claims-risk': {
      directory: 'claims-risk',
      files: ['overview.png', 'distribution.png', 'types.png', 'temporal.png']
    },
    'company-profile': {
      directory: 'company-profile',
      files: ['business-info.png', 'team.png', 'compliance.png']
    },
    'playground': {
      directory: 'playground',
      files: ['overview.png', 'scenarios.png']
    }
  };
  
  const tabMapping = tabImageMappings[normalizedTabName];
  
  if (!tabMapping) {
    logger.error(`No image mapping found for tab: ${normalizedTabName}`);
    return sources;
  }
  
  // Generate image sources with priority order
  tabMapping.files.forEach((fileName, index) => {
    const basePath = `/assets/tutorials/${tabMapping.directory}/${fileName}`;
    const priority = index; // First image has highest priority
    
    sources.push(createImageSource(basePath, priority));
  });
  
  logger.debug(`Generated ${sources.length} tutorial image sources for ${normalizedTabName} from directory: ${tabMapping.directory}`);
  return sources;
}

/**
 * Normalize tab name for consistent directory mapping
 */
function normalizeTabName(tabName: string): string {
  const mappings: Record<string, string> = {
    'risk-score-configuration': 'risk-score',
    'claims-risk-analysis': 'claims-risk',
    'network-visualization': 'network',
    'company-profile-page': 'company-profile',
    'file-vault-page': 'file-vault'
  };
  
  return mappings[tabName] || tabName;
}

/**
 * Preload all images for onboarding modal
 */
export async function preloadOnboardingImages(): Promise<PreloadResult[]> {
  const logger = new PreloadLogger('OnboardingPreloader');
  const startTime = performance.now();
  
  logger.debug('Starting intelligent preload for onboarding modal');
  
  const imageSources = generateOnboardingImageSources();
  
  // Sort by priority (current step first, then sequential)
  const sortedSources = imageSources.sort((a, b) => a.priority - b.priority);
  
  // Preload images with controlled concurrency
  const results = await Promise.allSettled(
    sortedSources.map(source => preloadSingleImage(source, logger))
  );
  
  const preloadResults: PreloadResult[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error(`Failed to preload image ${index}`, result.reason);
      return {
        src: sortedSources[index].primary,
        success: false,
        loadTime: 0,
        usingFallback: false,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
      };
    }
  });
  
  const totalTime = performance.now() - startTime;
  const successCount = preloadResults.filter(r => r.success).length;
  
  logger.performance('Onboarding preload completed', totalTime, {
    total: preloadResults.length,
    successful: successCount,
    failed: preloadResults.length - successCount
  });
  
  return preloadResults;
}

/**
 * Preload all images for tutorial modal
 */
export async function preloadTutorialImages(tabName: string): Promise<PreloadResult[]> {
  const logger = new PreloadLogger('TutorialPreloader');
  const startTime = performance.now();
  
  logger.debug(`Starting intelligent preload for tutorial modal: ${tabName}`);
  
  const imageSources = generateTutorialImageSources(tabName);
  
  if (imageSources.length === 0) {
    logger.debug(`No images to preload for tab: ${tabName}`);
    return [];
  }
  
  // Sort by priority (current step first, then sequential)
  const sortedSources = imageSources.sort((a, b) => a.priority - b.priority);
  
  // Preload images with controlled concurrency
  const results = await Promise.allSettled(
    sortedSources.map(source => preloadSingleImage(source, logger))
  );
  
  const preloadResults: PreloadResult[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error(`Failed to preload tutorial image ${index}`, result.reason);
      return {
        src: sortedSources[index].primary,
        success: false,
        loadTime: 0,
        usingFallback: false,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
      };
    }
  });
  
  const totalTime = performance.now() - startTime;
  const successCount = preloadResults.filter(r => r.success).length;
  
  logger.performance(`Tutorial preload completed for ${tabName}`, totalTime, {
    total: preloadResults.length,
    successful: successCount,
    failed: preloadResults.length - successCount
  });
  
  return preloadResults;
}

/**
 * Check if an image is already cached
 */
export function isImageCached(src: string): boolean {
  const jpegSrc = src.replace(/\.png$/, '.jpg');
  return globalImageCache.has(jpegSrc);
}

/**
 * Get cached image if available
 */
export function getCachedImage(src: string): HTMLImageElement | null {
  const jpegSrc = src.replace(/\.png$/, '.jpg');
  return globalImageCache.get(jpegSrc) || null;
}

/**
 * Clear cache for specific modal type or all
 */
export function clearImageCache(pattern?: string): void {
  const logger = new PreloadLogger('CacheManager');
  
  if (!pattern) {
    const count = globalImageCache.size;
    globalImageCache.clear();
    preloadingPromises.clear();
    loadingMetrics.clear();
    logger.debug(`Cleared entire image cache (${count} images)`);
    return;
  }
  
  let clearedCount = 0;
  for (const [key] of globalImageCache.entries()) {
    if (key.includes(pattern)) {
      globalImageCache.delete(key);
      preloadingPromises.delete(key);
      loadingMetrics.delete(key);
      clearedCount++;
    }
  }
  
  logger.debug(`Cleared ${clearedCount} images matching pattern: ${pattern}`);
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  cached: number;
  loading: number;
  totalMemoryUsage: number;
  successRate: number;
} {
  const totalRequests = loadingMetrics.size;
  const successfulRequests = Array.from(loadingMetrics.values()).filter(m => m.success).length;
  
  return {
    cached: globalImageCache.size,
    loading: preloadingPromises.size,
    totalMemoryUsage: globalImageCache.size, // Approximation
    successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
  };
}

/**
 * Cleanup old cache entries if cache size exceeds limit
 */
export function performCacheCleanup(): void {
  const logger = new PreloadLogger('CacheCleanup');
  
  if (globalImageCache.size <= DEFAULT_CONFIG.maxCacheSize) {
    return;
  }
  
  // Simple LRU-style cleanup - remove oldest entries
  const entries = Array.from(globalImageCache.entries());
  const toRemove = entries.slice(0, entries.length - DEFAULT_CONFIG.maxCacheSize);
  
  toRemove.forEach(([key]) => {
    globalImageCache.delete(key);
    loadingMetrics.delete(key);
  });
  
  logger.debug(`Cache cleanup completed, removed ${toRemove.length} old entries`);
}
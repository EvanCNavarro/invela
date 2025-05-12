import { useState, useEffect } from 'react';
import { preloadImage, isImageCached } from '@/lib/image-cache';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create dedicated logger for this hook
const logger = createTutorialLogger('TutorialAssets');

/**
 * Enhanced hook for loading and preloading tutorial assets (images, etc.)
 * 
 * This hook handles preloading individual tutorial images and managing their
 * loading state appropriately. It's optimized for tutorial modals that need
 * fast image transitions between steps.
 * 
 * @param {string} assetPath - Path to the asset to load
 * @param {boolean} shouldLoad - Whether to load the asset or not
 * @returns {Object} - Object containing the loaded asset and loading state
 */
export function useTutorialAssets(assetPath: string, shouldLoad: boolean = true) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Reset when a new asset is requested
    if (assetPath && shouldLoad) {
      logger.debug(`Loading asset: ${assetPath}`);
      setIsLoading(true);
      setError(null);
      
      // Check if the image is already cached
      if (isImageCached(assetPath)) {
        logger.debug(`Using cached image: ${assetPath}`);
        setImageUrl(assetPath);
        setIsLoading(false);
        setIsLoaded(true);
        return;
      }
      
      // Not cached, so preload the image
      preloadImage(assetPath)
        .then(() => {
          logger.debug(`Successfully preloaded image: ${assetPath}`);
          setImageUrl(assetPath);
          setIsLoading(false);
          setIsLoaded(true);
        })
        .catch((err) => {
          logger.error(`Failed to preload image: ${assetPath}`, err);
          setError(err);
          setIsLoading(false);
          
          // Still set the URL so it can attempt to load normally
          setImageUrl(assetPath);
        });
    } else {
      // Clear state if we shouldn't load
      logger.debug('Clearing asset state (no path or shouldLoad=false)');
      setImageUrl('');
      setIsLoading(false);
      setIsLoaded(false);
    }
  }, [assetPath, shouldLoad]);

  return {
    imageUrl,
    isLoading,
    isLoaded,
    error
  };
}

// Global preloader state (outside of React)
type PreloaderState = {
  isLoading: boolean;
  loadedCount: number;
  totalCount: number;
  progress: number;
  errors: Error[];
  hasErrors: boolean;
  listeners: Set<() => void>;
}

// Create a singleton preloader that exists outside of React component lifecycle
const globalPreloader: PreloaderState = {
  isLoading: false,
  loadedCount: 0,
  totalCount: 0,
  progress: 0,
  errors: [],
  hasErrors: false,
  listeners: new Set()
};

/**
 * Notify all listeners that the preloader state has changed
 */
function notifyListeners() {
  globalPreloader.listeners.forEach(listener => listener());
}

/**
 * Global preload function that can be called from anywhere
 * This exists outside of React's component lifecycle to avoid hook order issues
 * 
 * @param paths - Array of image paths to preload
 */
export function preloadTutorialImages(paths: string[]): void {
  // Filter out invalid paths
  const validPaths = paths.filter(path => path && typeof path === 'string' && path.trim() !== '');
  
  if (!validPaths.length) {
    return;
  }
  
  if (globalPreloader.isLoading) {
    // Don't start a new preload if one is already in progress
    return;
  }
  
  // Reset preloader state
  globalPreloader.isLoading = true;
  globalPreloader.loadedCount = 0;
  globalPreloader.totalCount = validPaths.length;
  globalPreloader.progress = 0;
  globalPreloader.errors = [];
  globalPreloader.hasErrors = false;
  
  // Notify listeners of initial state
  notifyListeners();
  
  logger.info(`Starting global preload of ${validPaths.length} tutorial images`);
  
  // Track loading state
  let successCount = 0;
  let failCount = 0;
  
  // Preload images sequentially
  const loadNext = (index: number) => {
    if (index >= validPaths.length) {
      // All done
      globalPreloader.isLoading = false;
      notifyListeners();
      logger.info(`Completed preloading ${validPaths.length} images (${successCount} success, ${failCount} failed)`);
      return;
    }
    
    const path = validPaths[index];
    
    // Skip if already cached
    if (isImageCached(path)) {
      successCount++;
      globalPreloader.loadedCount++;
      globalPreloader.progress = Math.round((globalPreloader.loadedCount / globalPreloader.totalCount) * 100);
      notifyListeners();
      
      // Move to next image
      setTimeout(() => loadNext(index + 1), 5);
      return;
    }
    
    // Preload the image
    preloadImage(path)
      .then(() => {
        successCount++;
        globalPreloader.loadedCount++;
        globalPreloader.progress = Math.round((globalPreloader.loadedCount / globalPreloader.totalCount) * 100);
        notifyListeners();
      })
      .catch(error => {
        failCount++;
        globalPreloader.errors.push(error);
        globalPreloader.hasErrors = true;
        notifyListeners();
      })
      .finally(() => {
        // Move to next image with a slight delay
        setTimeout(() => loadNext(index + 1), 20);
      });
  };
  
  // Start loading
  loadNext(0);
}

/**
 * Hook for accessing the global preloader state
 * This avoids creating preloader state in components that might mount/unmount
 * 
 * @returns The current preloader state
 */
export function useTutorialAssetsPreloader() {
  // Use a simple state to force re-renders when the global state changes
  const [, setForceUpdate] = useState(0);
  
  // Register a listener to update the component when the global state changes
  useEffect(() => {
    const listener = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    globalPreloader.listeners.add(listener);
    
    return () => {
      globalPreloader.listeners.delete(listener);
    };
  }, []);
  
  // Return a copy of the current global state
  return {
    isLoading: globalPreloader.isLoading,
    loadedCount: globalPreloader.loadedCount,
    totalCount: globalPreloader.totalCount,
    progress: globalPreloader.progress,
    errors: [...globalPreloader.errors],
    hasErrors: globalPreloader.hasErrors
  };
}
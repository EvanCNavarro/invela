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

/**
 * Hook for preloading multiple tutorial assets at once
 * 
 * This hook is useful for preloading all images in a tutorial sequence
 * when the tutorial first loads, ensuring smooth transitions between steps.
 * 
 * @param {string[]} assetPaths - Array of asset paths to preload
 * @param {boolean} shouldLoad - Whether to preload the assets or not
 * @returns {Object} - Object containing loading state
 */
export function useTutorialAssetsPreloader(assetPaths: string[], shouldLoad: boolean = true) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [errors, setErrors] = useState<Error[]>([]);
  
  // Calculate progress as a percentage
  const progressPercentage = assetPaths.length > 0 
    ? Math.round((loadedCount / assetPaths.length) * 100) 
    : 100;

  useEffect(() => {
    if (!shouldLoad || !assetPaths.length) {
      setIsLoading(false);
      return;
    }
    
    logger.info(`Preloading ${assetPaths.length} tutorial assets`);
    setIsLoading(true);
    setLoadedCount(0);
    setErrors([]);
    
    // Track successfully loaded images
    let successCount = 0;
    let failCount = 0;
    const newErrors: Error[] = [];
    
    // Load each image sequentially with a slight delay to prevent overwhelming the browser
    const loadImageSequentially = (index: number) => {
      if (index >= assetPaths.length) {
        // All images processed
        setIsLoading(false);
        if (failCount > 0) {
          logger.warn(`Completed preloading with ${failCount} failures`);
        } else {
          logger.info('Successfully preloaded all tutorial assets');
        }
        return;
      }
      
      const path = assetPaths[index];
      
      // Skip if already cached
      if (isImageCached(path)) {
        logger.debug(`Asset already cached: ${path}`);
        successCount++;
        setLoadedCount(prevCount => prevCount + 1);
        
        // Process next image with a minimal delay
        setTimeout(() => loadImageSequentially(index + 1), 5);
        return;
      }
      
      // Preload the image
      preloadImage(path)
        .then(() => {
          successCount++;
          setLoadedCount(prevCount => prevCount + 1);
        })
        .catch((err) => {
          failCount++;
          newErrors.push(err);
          setErrors(prev => [...prev, err]);
          logger.error(`Failed to preload asset: ${path}`, err);
        })
        .finally(() => {
          // Process next image with a slight delay
          setTimeout(() => loadImageSequentially(index + 1), 20);
        });
    };
    
    // Start loading the first image
    loadImageSequentially(0);
    
  }, [assetPaths, shouldLoad]);

  return {
    isLoading,
    loadedCount,
    totalCount: assetPaths.length,
    progress: progressPercentage,
    errors,
    hasErrors: errors.length > 0
  };
}
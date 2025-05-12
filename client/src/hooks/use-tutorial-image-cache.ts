/**
 * Tutorial Image Cache Hook
 * 
 * This hook manages the caching of tutorial images to ensure smooth transitions
 * between tutorial steps with minimal loading times.
 */
import { useState, useEffect } from 'react';
import { preloadImage, preloadImages, isImageCached, preloadTutorialImages } from '@/lib/image-cache';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for this hook
const logger = createTutorialLogger('TutorialImageCache');

interface UseTutorialImageCacheProps {
  tabName: string;
  currentStep: number;
  totalSteps: number;
  imageUrl?: string;
}

interface UseTutorialImageCacheReturn {
  isLoading: boolean;
  imageUrl: string | undefined;
  cachePerformance: {
    cacheHit: boolean;
    loadTimeMs?: number;
    imageLoaded: boolean;
  };
}

/**
 * Hook for caching and preloading tutorial images
 * 
 * This hook manages the loading, caching, and preloading of tutorial images
 * for smoother transitions between steps.
 * 
 * @param tabName - Name of the current tutorial tab
 * @param currentStep - Current step index
 * @param totalSteps - Total number of steps
 * @param imageUrl - Current image URL
 * @returns Object with loading state and image URL
 */
export function useTutorialImageCache({
  tabName,
  currentStep,
  totalSteps,
  imageUrl
}: UseTutorialImageCacheProps): UseTutorialImageCacheReturn {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [loadTimeMs, setLoadTimeMs] = useState<number | undefined>(undefined);
  const [cacheHit, setCacheHit] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  
  // On mount, we setup performance tracking
  useEffect(() => {
    logger.debug(`Tutorial image cache hook initialized for ${tabName}`);
    
    // Clean up function
    return () => {
      logger.debug(`Tutorial image cache hook cleanup for ${tabName}`);
    };
  }, [tabName]);
  
  // When image URL changes, handle loading and caching
  useEffect(() => {
    if (!imageUrl) {
      setIsLoading(false);
      setCacheHit(false);
      setImageLoaded(false);
      return;
    }
    
    // Start loading timer
    setLoadStartTime(Date.now());
    setIsLoading(true);
    setImageLoaded(false);
    
    // Check if image is already in cache
    const cached = isImageCached(imageUrl);
    setCacheHit(cached);
    
    if (cached) {
      // Image is already cached, so we can show it immediately
      logger.debug(`Cache hit for tutorial image: ${imageUrl}`);
      setIsLoading(false);
      setImageLoaded(true);
      setLoadTimeMs(0); // Instant load from cache
    } else {
      // Image is not cached, so we need to load it
      logger.debug(`Cache miss for tutorial image: ${imageUrl}`);
      
      // Load the image
      preloadImage(imageUrl)
        .then(() => {
          setIsLoading(false);
          setImageLoaded(true);
          // Calculate load time
          if (loadStartTime) {
            const loadTime = Date.now() - loadStartTime;
            setLoadTimeMs(loadTime);
            logger.debug(`Image loaded in ${loadTime}ms: ${imageUrl}`);
          }
        })
        .catch(error => {
          logger.error(`Error loading image: ${imageUrl}`, error);
          setIsLoading(false);
          setImageLoaded(false);
        });
    }
    
    // Preload adjacent steps for a smoother experience
    preloadTutorialImages(tabName, currentStep, totalSteps);
    
  }, [imageUrl, tabName, currentStep, totalSteps]);
  
  return {
    isLoading,
    imageUrl,
    cachePerformance: {
      cacheHit,
      loadTimeMs,
      imageLoaded
    }
  };
}

export default useTutorialImageCache;
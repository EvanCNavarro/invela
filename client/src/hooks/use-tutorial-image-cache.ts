/**
 * Tutorial Image Cache Hook
 * 
 * This hook provides a convenient way to interact with the image cache system 
 * specifically for tutorial images, handling preloading, loading states,
 * and performance monitoring.
 */

import { useState, useEffect } from 'react';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { isImageCached, preloadTutorialImages, getCacheStats } from '@/lib/image-cache';
import { getImageBaseName } from '@/lib/tutorial-config';
import { normalizeTabName, createTutorialImageUrl } from '@/utils/tutorial-utils';

// Create dedicated logger for this hook
const logger = createTutorialLogger('TutorialImageCache');

interface UseTutorialImageCacheProps {
  tabName: string;
  currentStep: number;
  totalSteps: number;
  imageUrl?: string;
}

interface UseTutorialImageCacheResult {
  isLoading: boolean;
  cachePerformance: {
    cacheSize: number;
    hitRate: number;
  };
}

/**
 * Hook for managing tutorial image caching
 * 
 * This hook handles the preloading of tutorial images and provides
 * loading state management and performance metrics.
 */
export function useTutorialImageCache({
  tabName,
  currentStep,
  totalSteps,
  imageUrl
}: UseTutorialImageCacheProps): UseTutorialImageCacheResult {
  const [isLoading, setIsLoading] = useState(true);
  const [cachePerformance, setCachePerformance] = useState({
    cacheSize: 0,
    hitRate: 0
  });

  // Initialize cache on first load
  useEffect(() => {
    // Log initialization for debugging
    logger.debug(`Tutorial image cache hook initialized for ${tabName}`);
  }, []);

  // Preload images when tab name or step changes
  useEffect(() => {
    if (!tabName) return;

    const normalizedTabName = normalizeTabName(tabName);
    
    // Only preload if we have a valid tab name and step
    if (normalizedTabName && currentStep >= 0 && totalSteps > 0) {
      logger.debug(`Preloading tutorial images for ${normalizedTabName} (step ${currentStep + 1}/${totalSteps})`);
      
      // Use the preloading function from the image cache module
      preloadTutorialImages(normalizedTabName, currentStep, totalSteps);
      
      // Update cache performance stats
      const stats = getCacheStats();
      setCachePerformance({
        cacheSize: stats.size,
        hitRate: stats.totalHits > 0 ? stats.averageHits : 0
      });
    }
  }, [tabName, currentStep, totalSteps]);

  // Check if current image is already cached and update loading state
  useEffect(() => {
    if (!imageUrl) {
      setIsLoading(false);
      return;
    }

    // Check if the specific image is cached
    if (isImageCached(imageUrl)) {
      logger.debug(`Cache hit for tutorial image: ${imageUrl}`);
      setIsLoading(false);
    } else {
      logger.debug(`Cache miss for tutorial image: ${imageUrl}`);
      setIsLoading(true);
    }
  }, [imageUrl]);

  return {
    isLoading,
    cachePerformance
  };
}

export default useTutorialImageCache;
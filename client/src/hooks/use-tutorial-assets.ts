import { useState, useEffect } from 'react';

/**
 * Utility to create a logger for debugging tutorial asset loading
 */
const createLogger = (prefix: string) => ({
  debug: (message: string, ...args: any[]) => console.debug(`[${prefix}]`, message, ...args),
  info: (message: string, ...args: any[]) => console.info(`[${prefix}]`, message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[${prefix}]`, message, ...args),
  error: (message: string, ...args: any[]) => console.error(`[${prefix}]`, message, ...args),
});

// Create a logger instance
const logger = createLogger('TutorialAssets');

// Placeholder image path to use when an image is not found
const PLACEHOLDER_IMAGE_PATH = '/assets/tutorials/placeholder.svg';

/**
 * Hook for loading tutorial assets (images, etc.)
 * Uses only the exact image path specified, with a placeholder for missing images
 * 
 * @param {string} assetPath - Path to the asset to load
 * @param {boolean} shouldLoad - Whether to load the asset or not
 * @returns {Object} - Object containing the loaded asset and loading state
 */
export function useTutorialAssets(assetPath: string, shouldLoad: boolean = true) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [imageNotFound, setImageNotFound] = useState<boolean>(false);

  useEffect(() => {
    // Reset when a new asset is requested
    if (assetPath && shouldLoad) {
      setIsLoading(true);
      setError(null);
      setImageNotFound(false);
      
      // Set the image URL directly - we'll handle errors in the component
      setImageUrl(assetPath);
      
      // Log the image path for debugging
      logger.info(`Using image path: ${assetPath}`);
      
      // Complete loading
      setIsLoading(false);
    } else {
      // Clear state if we shouldn't load
      setImageUrl('');
      setIsLoading(false);
      setImageNotFound(false);
    }
  }, [assetPath, shouldLoad]);

  // Utility function to handle image errors
  const handleImageError = () => {
    logger.error(`Failed to load image: ${imageUrl}`);
    setError(new Error(`Failed to load image: ${imageUrl}`));
    setImageNotFound(true);
  };

  return {
    imageUrl,
    isLoading,
    error,
    imageNotFound,
    handleImageError,
    placeholderPath: PLACEHOLDER_IMAGE_PATH
  };
}
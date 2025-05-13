import { useState, useEffect } from 'react';

/**
 * Hook for loading tutorial assets (images, etc.)
 * 
 * @param {string} assetPath - Path to the asset to load
 * @param {boolean} shouldLoad - Whether to load the asset or not
 * @returns {Object} - Object containing the loaded asset and loading state
 */
export function useTutorialAssets(assetPath: string, shouldLoad: boolean = true) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset when a new asset is requested
    if (assetPath && shouldLoad) {
      setIsLoading(true);
      setError(null);
      
      // In a real implementation, we might need to preload images
      // or handle other asset types. For now we just set the URL.
      setImageUrl(assetPath);
      setIsLoading(false);
    } else {
      // Clear state if we shouldn't load
      setImageUrl('');
      setIsLoading(false);
    }
  }, [assetPath, shouldLoad]);

  return {
    imageUrl,
    isLoading,
    error
  };
}
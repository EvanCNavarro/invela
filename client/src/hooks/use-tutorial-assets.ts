import { useState, useEffect } from 'react';

interface UseTutorialAssetsResult {
  isLoading: boolean;
  imageUrl: string | null;
  error: Error | null;
}

/**
 * Hook to load and manage tutorial assets
 * 
 * This hook handles loading tutorial images and provides loading state
 * for the tutorial UI. It supports both direct asset paths and full URLs.
 * 
 * @param {string} assetPath - Path or URL to the tutorial asset
 * @param {boolean} shouldLoad - Whether the asset should be loaded
 * @returns {UseTutorialAssetsResult} Loading state and image URL
 */
export function useTutorialAssets(
  assetPath: string,
  shouldLoad: boolean = true
): UseTutorialAssetsResult {
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when path changes
    setIsLoading(true);
    setImageUrl(null);
    setError(null);
    
    if (!assetPath || !shouldLoad) {
      setIsLoading(false);
      return;
    }
    
    // Check if the path is a full URL or a relative path
    const isFullUrl = assetPath.startsWith('http://') || assetPath.startsWith('https://');
    
    if (isFullUrl) {
      // For full URLs, just set them directly
      setImageUrl(assetPath);
      setIsLoading(false);
    } else {
      // For relative paths, load the image to check if it exists
      const img = new Image();
      
      img.onload = () => {
        setImageUrl(assetPath);
        setIsLoading(false);
      };
      
      img.onerror = (e) => {
        console.error(`Failed to load tutorial asset: ${assetPath}`, e);
        setError(new Error(`Failed to load image: ${assetPath}`));
        setIsLoading(false);
      };
      
      // Start loading the image
      img.src = assetPath;
    }
  }, [assetPath, shouldLoad]);
  
  return { isLoading, imageUrl, error };
}
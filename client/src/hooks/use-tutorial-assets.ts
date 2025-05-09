import { useState, useEffect } from 'react';

interface UseTutorialAssetsResult {
  isLoading: boolean;
  imageUrl: string | null;
  error: Error | null;
}

/**
 * Hook to load tutorial assets with loading state
 * 
 * This hook handles loading tutorial images and tracks loading state
 * to show appropriate loading indicators in the UI.
 * 
 * @param imagePath - Path to the tutorial image
 * @param enabled - Whether to load the asset (for optimization)
 * @returns Object with loading state and image URL
 */
export function useTutorialAssets(
  imagePath: string,
  enabled: boolean = true
): UseTutorialAssetsResult {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !imagePath) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Simulate image loading with a small delay for better UX
    const loadImage = async () => {
      try {
        // Create an image element to preload the image
        const img = new Image();
        
        // Create a promise that resolves when the image loads
        // or rejects if there's an error
        const imageLoadPromise = new Promise<string>((resolve, reject) => {
          img.onload = () => resolve(imagePath);
          img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
          img.src = imagePath;
        });
        
        // Wait for the image to load (min 500ms for UI smoothness)
        const result = await Promise.all([
          imageLoadPromise,
          new Promise(resolve => setTimeout(resolve, 500)) // Minimum loading time
        ]);
        
        if (isMounted) {
          setImageUrl(result[0]);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading tutorial asset:', err);
          setError(err instanceof Error ? err : new Error('Unknown error loading asset'));
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imagePath, enabled]);

  return { isLoading, imageUrl, error };
}
import { useState, useEffect } from 'react';

/**
 * Type for tutorial asset status
 */
export type TutorialAssetStatus = {
  [assetUrl: string]: {
    loaded: boolean;
    error: boolean;
  };
};

/**
 * useAssetPreloader hook
 * 
 * This hook preloads image assets for tutorials to ensure they're
 * available when the tutorial steps are shown to the user.
 * 
 * @param assetUrls Array of image URLs to preload
 * @returns Object containing loading status and completion status
 */
export function useTutorialAssets(assetUrls: string[]) {
  const [assetStatus, setAssetStatus] = useState<TutorialAssetStatus>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!assetUrls || assetUrls.length === 0) {
      setIsLoading(false);
      setIsComplete(true);
      setProgress(100);
      return;
    }

    // Initialize asset status
    const initialStatus: TutorialAssetStatus = {};
    assetUrls.forEach(url => {
      if (url) {
        initialStatus[url] = { loaded: false, error: false };
      }
    });
    setAssetStatus(initialStatus);

    // Filter out any null/undefined URLs
    const validUrls = assetUrls.filter(Boolean);
    let loadedCount = 0;

    // Function to update status when an asset loads or errors
    const updateStatus = (url: string, loaded: boolean, error: boolean) => {
      setAssetStatus(prev => ({
        ...prev,
        [url]: { loaded, error }
      }));

      loadedCount++;
      
      // Calculate progress percentage
      const newProgress = Math.round((loadedCount / validUrls.length) * 100);
      setProgress(newProgress);
      
      // Check if all assets have been processed
      if (loadedCount === validUrls.length) {
        setIsLoading(false);
        setIsComplete(true);
      }
    };

    // Preload each image
    validUrls.forEach(url => {
      // Skip non-image URLs
      if (!url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        updateStatus(url, true, false);
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        updateStatus(url, true, false);
      };
      
      img.onerror = () => {
        console.error(`Failed to load tutorial image: ${url}`);
        updateStatus(url, false, true);
      };
      
      img.src = url;
    });

    // Cleanup function
    return () => {
      // Nothing specific to clean up here
    };
  }, [assetUrls]);

  return {
    assetStatus,
    isLoading,
    isComplete,
    progress
  };
}

export default useTutorialAssets;
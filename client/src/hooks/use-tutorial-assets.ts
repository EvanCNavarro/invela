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

/**
 * Hook for loading tutorial assets (images, etc.)
 * Handles fallback from SVG to PNG if SVG isn't available
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
      
      // Try to handle different image formats
      const tryLoadImage = (path: string) => {
        return new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(path);
          img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
          img.src = path;
        });
      };

      const attemptToLoadImage = async () => {
        try {
          // First try the original path
          await tryLoadImage(assetPath);
          logger.info(`Successfully loaded image: ${assetPath}`);
          setImageUrl(assetPath);
        } catch (originalError) {
          // If the original path fails and ends with .svg, try with .png instead
          if (assetPath.endsWith('.svg')) {
            const pngPath = assetPath.replace('.svg', '.png');
            try {
              await tryLoadImage(pngPath);
              logger.info(`Fallback: loaded PNG image instead of SVG: ${pngPath}`);
              setImageUrl(pngPath);
            } catch (pngError) {
              logger.warn(`Failed to load both SVG and PNG versions:`, { svg: assetPath, png: pngPath });
              // Try one more fallback: change only the extension but keep the original file name
              const lastSlashIndex = assetPath.lastIndexOf('/');
              if (lastSlashIndex >= 0) {
                const basePath = assetPath.substring(0, lastSlashIndex + 1);
                const fallbackPath = `${basePath}overview.png`;
                try {
                  await tryLoadImage(fallbackPath);
                  logger.info(`Fallback: loaded overview.png as last resort: ${fallbackPath}`);
                  setImageUrl(fallbackPath);
                } catch (lastError) {
                  // If all attempts fail, set the original path and let the browser handle the error
                  logger.error(`All image loading attempts failed for: ${assetPath}`);
                  setError(originalError as Error);
                  setImageUrl(assetPath); // Set original path anyway
                }
              } else {
                setError(originalError as Error);
                setImageUrl(assetPath); // Set original path anyway
              }
            }
          } else {
            logger.warn(`Failed to load image and no fallback available: ${assetPath}`);
            setError(originalError as Error);
            setImageUrl(assetPath); // Set original path anyway
          }
        } finally {
          setIsLoading(false);
        }
      };

      attemptToLoadImage();
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
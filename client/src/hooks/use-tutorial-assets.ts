import { useState, useEffect } from 'react';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a logger instance
const logger = createTutorialLogger('TutorialAssets');

// Placeholder image path to use when an image is not found
const PLACEHOLDER_IMAGE_PATH = '/assets/tutorials/placeholder.svg';

/**
 * Map tab names to their corresponding image prefix
 * This ensures we use the correct naming pattern for each tab's tutorial images
 */
const TAB_TO_IMAGE_PREFIX: Record<string, string> = {
  'claims': 'modal_claims_',
  'claims-risk': 'modal_claims_',
  'risk-score': 'modal_risk_',
  'file-vault': 'modal_file_',
  'network': 'modal_network_',
  'network-view': 'modal_network_',
  'insights': 'modal_insights_',
  'dashboard': 'modal_dash_',
  // Add more mappings as needed
};

/**
 * Hook for loading tutorial assets (images, etc.)
 * Now uses the client-provided PNG images from the attached_assets folder
 * 
 * @param {string} tabName - The tab name to load assets for
 * @param {number} stepIndex - The step index (1-based)
 * @param {boolean} shouldLoad - Whether to load the asset or not
 * @returns {Object} - Object containing the loaded asset and loading state
 */
export function useTutorialAssets(tabName: string, stepIndex: number, shouldLoad: boolean = true) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [imageNotFound, setImageNotFound] = useState<boolean>(false);

  useEffect(() => {
    // Reset when a new asset is requested
    if (tabName && shouldLoad) {
      setIsLoading(true);
      setError(null);
      setImageNotFound(false);
      
      // Get the image prefix for this tab, or use a default
      const prefix = TAB_TO_IMAGE_PREFIX[tabName] || `modal_${tabName}_`;
      
      // Construct the image path using the new naming convention
      // We need to add 1 to stepIndex because our internal indexing is 0-based but image filenames are 1-based
      const computedPath = `/assets/tutorials/${prefix}${stepIndex + 1}.png`;
      
      // Set the image URL directly - we'll handle errors in the component
      setImageUrl(computedPath);
      
      // Log the image path for debugging
      logger.debug(`Loading tutorial image for tab: ${tabName}, step: ${stepIndex + 1}`);
      logger.debug(`Using image path: ${computedPath}`);
      
      // Complete loading
      setIsLoading(false);
    } else {
      // Clear state if we shouldn't load
      setImageUrl('');
      setIsLoading(false);
      setImageNotFound(false);
    }
  }, [tabName, stepIndex, shouldLoad]);

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
import React from 'react';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for claims tutorial
const logger = createTutorialLogger('Claims');

export interface ClaimsTutorialProps {
  forceTutorial?: boolean;
}

/**
 * REMOVED: Claims Tutorial Component
 * 
 * This component has been removed and replaced with the unified TutorialManager approach.
 * Please use the TutorialManager component with tabName="claims" instead:
 * 
 * ```jsx
 * <TutorialManager tabName="claims" />
 * ```
 * 
 * This file exists only as a placeholder to prevent import errors in existing code.
 * It does not render anything and simply logs warnings when imported.
 */
export function ClaimsTutorial({ forceTutorial = false }: ClaimsTutorialProps) {
  // Log removal warning
  React.useEffect(() => {
    console.warn(
      '[REMOVED] ClaimsTutorial component has been removed. Please use <TutorialManager tabName="claims" /> instead. ' +
      'This component no longer renders anything and will be completely removed in a future release.'
    );
    logger.warn('ClaimsTutorial component has been removed. Migration to TutorialManager required.');
  }, []);
  
  // Don't render anything - just return null
  return null;
}
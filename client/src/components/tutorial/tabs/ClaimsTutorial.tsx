import React, { useEffect } from 'react';
import { TutorialManager } from '../TutorialManager';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for claims tutorial
const logger = createTutorialLogger('Claims');

export interface ClaimsTutorialProps {
  forceTutorial?: boolean;
}

/**
 * Claims Tutorial Component
 * 
 * This component implements the unified tutorial system for the Claims tab.
 * It wraps the TutorialManager component with the correct tab name and
 * handles cleanup of any legacy localStorage values that might interfere.
 * 
 * This implementation ensures the tutorial modal appears immediately when 
 * visiting the Claims page, providing the best onboarding experience.
 */
export function ClaimsTutorial({ forceTutorial = false }: ClaimsTutorialProps) {
  // Log component initialization
  useEffect(() => {
    logger.info('Claims tutorial component mounted');
    
    // Clean up legacy localStorage values that could interfere with the unified system
    try {
      // Only remove these values if they exist (to avoid unnecessary localStorage operations)
      const hasLegacyCompleted = localStorage.getItem('claims-tutorial-completed') !== null;
      const hasLegacySkipped = localStorage.getItem('claims-tutorial-skipped') !== null;
      
      if (hasLegacyCompleted || hasLegacySkipped) {
        logger.info('Cleaning up legacy localStorage values for claims tutorial');
        localStorage.removeItem('claims-tutorial-completed');
        localStorage.removeItem('claims-tutorial-skipped');
      }
    } catch (error) {
      logger.error('Error during localStorage cleanup', error);
    }
    
    return () => {
      logger.info('Claims tutorial component unmounting');
    };
  }, []);
  
  // Render the TutorialManager with claims tab name
  // The TutorialManager component will return a React element with the tutorial UI
  return (
    <>
      {/* TutorialManager returns the appropriate tutorial UI or null */}
      <TutorialManager tabName="claims" />
    </>
  );
}
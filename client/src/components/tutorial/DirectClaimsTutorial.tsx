import React, { useState, useEffect } from 'react';
import { TabTutorialModal } from './TabTutorialModal';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for this component
const logger = createTutorialLogger('DirectClaimsTutorial');

// Define tutorial steps directly to avoid any data fetching issues
const tutorialSteps = [
  {
    title: 'Claims Dashboard',
    description: 'Welcome to Claims Management. This dashboard gives you an overview of all claims, their status, and important metrics.',
    imagePath: '/assets/tutorials/claims/overview.svg',
  },
  {
    title: 'Claim Details',
    description: 'Click on any claim to view its full details, including policy information, claimant data, and documentation.',
    imagePath: '/assets/tutorials/claims/details.svg',
  },
  {
    title: 'Claims Processing',
    description: 'Use these tools to process claims efficiently. You can update status, request additional information, or approve payments.',
    imagePath: '/assets/tutorials/claims/processing.svg',
  },
  {
    title: 'Analytics Dashboard',
    description: 'The analytics dashboard provides insights into claims trends, settlement times, and potential fraud indicators.',
    imagePath: '/assets/tutorials/claims/analytics.svg',
  },
  {
    title: 'Documentation Management',
    description: 'Manage all claim-related documents in this section. You can upload, organize, and securely share important files with stakeholders.',
    imagePath: '/assets/tutorials/claims/documentation.svg',
  }
];

/**
 * Direct Claims Tutorial
 * 
 * This is a standalone tutorial component specific to the claims page.
 * It bypasses the useTabTutorials hook and database entirely to ensure
 * the tutorial will always show regardless of database state.
 */
export function DirectClaimsTutorial() {
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // Log initial render
  useEffect(() => {
    logger.info('DirectClaimsTutorial mounted, bypassing hook system');
  }, []);
  
  // Handle step navigation
  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      logger.debug(`Moving to step ${currentStep + 1}`);
      setCurrentStep(prevStep => prevStep + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      logger.debug(`Moving back to step ${currentStep - 1}`);
      setCurrentStep(prevStep => prevStep - 1);
    }
  };
  
  // Handle tutorial completion
  const handleComplete = () => {
    logger.info('Tutorial completed');
    setVisible(false);
    
    // Store in localStorage that it's been seen
    localStorage.setItem('claims-tutorial-completed', 'true');
    
    // Also try to mark it as completed in the database
    try {
      fetch('/api/user-tab-tutorials/claims/complete', {
        method: 'POST'
      }).catch(err => {
        logger.warn('Failed to mark tutorial as completed in database', err);
      });
    } catch (error) {
      logger.error('Error marking tutorial as completed', error);
    }
  };
  
  // Handle closing without completing
  const handleClose = () => {
    logger.info('Tutorial closed without completing');
    setVisible(false);
    
    // Store in localStorage that it's been skipped
    localStorage.setItem('claims-tutorial-skipped', 'true');
    
    // Try to mark it as seen in the database
    try {
      fetch('/api/user-tab-tutorials/claims/seen', {
        method: 'POST'
      }).catch(err => {
        logger.warn('Failed to mark tutorial as seen in database', err);
      });
    } catch (error) {
      logger.error('Error marking tutorial as seen', error);
    }
  };
  
  // Don't render if tutorial has been completed or skipped
  const hasCompletedTutorial = localStorage.getItem('claims-tutorial-completed') === 'true';
  const hasSkippedTutorial = localStorage.getItem('claims-tutorial-skipped') === 'true';
  
  if (hasCompletedTutorial || hasSkippedTutorial || !visible) {
    logger.debug('Not showing tutorial: already completed or skipped');
    return null;
  }
  
  // Get current step content
  const currentContent = tutorialSteps[currentStep];
  
  logger.render(`Rendering tutorial step ${currentStep + 1} of ${tutorialSteps.length}`);
  
  return (
    <TabTutorialModal
      title={currentContent.title}
      description={currentContent.description}
      imageUrl={currentContent.imagePath}
      currentStep={currentStep}
      totalSteps={tutorialSteps.length}
      onNext={handleNext}
      onBack={currentStep > 0 ? handleBack : undefined}
      onClose={handleClose}
      onComplete={handleComplete}
    />
  );
}
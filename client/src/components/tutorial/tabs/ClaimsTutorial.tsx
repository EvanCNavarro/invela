import React, { useState, useEffect } from 'react';
import { TabTutorialModal, TutorialStep } from '@/components/tutorial/TabTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for claims tutorial
const logger = createTutorialLogger('Claims');

const claimsTutorialSteps: TutorialStep[] = [
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

export interface ClaimsTutorialProps {
  forceTutorial?: boolean;
}

/**
 * DEPRECATED: Claims Tutorial Component
 * 
 * @deprecated This component is deprecated and will be removed in a future release.
 * Please use the TutorialManager component with tabName="claims" instead:
 * 
 * ```jsx
 * <TutorialManager tabName="claims" />
 * ```
 * 
 * The centralized TutorialManager component in @/components/tutorial/TutorialManager.tsx 
 * now includes all claims tutorial content and provides a more consistent experience
 * across all tabs in the application.
 * 
 * This custom implementation is being phased out in favor of the unified approach
 * to ensure consistent behavior, better logging, and centralized tutorial management.
 * 
 * @param forceTutorial Whether to force the tutorial to display regardless of database state
 */
export function ClaimsTutorial({ forceTutorial = false }: ClaimsTutorialProps) {
  // Log deprecation warning
  useEffect(() => {
    console.warn(
      '[DEPRECATED] ClaimsTutorial component is deprecated. Please use <TutorialManager tabName="claims" /> instead. ' +
      'This component will be removed in a future release.'
    );
    logger.warn('ClaimsTutorial component is deprecated. Migration to TutorialManager recommended.');
  }, []);
  
  // Track visibility state
  const [tutorialVisible, setTutorialVisible] = useState(forceTutorial);
  // Enhanced logging state
  const [renderAttempts, setRenderAttempts] = useState(0);
  
  // Get tutorial state from hook
  const { 
    tutorialEnabled, 
    currentStep, 
    totalSteps,
    isLoading, 
    isCompleted,
    handleNext,
    handleBack,
    handleComplete,
    markTutorialSeen
  } = useTabTutorials('claims');
  
  // Connect to WebSocket updates for real-time sync
  const { tutorialProgress, tutorialCompleted } = useTutorialWebSocket('claims');
  
  // Keep track of render attempts
  useEffect(() => {
    setRenderAttempts(prev => prev + 1);
  }, []);
  
  // Determine whether to show the tutorial with detailed logging
  useEffect(() => {
    // Log with generous details for debugging
    logger.init('Initializing component', { 
      tutorialEnabled, 
      isLoading, 
      isCompleted,
      forceTutorial,
      currentStep,
      totalSteps,
      renderAttempts
    });
    
    // Logic determining visibility
    if (!isLoading) {
      // Calculate visibility: show if forced OR (enabled AND not completed)
      const shouldShowTutorial = forceTutorial || (tutorialEnabled && !isCompleted);
      
      logger.debug('Visibility decision', {
        forceTutorial,
        tutorialEnabled,
        isCompleted,
        decision: shouldShowTutorial
      });
      
      // If this is forced, we'll enforce visibility by setting state directly
      if (forceTutorial) {
        logger.info('Force enabled - showing tutorial regardless of DB state');
      }
      
      setTutorialVisible(shouldShowTutorial);
    } else {
      logger.debug('Still loading, deferring visibility decision');
    }
  }, [tutorialEnabled, isLoading, isCompleted, forceTutorial, renderAttempts, currentStep, totalSteps]);
  
  // Handle WebSocket updates
  useEffect(() => {
    if (tutorialProgress) {
      logger.debug('Received tutorial progress update via WebSocket', tutorialProgress);
    }
    
    if (tutorialCompleted) {
      logger.info('Tutorial completed via WebSocket update');
      setTutorialVisible(false);
    }
  }, [tutorialProgress, tutorialCompleted]);
  
  // For forced display, we'll use a manual approach with raw data from assets
  const manualStep = Math.min(currentStep, claimsTutorialSteps.length - 1);
  logger.debug(`Render preparation - tutorial visible: ${tutorialVisible}, step: ${manualStep}/${claimsTutorialSteps.length}`);
  
  // Early return for non-visible state
  if (!tutorialVisible) {
    logger.debug('Tutorial not visible, skipping render');
    return null;
  }
  
  // If still loading and not forced, don't render yet
  if (isLoading && !forceTutorial) {
    logger.debug('Tutorial still loading, deferring render');
    return null;
  }
  
  // Get current step content safely
  const currentStepContent = claimsTutorialSteps[manualStep] || claimsTutorialSteps[0];
  
  // Log render event for debugging
  logger.render('Rendering tutorial modal', {
    step: manualStep + 1,
    title: currentStepContent.title,
    totalSteps: claimsTutorialSteps.length
  });
  
  // Render the modal with enhanced logging of props
  return (
    <TabTutorialModal
      title={currentStepContent.title}
      description={currentStepContent.description}
      imageUrl={currentStepContent.imagePath}
      currentStep={manualStep}
      totalSteps={claimsTutorialSteps.length}
      onNext={() => {
        logger.interaction('Next button clicked');
        // Log the step transition for diagnostics
        logger.debug(`Moving from step ${manualStep} to ${manualStep + 1}`);
        handleNext();
      }}
      onBack={manualStep > 0 ? () => {
        logger.interaction('Back button clicked');
        // Log the step transition for diagnostics
        logger.debug(`Moving from step ${manualStep} to ${manualStep - 1}`);
        handleBack();
      } : undefined}
      onClose={() => {
        logger.interaction('Close/Skip button clicked');
        logger.info('Tutorial skipped and marked as seen');
        markTutorialSeen();
      }}
      onComplete={() => {
        logger.interaction('Complete button clicked');
        logger.info('Tutorial completed successfully');
        handleComplete();
      }}
    />
  );
}
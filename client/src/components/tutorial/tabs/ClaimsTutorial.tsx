import React, { useState, useEffect } from 'react';
import { TabTutorialModal, TutorialStep } from '@/components/tutorial/TabTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';

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
 * Claims Tutorial Component
 * 
 * This component manages the tutorial for the Claims page,
 * showing step-by-step instructions with custom images
 * and handling tutorial state persistence.
 */
export function ClaimsTutorial({ forceTutorial = false }: ClaimsTutorialProps) {
  const [tutorialVisible, setTutorialVisible] = useState(false);
  
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
  
  // Determine whether to show the tutorial
  useEffect(() => {
    console.log('[ClaimsTutorial] Initializing component', { 
      tutorialEnabled, 
      isLoading, 
      isCompleted,
      forceTutorial 
    });
    
    if (!isLoading) {
      const shouldShowTutorial = 
        (tutorialEnabled && !isCompleted) || forceTutorial;
      
      console.log('[ClaimsTutorial] Setting tutorial visibility:', shouldShowTutorial);
      setTutorialVisible(shouldShowTutorial);
    }
  }, [tutorialEnabled, isLoading, isCompleted, forceTutorial]);
  
  // Handle WebSocket updates
  useEffect(() => {
    if (tutorialProgress) {
      console.log('[ClaimsTutorial] Received tutorial progress update via WebSocket:', tutorialProgress);
    }
    
    if (tutorialCompleted) {
      console.log('[ClaimsTutorial] Tutorial completed via WebSocket update');
      setTutorialVisible(false);
    }
  }, [tutorialProgress, tutorialCompleted]);
  
  // Don't render anything if tutorial should not be shown
  if (!tutorialVisible || isLoading) {
    return null;
  }
  
  // Get current step content
  const currentStepContent = claimsTutorialSteps[currentStep] || claimsTutorialSteps[0];
  
  // Render the modal
  return (
    <TabTutorialModal
      title={currentStepContent.title}
      description={currentStepContent.description}
      imageUrl={currentStepContent.imagePath}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onBack={currentStep > 0 ? handleBack : undefined}
      onClose={markTutorialSeen}
      onComplete={handleComplete}
    />
  );
}
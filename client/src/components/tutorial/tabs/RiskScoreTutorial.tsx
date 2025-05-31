import React, { useEffect } from 'react';
import { TabTutorialModal, TutorialStep } from '../TabTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialAssets } from '@/hooks/use-tutorial-assets';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';

// Tutorial steps for Risk Score Configuration tab
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Risk Score Configuration',
    description: 'Welcome to the Risk Score Configuration page. Here you can customize how risk is assessed across your organization and compare risk profiles with other companies.',
    imagePath: '/assets/tutorials/risk-score/overview.svg',
  },
  {
    title: 'Risk Gauge',
    description: 'The Risk Gauge shows the current calculated risk level based on your configuration. Higher scores indicate greater risk exposure.',
    imagePath: '/assets/tutorials/risk-score/gauge.svg',
  },
  {
    title: 'Risk Dimensions',
    description: 'Drag and drop these cards to prioritize different risk dimensions. The order indicates the relative importance of each dimension in the overall risk calculation.',
    imagePath: '/assets/tutorials/risk-score/dimension-cards.svg',
  },
  {
    title: 'Risk Acceptance Level',
    description: 'Adjust this slider to set your organization\'s risk tolerance. This affects how calculated scores are interpreted in the context of your risk appetite.',
    imagePath: '/assets/tutorials/risk-score/risk-acceptance.svg',
  },
  {
    title: 'Comparative Analysis',
    description: 'Compare your risk profile with other companies or industry benchmarks. Use the search bar to add companies to your comparison.',
    imagePath: '/assets/tutorials/risk-score/comparative.svg',
  },
];

/**
 * Tutorial for the Risk Score Configuration tab
 * 
 * This tutorial guides users through the risk score configuration page,
 * explaining each section's purpose and how to interact with it.
 * It supports real-time updates via WebSockets for multi-device synchronization.
 */
export function RiskScoreTutorial() {
  const { 
    tutorialEnabled, 
    currentStep, 
    totalSteps, 
    isCompleted, 
    isLoading: tutorialLoading,
    handleNext, 
    handleComplete, 
    markTutorialSeen 
  } = useTabTutorials('risk-score');
  
  // Connect to WebSocket for real-time updates
  const { tutorialUpdate } = useTutorialWebSocket('risk-score');
  
  // Load tutorial assets
  const { isLoading: assetLoading, imageUrl } = useTutorialAssets(
    TUTORIAL_STEPS[currentStep]?.imagePath || TUTORIAL_STEPS[currentStep]?.imageUrl || '',
    tutorialEnabled && !isCompleted
  );
  
  // Combine loading states
  const isLoading = tutorialLoading || assetLoading;
  
  // Handle WebSocket tutorial updates
  useEffect(() => {
    if (tutorialUpdate) {
      if (tutorialUpdate.completed) {
        // If we received a completion notification via WebSocket, update our local state
        // This effect will only run when the tutorial is completed by another client
        console.log('[Tutorial] Received tutorial completion notification via WebSocket');
      }
      
      if (tutorialUpdate.currentStep !== undefined && tutorialUpdate.currentStep !== currentStep) {
        // If we received a progress update via WebSocket and it differs from our current step,
        // we could choose to update our local state to match
        console.log('[Tutorial] Received tutorial progress update via WebSocket:', tutorialUpdate);
      }
    }
  }, [tutorialUpdate, currentStep]);

  // Don't render if tutorial is not enabled or completed
  if (!tutorialEnabled || isCompleted) {
    return null;
  }

  return (
    <TabTutorialModal
      title={TUTORIAL_STEPS[currentStep]?.title || ''}
      description={TUTORIAL_STEPS[currentStep]?.description || ''}
      imageUrl={imageUrl}
      isLoading={isLoading}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onComplete={handleComplete}
      onClose={() => markTutorialSeen()}
    />
  );
}
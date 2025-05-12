import React, { useEffect } from 'react';
import { TabTutorialModal, TutorialStep } from '../TabTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { preloadTutorialImages } from '@/lib/image-cache';

// Create dedicated logger for this component
const logger = createTutorialLogger('RiskScoreTutorial');

// Tutorial steps for Risk Score Configuration tab
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'S&P Data Access Risk Score',
    stepTitle: 'Analyze Risk Exposure',
    description: 'Welcome to the Risk Score Configuration page. Here you can customize how risk is assessed across your organization and compare risk profiles with other companies.',
    imageUrl: '/assets/tutorials/risk-score-configuration/modal_risk_1.png',
    bulletPoints: [
      'Configure your organization\'s risk assessment parameters',
      'Visualize risk exposure across multiple dimensions',
      'Compare your risk profile with industry benchmarks'
    ]
  },
  {
    title: 'S&P Data Access Risk Score',
    stepTitle: 'Customize Risk Dimensions',
    description: 'Drag and drop dimension cards to prioritize different risk factors. The order and weight you assign affects how the overall risk score is calculated.',
    imageUrl: '/assets/tutorials/risk-score-configuration/modal_risk_2.png',
    bulletPoints: [
      'Reorder dimensions by dragging cards up or down',
      'Adjust weights using the sliders to reflect importance',
      'See immediate impact on your overall risk profile'
    ]
  },
  {
    title: 'S&P Data Access Risk Score',
    stepTitle: 'Set Risk Tolerance',
    description: 'Define your organization\'s risk acceptance level. This threshold determines what risk levels are considered acceptable for your business context.',
    imageUrl: '/assets/tutorials/risk-score-configuration/modal_risk_3.png',
    bulletPoints: [
      'Adjust the Risk Acceptance slider to set your tolerance',
      'View how it impacts score interpretation',
      'Get recommendations based on your specific settings'
    ]
  }
];

/**
 * Tutorial for the Risk Score Configuration tab
 * 
 * This tutorial guides users through the risk score configuration page,
 * explaining each section's purpose and how to interact with it.
 * It supports real-time updates via WebSockets and enhanced image caching.
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
  } = useTabTutorials('risk-score-configuration');
  
  // Connect to WebSocket for real-time updates
  const { tutorialUpdate } = useTutorialWebSocket('risk-score-configuration');
  
  // Get current step information
  const currentTutorialStep = TUTORIAL_STEPS[currentStep] || TUTORIAL_STEPS[0];
  const currentImageUrl = currentTutorialStep?.imageUrl || '';
  
  // Preload all tutorial images on component mount
  useEffect(() => {
    if (tutorialEnabled && !isCompleted) {
      // Extract all image URLs from tutorial steps
      const allImages = TUTORIAL_STEPS.map(step => step.imageUrl).filter(Boolean) as string[];
      
      // Preload all images with our enhanced cache system
      if (allImages.length > 0) {
        logger.debug(`Preloading all ${allImages.length} tutorial images`);
        preloadTutorialImages('risk-score-configuration', currentStep, TUTORIAL_STEPS.length);
      }
    }
  }, [tutorialEnabled, isCompleted, currentStep]);
  
  // Handle WebSocket tutorial updates
  useEffect(() => {
    if (tutorialUpdate) {
      logger.debug(`Received tutorial update via WebSocket:`, tutorialUpdate);
      
      if (tutorialUpdate.completed) {
        logger.info(`Tutorial marked as completed via WebSocket`);
      }
    }
  }, [tutorialUpdate]);

  // Don't render if tutorial is not enabled or completed
  if (!tutorialEnabled || isCompleted) {
    return null;
  }

  return (
    <TabTutorialModal
      title={currentTutorialStep.title || ''}
      description={currentTutorialStep.description || ''}
      imageUrl={currentImageUrl}
      isLoading={tutorialLoading}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onComplete={handleComplete}
      onClose={() => markTutorialSeen()}
      bulletPoints={currentTutorialStep.bulletPoints}
      stepTitle={currentTutorialStep.stepTitle}
    />
  );
}
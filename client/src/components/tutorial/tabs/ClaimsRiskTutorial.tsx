import React from 'react';
import { TabTutorialModal, TutorialStep } from '../TabTutorialModal';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialAssets } from '@/hooks/use-tutorial-assets';

// Tutorial steps for Claims Risk tab
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Claims Risk Analysis',
    description: 'Welcome to the Claims Risk Analysis page. Here you can analyze insurance claims data and identify potential risk patterns across your organization.',
    imagePath: '/assets/tutorials/claims-risk/overview.svg',
  },
  {
    title: 'Claims Distribution',
    description: 'This visualization shows the distribution of claims by category. Larger segments represent areas with higher claim frequency.',
    imagePath: '/assets/tutorials/claims-risk/distribution.svg',
  },
  {
    title: 'Claim Types',
    description: 'Review different claim types and their associated risk factors. Higher risk claims are highlighted for easier identification.',
    imagePath: '/assets/tutorials/claims-risk/types.svg',
  },
  {
    title: 'Temporal Analysis',
    description: 'Examine claims patterns over time to identify seasonal trends or emerging risk areas that require attention.',
    imagePath: '/assets/tutorials/claims-risk/temporal.svg',
  }
];

/**
 * Tutorial for the Claims Risk tab
 * 
 * This tutorial guides users through the claims risk analysis page,
 * explaining how to interpret various visualizations and identify risk patterns.
 */
export function ClaimsRiskTutorial() {
  const { tutorialEnabled, currentStep, totalSteps, isCompleted, handleNext, handleComplete, markTutorialSeen } = 
    useTabTutorials('claims-risk');
  
  const { isLoading, imageUrl } = useTutorialAssets(
    TUTORIAL_STEPS[currentStep]?.imagePath || TUTORIAL_STEPS[currentStep]?.imageUrl || '',
    tutorialEnabled && !isCompleted
  );

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
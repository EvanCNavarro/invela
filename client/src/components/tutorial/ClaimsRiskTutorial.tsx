import React from 'react';
import TabTutorialModal, { TutorialStep } from './TabTutorialModal';

/**
 * Claims Risk tutorial component
 * 
 * This component implements a specific tutorial for the Claims Risk tab,
 * using the generic TabTutorialModal component.
 */
const ClaimsRiskTutorial: React.FC = () => {
  // Define the tutorial steps for the Claims Risk tab
  const tutorialSteps: TutorialStep[] = [
    {
      title: 'Welcome to Claims Risk Management',
      description: 'This tab provides tools to assess and manage insurance claim risks. You can track claim status, visualize risk patterns, and identify potential fraud indicators.',
      imageUrl: '/assets/tutorials/claims-risk/overview.png'
    },
    {
      title: 'Claims Dashboard',
      description: 'The dashboard shows an overview of all claims with their current status. You can filter by date, type, status, and risk level.',
      imageUrl: '/assets/tutorials/claims-risk/dashboard.png'
    },
    {
      title: 'Risk Indicators',
      description: 'These cards highlight potential risk factors in claims. Red indicators require immediate attention, while yellow suggests further investigation.',
      imageUrl: '/assets/tutorials/claims-risk/indicators.png'
    },
    {
      title: 'Claim Details',
      description: 'Click on any claim to see detailed information, including documentation, history, and assessment timeline.',
      imageUrl: '/assets/tutorials/claims-risk/details.png'
    },
    {
      title: 'Fraud Detection',
      description: 'Our AI-powered fraud detection system analyzes patterns across claims to identify potential fraudulent activity.',
      imageUrl: '/assets/tutorials/claims-risk/fraud-detection.png'
    }
  ];

  return (
    <TabTutorialModal
      tabKey="claims-risk"
      steps={tutorialSteps}
      title="Claims Risk Management"
      subtitle="Learn how to assess and manage insurance claim risks effectively"
    />
  );
};

export default ClaimsRiskTutorial;
import React from 'react';
import { TabTutorialModal, TutorialStep } from './TabTutorialModal';

/**
 * Risk Score Configuration tutorial component
 * 
 * This component implements a specific tutorial for the Risk Score Configuration tab,
 * using the generic TabTutorialModal component.
 */
const RiskScoreTutorial: React.FC = () => {
  // Define the tutorial steps for the Risk Score Configuration tab
  const tutorialSteps: TutorialStep[] = [
    {
      title: 'Welcome to Risk Score Configuration',
      description: 'This is where you can customize how risk is calculated and visualized for your organization. You can adjust priorities, weights, and see the impact in real-time.',
      imageUrl: '/assets/tutorials/risk-score/overview.png'
    },
    {
      title: 'Dimension Cards',
      description: 'These cards represent different risk dimensions. You can drag them to reorder based on priority. The most important dimensions should be at the top.',
      imageUrl: '/assets/tutorials/risk-score/dimension-cards.png'
    },
    {
      title: 'Risk Acceptance Level',
      description: 'Use this slider to set your organization\'s risk tolerance. Moving right increases acceptance of risk, while moving left makes the system more conservative.',
      imageUrl: '/assets/tutorials/risk-score/risk-acceptance.png'
    },
    {
      title: 'Comparative Visualization',
      description: 'This section allows you to compare risk profiles across companies. Search for companies to add them to the comparison view.',
      imageUrl: '/assets/tutorials/risk-score/comparative.png'
    },
    {
      title: 'Risk Gauge',
      description: 'The gauge shows the current risk level based on your configuration. Changes to weights and priorities are reflected here in real-time.',
      imageUrl: '/assets/tutorials/risk-score/gauge.png'
    }
  ];

  return (
    <TabTutorialModal
      tabKey="risk-score-configuration"
      steps={tutorialSteps}
      title="Risk Score Configuration"
      subtitle="Learn how to customize and interpret risk scoring for your organization"
    />
  );
};

export default RiskScoreTutorial;
import React from 'react';
import { TutorialManager } from './TutorialManager';

/**
 * Claims Risk tutorial component
 * 
 * This component implements a specific tutorial for the Claims Risk tab,
 * using the unified TutorialManager component.
 */
const ClaimsRiskTutorial: React.FC = () => {
  return <TutorialManager tabName="claims-risk" />;
};

export default ClaimsRiskTutorial;
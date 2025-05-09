import React from 'react';
import { TutorialManager } from './TutorialManager';

/**
 * Risk Score Configuration tutorial component
 * 
 * This component implements a specific tutorial for the Risk Score tab,
 * using the unified TutorialManager component.
 */
const RiskScoreTutorial: React.FC = () => {
  return <TutorialManager tabName="risk-score" />;
};

export default RiskScoreTutorial;
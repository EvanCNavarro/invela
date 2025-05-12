import { useEffect } from 'react';
import { TabTutorialModal } from './TabTutorialModal';

/**
 * ForcedTutorialTest
 * 
 * This component is a test component that forces a tutorial to display
 * regardless of state. It's used to debug issues with the tutorial system.
 */
export function ForcedTutorialTest() {
  // Log that we're rendering this component
  useEffect(() => {
    console.log('========================');
    console.log('FORCED TUTORIAL TEST COMPONENT MOUNTED');
    console.log('This component will always try to render a tutorial modal');
    console.log('========================');
  }, []);

  const handleNext = () => {
    console.log('Next button clicked in forced tutorial');
  };

  const handleComplete = () => {
    console.log('Complete button clicked in forced tutorial');
  };

  const handleClose = () => {
    console.log('Close button clicked in forced tutorial');
  };

  // Render a tutorial modal with hard-coded values
  return (
    <TabTutorialModal
      title="Forced Test Tutorial"
      description="This is a forced test tutorial to debug rendering issues. If you can see this, the tutorial modal rendering mechanism works correctly."
      imageUrl="/assets/tutorials/dashboard/overview.svg"
      isLoading={false}
      currentStep={0}
      totalSteps={3}
      onNext={handleNext}
      onComplete={handleComplete}
      onClose={handleClose}
    />
  );
}
/**
 * Tutorial Page Wrapper
 * 
 * This component wraps tab pages that have tutorials, handling the display
 * of skeleton loaders while tutorial state is being determined. It prevents
 * the "flash" of content that occurs when navigating to a tab after having
 * completed its tutorial.
 */

import React, { useState } from 'react';
import { TabContentSkeleton } from './TabContentSkeleton';
import { TutorialManager } from './TutorialManager';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for this component
const logger = createTutorialLogger('TutorialPageWrapper');

interface TutorialPageWrapperProps {
  /**
   * The name of the tab for which to show tutorials
   */
  tabName: string;
  
  /**
   * The actual content to render when tutorial state is determined
   */
  children: React.ReactNode;
  
  /**
   * Number of skeleton rows to show during loading
   * @default 3
   */
  skeletonRows?: number;
  
  /**
   * Additional CSS classes to apply to the skeleton
   */
  skeletonClassName?: string;
}

/**
 * A wrapper for tab pages that have tutorials
 * 
 * This component manages the loading state between the TutorialManager
 * determining whether to show a tutorial and the actual content being displayed.
 * It prevents the "flash" of content that occurs when navigating to a tab
 * after having completed its tutorial.
 * 
 * @example
 * ```tsx
 * <TutorialPageWrapper tabName="dashboard">
 *   <DashboardContent />
 * </TutorialPageWrapper>
 * ```
 */
export function TutorialPageWrapper({
  tabName,
  children,
  skeletonRows = 3,
  skeletonClassName = ''
}: TutorialPageWrapperProps): React.ReactElement {
  // Track whether content is ready to be shown
  const [contentReady, setContentReady] = useState(false);
  
  // Handle tutorial readiness state changes
  const handleReadyStateChange = (isReady: boolean) => {
    logger.info(`Tutorial ready state changed for ${tabName}: ${isReady}`);
    setContentReady(isReady);
  };
  
  return (
    <>
      {/* Always render the Tutorial Manager */}
      <TutorialManager 
        tabName={tabName} 
        onReadyStateChange={handleReadyStateChange}
        delayContentUntilReady={true}
      />
      
      {/* Show skeleton or content based on readiness */}
      {!contentReady ? (
        <TabContentSkeleton 
          tabName={tabName} 
          rows={skeletonRows} 
          className={skeletonClassName} 
        />
      ) : (
        children
      )}
    </>
  );
}

export default TutorialPageWrapper;
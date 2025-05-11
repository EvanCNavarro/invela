/**
 * Tab Content Skeleton
 * 
 * This component displays a skeleton loading state while the tutorial manager
 * determines whether to show a tutorial for the current tab.
 * 
 * It uses the Skeleton component from shadcn/ui to create a visually appealing
 * loading state that matches the application's design language.
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for the skeleton component
const logger = createTutorialLogger('TabContentSkeleton');

interface TabContentSkeletonProps {
  /**
   * Name of the tab this skeleton is for - used for logging
   */
  tabName: string;
  
  /**
   * Number of rows to display in the skeleton
   * @default 3
   */
  rows?: number;
  
  /**
   * Additional CSS classes to apply to the skeleton container
   */
  className?: string;
}

/**
 * A skeleton loading component that displays while the tab's tutorial state is being determined
 * 
 * This component creates a placeholder UI that matches the general structure of tab content
 * to prevent layout shifts when the actual content loads.
 */
export function TabContentSkeleton({ 
  tabName, 
  rows = 3, 
  className = '' 
}: TabContentSkeletonProps): React.ReactElement {
  
  // Log when the skeleton is mounted/rendered
  React.useEffect(() => {
    logger.info(`Showing content skeleton for ${tabName} tab`);
    
    return () => {
      logger.info(`Removing content skeleton for ${tabName} tab`);
    };
  }, [tabName]);
  
  return (
    <div className={`w-full space-y-5 animate-pulse ${className}`} data-testid={`${tabName}-skeleton`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      
      {/* Content blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-[180px] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[180px] w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
      
      {/* Additional rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ))}
    </div>
  );
}

export default TabContentSkeleton;
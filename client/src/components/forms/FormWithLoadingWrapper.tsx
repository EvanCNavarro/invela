/**
 * Form With Loading Wrapper
 * 
 * This component manages the loading sequence for form rendering to prevent flashing
 * of the wrong form variant (editable vs read-only).
 * 
 * It ensures that we never show the editable form for submitted tasks,
 * and handles the entire loading sequence properly.
 */

import React, { useState, useEffect } from 'react';
import { UniversalForm } from './UniversalFormNew';
import { FormSkeletonWithMode } from '@/components/ui/form-skeleton';

interface FormWithLoadingWrapperProps {
  taskId?: number;
  taskType: string;
  task?: any;
  isReadOnly?: boolean;
  companyName?: string;
  onProgress?: (progress: number) => void;
  onSubmit?: (data: any) => Promise<void>;
}

export const FormWithLoadingWrapper: React.FC<FormWithLoadingWrapperProps> = ({
  taskId,
  taskType,
  task,
  isReadOnly = false,
  companyName,
  onProgress,
  onSubmit,
}) => {
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [readOnlyStatusDetermined, setReadOnlyStatusDetermined] = useState(false);
  
  // Determine if the form should be read-only based on task status
  // We use isReadOnlyDetermined to make sure we've checked this properly
  const isTaskSubmittedOrReadOnly = task?.status === 'submitted' || 
                                    task?.status === 'completed' || 
                                    isReadOnly;
  
  useEffect(() => {
    // As soon as we have the task, we can determine read-only status
    if (task) {
      setReadOnlyStatusDetermined(true);
      
      // Use a longer delay for the actual form rendering to ensure
      // all data is loaded properly
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
        setIsLoading(false);
      }, 800); // Increased delay to ensure all data is fully loaded
      
      return () => clearTimeout(timer);
    }
  }, [task]);
  
  // Initial loading state - show generic skeleton
  if (!task && isLoading) {
    return <FormSkeletonWithMode readOnly={false} />;
  }
  
  // If we know the task is read-only but still loading data, show read-only skeleton
  if (readOnlyStatusDetermined && isTaskSubmittedOrReadOnly && (isLoading || !initialLoadComplete)) {
    return <FormSkeletonWithMode readOnly={true} />;
  }
  
  // If still loading but not read-only, show default loading skeleton
  if (isLoading || !initialLoadComplete) {
    return <FormSkeletonWithMode readOnly={false} />;
  }
  
  // Render the form with the proper mode - this happens only once loading is complete
  return (
    <div style={{ opacity: initialLoadComplete ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>
      <UniversalForm
        taskId={taskId}
        taskType={taskType}
        initialData={{}}
        onProgress={onProgress}
        companyName={companyName}
        isReadOnly={isTaskSubmittedOrReadOnly}
        onSubmit={onSubmit}
      />
    </div>
  );
};
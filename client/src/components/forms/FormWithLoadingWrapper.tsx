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
  
  // Determine if the form should be read-only based on task status
  const isTaskSubmittedOrReadOnly = task?.status === 'submitted' || 
                                    task?.status === 'completed' || 
                                    isReadOnly;
  
  useEffect(() => {
    // When the task data loads, wait a bit longer to ensure field data is also loaded
    if (task) {
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
        setIsLoading(false);
      }, 500); // Short delay to ensure all data is loaded
      
      return () => clearTimeout(timer);
    }
  }, [task]);
  
  // Don't render anything until we have the task data
  if (!task && isLoading) {
    return <FormSkeletonWithMode readOnly={false} />;
  }
  
  // After task data loads but before complete loading, show appropriate skeleton
  if (isLoading || !initialLoadComplete) {
    return <FormSkeletonWithMode readOnly={isTaskSubmittedOrReadOnly} />;
  }
  
  // Render the form with the proper mode
  return (
    <UniversalForm
      taskId={taskId}
      taskType={taskType}
      initialData={{}}
      onProgress={onProgress}
      companyName={companyName}
      isReadOnly={isTaskSubmittedOrReadOnly}
      onSubmit={onSubmit}
    />
  );
};
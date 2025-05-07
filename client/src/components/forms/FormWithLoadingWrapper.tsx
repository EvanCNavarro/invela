/**
 * Form With Loading Wrapper
 * 
 * This component manages the loading sequence for form rendering to prevent flashing
 * of the wrong form variant (editable vs read-only).
 * 
 * It ensures that we never show the editable form for submitted tasks,
 * and handles the entire loading sequence properly with proper data loading signals.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UniversalForm } from './UniversalFormNew';
import { FormSkeletonWithMode } from '@/components/ui/form-skeleton';
import getLogger from '@/utils/logger';

// Create a logger for this component
const logger = getLogger('FormWithLoadingWrapper');

interface FormWithLoadingWrapperProps {
  taskId?: number;
  taskType: string;
  task?: any;
  isReadOnly?: boolean;
  companyName?: string;
  onProgress?: (progress: number) => void;
  onSubmit?: (data: any) => Promise<void>;
}

// Create a data loading tracker to properly manage loading states
interface DataLoadingState {
  taskLoaded: boolean;
  fieldsLoaded: boolean;
  timestampsLoaded: boolean;
  formServiceInitialized: boolean;
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
  // A ref to track initialization of form service (signal from child component)
  const formServiceInitializedRef = useRef(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Data loading tracker
  const [dataLoadingState, setDataLoadingState] = useState<DataLoadingState>({
    taskLoaded: false,
    fieldsLoaded: false,
    timestampsLoaded: false,
    formServiceInitialized: false
  });
  
  // Determine if the form should be read-only based on task status
  const isTaskSubmittedOrReadOnly = task?.status === 'submitted' || 
                                    task?.status === 'completed' || 
                                    isReadOnly;
  
  // Use React Query to prefetch fields data
  const { isLoading: isFieldsLoading, data: fieldsData } = useQuery({
    queryKey: [`/api/${taskType}/fields`],
    enabled: !!taskType && !!taskId, // Only run when taskType and taskId are provided
  });
  
  // Use React Query to prefetch timestamps data for proper field ordering
  const { isLoading: isTimestampsLoading, data: timestampsData } = useQuery({
    queryKey: [`/api/${taskType}/timestamps/${taskId}`],
    enabled: !!taskType && !!taskId, // Only run when taskType and taskId are provided
  });
  
  // Event handler for when the form service is initialized
  const handleFormServiceInitialized = () => {
    logger.info('Form service initialization signal received');
    formServiceInitializedRef.current = true;
    
    setDataLoadingState(prev => ({
      ...prev,
      formServiceInitialized: true
    }));
  };
  
  // Update loading state when task data is loaded
  useEffect(() => {
    if (task) {
      logger.info(`Task data loaded: ${task.id}, status: ${task.status}, progress: ${task.progress}`);
      
      setDataLoadingState(prev => ({
        ...prev,
        taskLoaded: true
      }));
    }
  }, [task]);
  
  // Update loading state when fields data is loaded
  useEffect(() => {
    if (fieldsData && !isFieldsLoading) {
      logger.info(`Fields data loaded: ${fieldsData ? 'has data' : 'no data'}`);
      
      setDataLoadingState(prev => ({
        ...prev,
        fieldsLoaded: true
      }));
    }
  }, [fieldsData, isFieldsLoading]);
  
  // Update loading state when timestamps data is loaded
  useEffect(() => {
    if (timestampsData && !isTimestampsLoading) {
      logger.info(`Timestamps data loaded: ${timestampsData ? 'has data' : 'no data'}`);
      
      setDataLoadingState(prev => ({
        ...prev,
        timestampsLoaded: true
      }));
    }
  }, [timestampsData, isTimestampsLoading]);
  
  // Watch for all data loading to complete and update state
  useEffect(() => {
    const { taskLoaded, fieldsLoaded, timestampsLoaded, formServiceInitialized } = dataLoadingState;
    
    // If task is loaded we can determine read-only status immediately
    if (taskLoaded) {
      logger.info(`Task status determined: ${isTaskSubmittedOrReadOnly ? 'read-only' : 'editable'}`);
    }
    
    // Check if all required data is loaded
    const allDataLoaded = taskLoaded && fieldsLoaded && 
                         (timestampsLoaded || taskType === 'open_banking'); // Timestamps not needed for open banking
    
    logger.info(`Data loading state: task=${taskLoaded}, fields=${fieldsLoaded}, timestamps=${timestampsLoaded}, allData=${allDataLoaded}`);
    
    if (allDataLoaded) {
      // We still need a small delay for the form service to initialize properly
      // But this delay is minimal and only happens when we know all data is loaded
      const timer = setTimeout(() => {
        logger.info('All data loaded, finalizing rendering');
        setInitialLoadComplete(true);
        setIsLoading(false);
      }, 100); // Very minimal delay just for component initialization
      
      return () => clearTimeout(timer);
    }
  }, [dataLoadingState, taskType, isTaskSubmittedOrReadOnly]);
  
  // Initial loading state - show generic skeleton
  if (!task) {
    return <FormSkeletonWithMode readOnly={false} />;
  }
  
  // If we know the task is read-only, show read-only skeleton while data loads
  if (isTaskSubmittedOrReadOnly && (isLoading || !initialLoadComplete)) {
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
        onFormServiceInitialized={handleFormServiceInitialized}
      />
    </div>
  );
};
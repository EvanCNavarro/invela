/**
 * Form Submission Listener Component
 * 
 * This component listens for form submission events and triggers callbacks based on the event type.
 * It's designed to be used within form components to handle real-time form submission status updates.
 */

import React, { useEffect } from 'react';
import { useFormSubmissionEvents, FormSubmissionEvent } from '../../hooks/use-form-submission-events';
import { useToast } from '@/hooks/use-toast';

interface FormSubmissionListenerProps {
  taskId: number;
  formType: string;
  onSuccess?: (event: FormSubmissionEvent) => void;
  onError?: (event: FormSubmissionEvent) => void;
  onInProgress?: (event: FormSubmissionEvent) => void;
  showToasts?: boolean;
  children?: React.ReactNode;
}

/**
 * Component to listen for form submission events
 */
const FormSubmissionListener: React.FC<FormSubmissionListenerProps> = ({
  taskId,
  formType,
  onSuccess,
  onError,
  onInProgress,
  showToasts = false,
  children,
}) => {
  const { toast } = useToast();
  
  // Set up success handler with optional toast
  const handleSuccess = (event: FormSubmissionEvent) => {
    console.log(`[FormSubmissionListener] Success event for task ${taskId}:`, event);
    
    if (showToasts) {
      toast({
        title: 'Form Submitted Successfully',
        description: `The ${formType} form has been submitted successfully.`,
        variant: 'success',
      });
    }
    
    if (onSuccess) {
      onSuccess(event);
    }
  };
  
  // Set up error handler with optional toast
  const handleError = (event: FormSubmissionEvent) => {
    console.error(`[FormSubmissionListener] Error event for task ${taskId}:`, event);
    
    if (showToasts) {
      toast({
        title: 'Form Submission Error',
        description: event.error || 'An error occurred while submitting the form.',
        variant: 'destructive',
      });
    }
    
    if (onError) {
      onError(event);
    }
  };
  
  // Set up in-progress handler with optional toast
  const handleInProgress = (event: FormSubmissionEvent) => {
    console.log(`[FormSubmissionListener] In progress event for task ${taskId}:`, event);
    
    if (showToasts) {
      toast({
        title: 'Form Submission In Progress',
        description: `The ${formType} form is being processed.`,
        variant: 'info',
      });
    }
    
    if (onInProgress) {
      onInProgress(event);
    }
  };
  
  // Use the form submission events hook
  const { lastEvent } = useFormSubmissionEvents(
    taskId,
    formType,
    handleSuccess,
    handleError,
    handleInProgress
  );
  
  // Debug output for component lifecycle
  useEffect(() => {
    console.log(`[FormSubmissionListener] Started listening for events: task=${taskId}, formType=${formType}`);
    
    return () => {
      console.log(`[FormSubmissionListener] Stopped listening for events: task=${taskId}, formType=${formType}`);
    };
  }, [taskId, formType]);
  
  return <>{children}</>;
};

export default FormSubmissionListener;
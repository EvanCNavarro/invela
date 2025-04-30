/**
 * Form Submission Listener Component
 * 
 * This component listens for WebSocket form submission events and
 * triggers the appropriate callback functions when events are received.
 * 
 * It doesn't render anything visible, it just acts as a listener.
 */

import React from 'react';
import { useFormSubmissionEvents, FormSubmissionEvent } from '@/hooks/use-form-submission-events';
import { useToast } from '@/hooks/use-toast';

interface FormSubmissionListenerProps {
  taskId: number;
  formType: string;
  onSuccess?: (event: FormSubmissionEvent) => void;
  onError?: (event: FormSubmissionEvent) => void;
  onInProgress?: (event: FormSubmissionEvent) => void;
  showToasts?: boolean; // Whether to show toast notifications for events
}

/**
 * A component that listens for form submission events via WebSocket
 * and calls the appropriate handlers when events are received.
 */
const FormSubmissionListener: React.FC<FormSubmissionListenerProps> = ({
  taskId,
  formType,
  onSuccess,
  onError,
  onInProgress,
  showToasts = true,
}) => {
  const { toast } = useToast();
  
  console.log(`[FormSubmissionListener] Initializing for taskId ${taskId}, formType ${formType}`);
  
  // Use our custom hook to listen for form submission events
  const { lastEvent, eventHistory } = useFormSubmissionEvents({
    taskId,
    formType,
    onSuccess: (event) => {
      console.log(`[FormSubmissionListener] Received success event for task ${taskId}:`, event);
      console.log(`[FormSubmissionListener] Success event details:`, {
        taskId: event.taskId, 
        formType: event.formType,
        companyId: event.companyId,
        submissionDate: event.submissionDate,
        unlockedTabs: event.unlockedTabs,
        fileName: event.fileName,
        fileId: event.fileId,
        timestamp: new Date().toISOString()
      });
      
      // Show a success toast if enabled
      if (showToasts) {
        toast({
          title: "Form Submitted Successfully",
          description: `Your ${formType} form has been successfully submitted.`,
          variant: "success",
        });
        console.log('[FormSubmissionListener] Success toast displayed');
      }
      
      // Call the success handler if provided
      if (onSuccess) {
        console.log('[FormSubmissionListener] Calling provided onSuccess handler');
        onSuccess(event);
      }
    },
    onError: (event) => {
      console.error(`[FormSubmissionListener] Received error event for task ${taskId}:`, event);
      console.error(`[FormSubmissionListener] Error details:`, { 
        error: event.error,
        taskId: event.taskId,
        formType: event.formType,
        timestamp: new Date().toISOString()
      });
      
      // Show an error toast if enabled
      if (showToasts) {
        toast({
          title: "Form Submission Failed",
          description: event.error || "An error occurred during form submission.",
          variant: "destructive",
        });
        console.log('[FormSubmissionListener] Error toast displayed');
      }
      
      // Call the error handler if provided
      if (onError) {
        console.log('[FormSubmissionListener] Calling provided onError handler');
        onError(event);
      }
    },
    onInProgress: (event) => {
      console.log(`[FormSubmissionListener] Received in-progress event for task ${taskId}:`, event);
      
      // Show an in-progress toast if enabled
      if (showToasts) {
        toast({
          title: "Form Submission In Progress",
          description: `Your ${formType} form is being processed...`,
          variant: "info",
        });
        console.log('[FormSubmissionListener] In-progress toast displayed');
      }
      
      // Call the in-progress handler if provided
      if (onInProgress) {
        console.log('[FormSubmissionListener] Calling provided onInProgress handler');
        onInProgress(event);
      }
    }
  });
  
  // This component doesn't render anything visible
  return null;
};

export default FormSubmissionListener;
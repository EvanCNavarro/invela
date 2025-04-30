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
  
  // Use our custom hook to listen for form submission events
  const lastEvent = useFormSubmissionEvents(
    taskId,
    formType,
    (event) => {
      console.log(`[FormSubmissionListener] Received success event for task ${taskId}:`, event);
      
      // Show a success toast if enabled
      if (showToasts) {
        toast({
          title: "Form Submitted Successfully",
          description: `Your ${formType} form has been successfully submitted.`,
          variant: "success",
        });
      }
      
      // Call the success handler if provided
      if (onSuccess) {
        onSuccess(event);
      }
    },
    (event) => {
      console.error(`[FormSubmissionListener] Received error event for task ${taskId}:`, event);
      
      // Show an error toast if enabled
      if (showToasts) {
        toast({
          title: "Form Submission Failed",
          description: event.error || "An error occurred during form submission.",
          variant: "destructive",
        });
      }
      
      // Call the error handler if provided
      if (onError) {
        onError(event);
      }
    },
    (event) => {
      console.log(`[FormSubmissionListener] Received in-progress event for task ${taskId}:`, event);
      
      // Show an in-progress toast if enabled
      if (showToasts) {
        toast({
          title: "Form Submission In Progress",
          description: `Your ${formType} form is being processed...`,
          variant: "info",
        });
      }
      
      // Call the in-progress handler if provided
      if (onInProgress) {
        onInProgress(event);
      }
    }
  );
  
  // This component doesn't render anything visible
  return null;
};

export default FormSubmissionListener;
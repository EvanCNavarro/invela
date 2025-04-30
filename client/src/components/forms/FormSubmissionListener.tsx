/**
 * Form Submission Listener Component
 * 
 * This component listens for WebSocket form submission events and
 * triggers the appropriate callback functions when events are received.
 * 
 * It doesn't render anything visible, it just acts as a listener.
 */

import React, { useEffect } from 'react';
import { FormSubmissionEvent } from '@/hooks/use-form-submission-events';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';

interface FormSubmissionListenerProps {
  taskId: number;
  formType: string;
  onSuccess?: (event: FormSubmissionEvent) => void;
  onError?: (event: FormSubmissionEvent) => void;
  onInProgress?: (event: FormSubmissionEvent) => void;
  showToasts?: boolean; // Whether to show toast notifications for events
}

interface WebSocketMessage {
  type: string;
  payload?: any;
  data?: any;
  lastMessage?: any;
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
  const { lastMessage } = useWebSocket();
  
  console.log(`[FormSubmissionListener] Initializing for taskId ${taskId}, formType ${formType}`);
  
  // Process messages directly from WebSocket
  useEffect(() => {
    if (!lastMessage) return;
    
    const message = lastMessage as WebSocketMessage;
    
    // Only handle form submission messages
    if (message.type !== 'form_submitted' && message.type !== 'form_submission_update') {
      return;
    }
    
    // Extract the event data
    const event = message.payload || message.data;
    if (!event) {
      console.log('[FormSubmissionListener] Message has no payload:', message);
      return;
    }
    
    // Verify this event is for our task and form
    if (taskId && event.taskId !== taskId) {
      console.log(`[FormSubmissionListener] Ignoring event for different task: ${event.taskId} vs ${taskId}`);
      return;
    }
    
    if (formType && event.formType !== formType) {
      console.log(`[FormSubmissionListener] Ignoring event for different form: ${event.formType} vs ${formType}`);
      return;
    }
    
    const submissionEvent = event as FormSubmissionEvent;
    console.log(`[FormSubmissionListener] Processing event for task ${taskId}:`, submissionEvent);
    
    // Handle based on status
    if (submissionEvent.status === 'success') {
      console.log(`[FormSubmissionListener] Success event details:`, {
        taskId: submissionEvent.taskId, 
        formType: submissionEvent.formType,
        companyId: submissionEvent.companyId,
        timestamp: new Date().toISOString()
      });
      
      if (showToasts) {
        toast({
          title: "Form Submitted Successfully",
          description: `Your ${formType} form has been successfully submitted.`,
          variant: "success",
        });
      }
      
      if (onSuccess) {
        onSuccess(submissionEvent);
      }
    } 
    else if (submissionEvent.status === 'error') {
      console.error(`[FormSubmissionListener] Error details:`, { 
        error: submissionEvent.error,
        taskId: submissionEvent.taskId,
        formType: submissionEvent.formType
      });
      
      if (showToasts) {
        toast({
          title: "Form Submission Failed",
          description: submissionEvent.error || "An error occurred during form submission.",
          variant: "destructive",
        });
      }
      
      if (onError) {
        onError(submissionEvent);
      }
    } 
    else if (submissionEvent.status === 'in_progress') {
      console.log(`[FormSubmissionListener] In-progress event for task ${taskId}`);
      
      if (showToasts) {
        toast({
          title: "Form Submission In Progress",
          description: `Your ${formType} form is being processed...`,
          variant: "info",
        });
      }
      
      if (onInProgress) {
        onInProgress(submissionEvent);
      }
    }
  }, [lastMessage, taskId, formType, onSuccess, onError, onInProgress, showToasts, toast]);
  
  // This component doesn't render anything visible
  return null;
};

export default FormSubmissionListener;
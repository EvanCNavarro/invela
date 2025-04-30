/**
 * Form Submission Listener Component
 * 
 * This component listens for WebSocket form submission events and calls
 * the appropriate callbacks when events are received.
 */

import React, { useEffect, useContext } from 'react';
import { WebSocketContext } from '@/providers/websocket-provider';
import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('FormSubmissionListener');

export interface SubmissionAction {
  type: string;
  description: string;
  fileId?: number;
  data?: {
    details?: string;
    buttonText?: string;
    url?: string;
    fileId?: number;
  };
}

export interface FormSubmissionEvent {
  taskId: number;
  formType: string;
  status: 'success' | 'error' | 'in_progress';
  companyId?: number;
  fileName?: string;
  fileId?: number;
  unlockedTabs?: string[];
  error?: string;
  submissionDate: string;
  message?: string;
  timestamp: string;
  completedActions?: SubmissionAction[];
}

interface FormSubmissionListenerProps {
  taskId: number;
  formType: string;
  onSuccess?: (event: FormSubmissionEvent) => void;
  onError?: (event: FormSubmissionEvent) => void;
  onInProgress?: (event: FormSubmissionEvent) => void;
  showToasts?: boolean;
}

export const FormSubmissionListener: React.FC<FormSubmissionListenerProps> = ({
  taskId,
  formType,
  onSuccess,
  onError,
  onInProgress,
  showToasts = true
}) => {
  const { socket, isConnected } = useContext(WebSocketContext);

  useEffect(() => {
    if (!socket || !isConnected) {
      logger.warn('WebSocket not connected, form submission updates will not be received');
      return;
    }

    logger.info(`Setting up form submission listener for task ${taskId} (${formType})`);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Process both 'form_submission' and 'form_submitted' events
        if (data.type !== 'form_submission' && data.type !== 'form_submitted') {
          return;
        }
        
        const payload = data.payload;
        
        // Only process events for this task and form type
        if (payload.taskId !== taskId || payload.formType !== formType) {
          return;
        }
        
        logger.info(`Received form submission event for task ${taskId}:`, {
          status: payload.status,
          timestamp: payload.timestamp
        });
        
        // Create the submission event object
        const submissionEvent: FormSubmissionEvent = {
          taskId: payload.taskId,
          formType: payload.formType,
          status: payload.status,
          companyId: payload.companyId,
          fileName: payload.fileName,
          fileId: payload.fileId,
          unlockedTabs: payload.unlockedTabs,
          error: payload.error,
          submissionDate: payload.submissionDate,
          message: payload.message,
          timestamp: payload.timestamp,
          // Include completed actions array if it exists
          ...(payload.completedActions && { completedActions: payload.completedActions })
        };
        
        // Handle the event based on status
        if (payload.status === 'success') {
          // We've disabled toasts here to prevent duplication with parent components
          // Parent components can handle their own toast/modal UI
          // Only show toast if explicitly enabled (disabled by default for most cases)
          if (showToasts) {
            toast({
              title: 'Form submitted successfully',
              description: payload.message || 'Your form has been successfully submitted.',
              variant: 'success',
              duration: 5000,
            });
          }
          
          if (onSuccess) {
            onSuccess(submissionEvent);
          }
        } else if (payload.status === 'error') {
          // Always show error toasts since errors need to be visible
          if (showToasts) {
            toast({
              title: 'Form submission failed',
              description: payload.error || 'An error occurred while submitting your form.',
              variant: 'destructive',
              duration: 5000,
            });
          }
          
          if (onError) {
            onError(submissionEvent);
          }
        } else if (payload.status === 'in_progress') {
          // In-progress toasts are less important for duplicate UI
          if (showToasts) {
            toast({
              title: 'Form submission in progress',
              description: 'Your form is being processed...',
              variant: 'default',
              duration: 3000,
            });
          }
          
          if (onInProgress) {
            onInProgress(submissionEvent);
          }
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
      logger.info(`Cleaned up form submission listener for task ${taskId}`);
    };
  }, [socket, isConnected, taskId, formType, onSuccess, onError, onInProgress, showToasts]);

  return null; // This component doesn't render anything
};

export default FormSubmissionListener;
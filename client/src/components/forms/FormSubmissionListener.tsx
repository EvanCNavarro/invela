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
        
        // Only process form_submission events
        if (data.type !== 'form_submission') {
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
          timestamp: payload.timestamp
        };
        
        // Handle the event based on status
        if (payload.status === 'success') {
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
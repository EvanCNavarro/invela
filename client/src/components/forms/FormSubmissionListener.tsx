/**
 * Form Submission Listener Component
 * 
 * This component listens for WebSocket form submission events and calls
 * the appropriate callbacks when events are received.
 */

import React, { useEffect, useContext, useRef } from 'react';
import { WebSocketContext } from '@/providers/websocket-provider';
import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('FormSubmissionListener');

export interface SubmissionAction {
  type: string;       // Type of action: "task_completion", "file_generation", etc.
  description: string; // Human-readable description
  icon?: string;      // Icon name for this action
  fileId?: number;    // Optional file ID passed directly for CSV or PDF files
  data?: {
    details: string;   // Human-readable details about this action
    buttonText?: string; // Optional button text for navigation actions
    url?: string;      // Optional URL for navigation actions
    fileId?: number;   // Optional file ID for file-related actions
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
  
  // Use refs to track listener state and prevent unnecessary reattachment
  const handleMessageRef = useRef<((event: MessageEvent) => void) | null>(null);
  const listenerInfoRef = useRef<{taskId: number; formType: string} | null>(null);
  const hasSetupListenerRef = useRef<boolean>(false);
  
  // Use refs for callback functions to prevent unnecessary reattachment
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onInProgressRef = useRef(onInProgress);
  const showToastsRef = useRef(showToasts);
  
  // Update refs when props change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onInProgressRef.current = onInProgress;
    showToastsRef.current = showToasts;
  }, [onSuccess, onError, onInProgress, showToasts]);

  useEffect(() => {
    // Only proceed if we actually have a socket and it's connected
    if (!socket || !isConnected) {
      // Don't show warnings during initial page load - only when we've been connected before
      if (hasSetupListenerRef.current) {
        logger.warn('WebSocket not connected, form submission updates will not be received');
      }
      return;
    }
    
    // Check if we need to setup a new listener
    const needsNewListener = 
      !hasSetupListenerRef.current || 
      !listenerInfoRef.current ||
      listenerInfoRef.current.taskId !== taskId ||
      listenerInfoRef.current.formType !== formType;
      
    // If we don't need a new listener, just return
    if (!needsNewListener && hasSetupListenerRef.current && handleMessageRef.current) {
      return;
    }
    
    // Clean up any existing listener if we're setting up a new one
    if (hasSetupListenerRef.current && handleMessageRef.current) {
      socket.removeEventListener('message', handleMessageRef.current);
      logger.info(`Cleaned up form submission listener for task ${listenerInfoRef.current?.taskId}`);
    }

    logger.info(`Setting up form submission listener for task ${taskId} (${formType})`);

    // Create new message handler
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Process both 'form_submission' and 'form_submitted' events
        if (data.type !== 'form_submission' && data.type !== 'form_submitted') {
          return;
        }
        
        // Handle both payload and data fields for backward compatibility
        const payload = data.payload !== undefined ? data.payload : data.data;
        
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
          if (showToastsRef.current) {
            toast({
              title: 'Form submitted successfully',
              description: payload.message || 'Your form has been successfully submitted.',
              variant: 'success',
              duration: 5000,
            });
          }
          
          if (onSuccessRef.current) {
            onSuccessRef.current(submissionEvent);
          }
        } else if (payload.status === 'error') {
          // Always show error toasts since errors need to be visible
          if (showToastsRef.current) {
            toast({
              title: 'Form submission failed',
              description: payload.error || 'An error occurred while submitting your form.',
              variant: 'destructive',
              duration: 5000,
            });
          }
          
          if (onErrorRef.current) {
            onErrorRef.current(submissionEvent);
          }
        } else if (payload.status === 'in_progress') {
          // In-progress toasts are less important for duplicate UI
          if (showToastsRef.current) {
            toast({
              title: 'Form submission in progress',
              description: 'Your form is being processed...',
              variant: 'default',
              duration: 3000,
            });
          }
          
          if (onInProgressRef.current) {
            onInProgressRef.current(submissionEvent);
          }
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
      }
    };

    // Store refs for cleanup
    handleMessageRef.current = handleMessage;
    listenerInfoRef.current = { taskId, formType };
    hasSetupListenerRef.current = true;
    
    // Add the event listener
    socket.addEventListener('message', handleMessage);

    // Cleanup function - only execute on unmount or when task/form changes
    return () => {
      if (socket && handleMessageRef.current) {
        socket.removeEventListener('message', handleMessageRef.current);
        logger.info(`Cleaned up form submission listener for task ${taskId}`);
        hasSetupListenerRef.current = false;
        handleMessageRef.current = null;
      }
    };
  }, [socket, isConnected, taskId, formType]); // Remove callback dependencies

  return null; // This component doesn't render anything
};

export default FormSubmissionListener;
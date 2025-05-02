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

/**
 * Enhanced FormSubmissionEvent interface with better compatibility for different formats
 * 
 * This interface is used to represent form submission events received via WebSocket.
 * It supports various data formats and ensures we handle all use cases.
 */
export interface FormSubmissionEvent {
  taskId: number;                             // Numeric task ID for the form being submitted
  formType: string;                           // Type of form (e.g., 'kyb', 'ky3p', 'open_banking')
  status: 'success' | 'error' | 'in_progress'; // Current status of the form submission
  companyId?: number | null;                  // Optional company ID associated with the form
  fileName?: string | null;                   // Optional file name if a file was generated
  fileId?: number | string | null;            // Optional file ID if a file was generated (could be string or number)
  unlockedTabs?: string[] | null;             // Optional list of tabs that were unlocked
  error?: string | null;                      // Optional error message if status is 'error'
  submissionDate: string;                     // ISO timestamp when the form was submitted
  message?: string | null;                    // Optional success/error message
  timestamp: string;                          // ISO timestamp when the message was sent
  completedActions?: SubmissionAction[] | null; // Optional list of actions that were completed during form submission
  
  // Additional fields for debugging and enhanced compatibility
  source?: string;                            // Source of the message (e.g., 'server-broadcast')
  serverVersion?: string;                     // Version of the server that sent the message
  reason?: string;                            // Optional reason for the status (mostly for errors)
  warnings?: string[];                        // Optional warnings that occurred during submission
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

  // Track reconnection attempts
  const reconnectionAttemptsRef = useRef<number>(0);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  
  // Process messages after reconnection
  useEffect(() => {
    // If we have a socket and it's connected, and we've previously had a connection (were disconnected)
    if (socket && isConnected && reconnectionAttemptsRef.current > 0 && handleMessageRef.current) {
      logger.info(`WebSocket reconnected after ${reconnectionAttemptsRef.current} attempts, checking for missed messages`);
      
      // Reset reconnection counter when successfully reconnected
      reconnectionAttemptsRef.current = 0;
      
      // Request any missed form submission events
      try {
        // Send a message to the server requesting any missed events for this task
        socket.send(JSON.stringify({
          type: 'request_missed_events',
          taskId,
          formType,
          lastMessageId: lastProcessedMessageIdRef.current,
          timestamp: new Date().toISOString()
        }));
        
        logger.info(`Requested missed events for task ${taskId}`);
      } catch (error) {
        logger.error('Error requesting missed events:', error);
      }
    }
  }, [socket, isConnected, taskId, formType]);

  // Main effect for setting up WebSocket listeners
  useEffect(() => {
    // Only proceed if we actually have a socket and it's connected
    if (!socket || !isConnected) {
      // Don't show warnings during initial page load - only when we've been connected before
      if (hasSetupListenerRef.current) {
        reconnectionAttemptsRef.current += 1;
        logger.warn(`WebSocket not connected (attempt ${reconnectionAttemptsRef.current}), form submission updates will not be received`);
      }
      return;
    }
    
    // Reset reconnection counter when connected
    reconnectionAttemptsRef.current = 0;
    
    // Handle scenario where socket reconnected but the component did not remount
    // We check both for new task and for existing socket listener attachment
    const needsReattachment = socket &&
      (socket.readyState === WebSocket.OPEN) &&
      handleMessageRef.current && 
      !hasSetupListenerRef.current;
    
    // Check if we need to setup a new listener
    const needsNewListener = 
      !hasSetupListenerRef.current || 
      !listenerInfoRef.current ||
      listenerInfoRef.current.taskId !== taskId ||
      listenerInfoRef.current.formType !== formType ||
      needsReattachment;
      
    // If we don't need a new listener, just return
    if (!needsNewListener && hasSetupListenerRef.current && handleMessageRef.current) {
      return;
    }
    
    // Clean up any existing listener if we're setting up a new one
    if (hasSetupListenerRef.current && handleMessageRef.current) {
      try {
        socket.removeEventListener('message', handleMessageRef.current);
        logger.info(`Cleaned up form submission listener for task ${listenerInfoRef.current?.taskId}`);
      } catch (e) {
        // Ignore errors removing listeners from potentially closed sockets
      }
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
        
        // Enhanced payload extraction with improved compatibility
        // Handles multiple WebSocket message formats to ensure maximum compatibility
        // These variations can happen due to different WebSocket implementations or API changes
        let payload: Record<string, any> = {};
        
        // Try to extract payload from various possible formats
        if (data.payload !== undefined) {
          payload = data.payload;
        } else if (data.data !== undefined) {
          payload = data.data;
        } else if (data.formId !== undefined || data.taskId !== undefined) {
          // Direct payload in root
          payload = data;
        }
        
        // Handle numeric or string taskId formats (server can send either)
        const extractedTaskId = payload.taskId || payload.formId || payload.id || null;
        if (extractedTaskId !== null) {
          // Ensure taskId is a number for comparison
          payload.taskId = Number(extractedTaskId);
        }
        
        // Log the detailed event structure to help debug compatibility issues
        if (process.env.NODE_ENV === 'development') {
          logger.debug('FormSubmissionListener: Raw WebSocket message structure:', {
            messageType: data.type,
            hasPayload: data.payload !== undefined,
            hasData: data.data !== undefined,
            extractedTaskId,
            expectedTaskId: taskId,
            formType: payload.formType,
            expectedFormType: formType,
            status: payload.status,
            rootKeys: Object.keys(data),
            payloadKeys: Object.keys(payload)
          });
        }
        
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
        const status = payload.status as 'success' | 'error' | 'in_progress';
        
        if (status === 'success') {
          // We've disabled toasts here to prevent duplication with parent components
          // Parent components can handle their own toast/modal UI
          // Only show toast if explicitly enabled (disabled by default for most cases)
          if (showToastsRef.current) {
            toast({
              title: 'Form submitted successfully',
              description: (payload.message as string) || 'Your form has been successfully submitted.',
              variant: 'success',
              duration: 5000,
            });
          }
          
          if (onSuccessRef.current) {
            onSuccessRef.current(submissionEvent);
          }
        } else if (status === 'error') {
          // Always show error toasts since errors need to be visible
          if (showToastsRef.current) {
            toast({
              title: 'Form submission failed',
              description: (payload.error as string) || 'An error occurred while submitting your form.',
              variant: 'destructive',
              duration: 5000,
            });
          }
          
          if (onErrorRef.current) {
            onErrorRef.current(submissionEvent);
          }
        } else if (status === 'in_progress') {
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
        try {
          socket.removeEventListener('message', handleMessageRef.current);
          logger.info(`Cleaned up form submission listener for task ${taskId}`);
        } catch (e) {
          // Ignore errors removing listeners from potentially closed sockets
        } finally {
          hasSetupListenerRef.current = false;
          handleMessageRef.current = null;
        }
      }
    };
  }, [socket, isConnected, taskId, formType]); // Remove callback dependencies

  return null; // This component doesn't render anything
};

export default FormSubmissionListener;
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
  showToasts = false
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

  // Track reconnection attempts and message processing
  const reconnectionAttemptsRef = useRef<number>(0);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  
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
        
        // Process form-related events including task update events which carry form submission status
        if (data.type !== 'form_submission' && 
            data.type !== 'form_submitted' && 
            data.type !== 'task_update' &&
            data.type !== 'task_updated') {
          return;
        }
        
        // Message deduplication: check if we've already processed this message
        const messageId = data.messageId || (data.payload?.messageId) || 
                          `${data.type}_${data.taskId || data.payload?.taskId}_${data.timestamp || data.payload?.timestamp}`;
        
        // Skip if we've already processed this message
        if (messageId && processedMessagesRef.current.has(messageId)) {
          logger.debug(`Skipping duplicate message: ${messageId}`);
          return;
        }
        
        // Add to processed messages set
        if (messageId) {
          processedMessagesRef.current.add(messageId);
          
          // Limit size of processed messages set to avoid memory leaks
          if (processedMessagesRef.current.size > 100) {
            // Keep only the most recent 50 messages
            const messagesToKeep = Array.from(processedMessagesRef.current).slice(-50);
            processedMessagesRef.current = new Set(messagesToKeep);
          }
        }
        
        // Add debug logging to help troubleshoot WebSocket events
        logger.debug(`Processing WebSocket message of type: ${data.type}`, {
          messageType: data.type,
          hasPayload: data.payload !== undefined,
          hasData: data.data !== undefined
        });
        
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
        
        // Only process events for this task
        if (payload.taskId !== taskId) {
          return;
        }
        
        // For task_update events, the formType might not be included
        // In that case, we'll use the formType from the component props
        if (!payload.formType && (data.type === 'task_update' || data.type === 'task_updated')) {
          payload.formType = formType;
          logger.debug(`Added formType to WebSocket payload: ${formType}`);
        } else if (payload.formType !== formType) {
          // If formType is specified but doesn't match, ignore the event
          return;
        }
        
        logger.info(`Received form submission event for task ${taskId}:`, {
          status: payload.status,
          timestamp: payload.timestamp
        });
        
        // Handle missing submissionDate field which might be in metadata or elsewhere
        let submissionDate = payload.submissionDate;
        if (!submissionDate && payload.metadata && payload.metadata.submission_date) {
          submissionDate = payload.metadata.submission_date;
          logger.debug('Using submission_date from metadata:', submissionDate);
        } else if (!submissionDate && payload.metadata && payload.metadata.submissionDate) {
          submissionDate = payload.metadata.submissionDate;
          logger.debug('Using submissionDate from metadata:', submissionDate);
        } else if (!submissionDate) {
          // If no submission date is available, use the message timestamp
          submissionDate = payload.timestamp;
          logger.debug('Using timestamp as fallback for submission date:', submissionDate);
        }
        
        // Format date consistently if it's a valid date
        try {
          if (submissionDate) {
            // Make sure it's a properly formatted ISO string
            const dateObj = new Date(submissionDate);
            if (!isNaN(dateObj.getTime())) {
              submissionDate = dateObj.toISOString();
              logger.debug('Normalized submission date format:', submissionDate);
            }
          }
        } catch (error) {
          logger.warn('Error normalizing submission date:', error);
          // Keep using the original value if conversion fails
        }

        // Create the submission event object
        const submissionEvent: FormSubmissionEvent = {
          taskId: payload.taskId,
          formType: payload.formType,
          status: payload.status,
          companyId: payload.companyId || null,
          fileName: payload.fileName || null,
          fileId: payload.fileId || null,
          unlockedTabs: payload.unlockedTabs || null,
          error: payload.error || null,
          submissionDate: submissionDate,
          message: payload.message || null,
          timestamp: payload.timestamp,
          // Include completed actions array if it exists
          ...(payload.completedActions && { completedActions: payload.completedActions })
        };
        
        // Map task status to form submission status if needed
        let formStatus: 'success' | 'error' | 'in_progress';
        
        // Convert task status to form submission status
        if (data.type === 'task_update' || data.type === 'task_updated') {
          // Map task status to form status
          const taskStatus = payload.status;
          if (taskStatus === 'submitted' || taskStatus === 'completed') {
            formStatus = 'success';
          } else if (taskStatus === 'failed' || taskStatus === 'error') {
            formStatus = 'error';
          } else if (taskStatus === 'in_progress' || taskStatus === 'ready_for_submission') {
            formStatus = 'in_progress';
          } else {
            // Default to whatever was provided
            formStatus = payload.status as 'success' | 'error' | 'in_progress';
          }
        } else {
          // For form_submission events, use the status directly
          formStatus = payload.status as 'success' | 'error' | 'in_progress';
        }
        
        // Update the submission event with the mapped status
        submissionEvent.status = formStatus;
        
        // Log the status mapping for debugging
        logger.debug(`Mapped WebSocket event status: ${payload.status} → ${formStatus}`);
        
        // Handle the event based on the mapped status
        if (formStatus === 'success') {
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
        } else if (formStatus === 'error') {
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
        } else if (formStatus === 'in_progress') {
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
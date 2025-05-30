/**
 * Form Submission Listener Component
 * 
 * This component listens for WebSocket form submission events and calls
 * the appropriate callbacks when events are received.
 * 
 * Enhanced with global event deduplication to prevent duplicate toasts and modals
 * when multiple components are listening for the same events.
 * 
 * This component now shares a global message tracking state with useFormSubmissionEvents
 * to ensure that the same event is never processed twice across the application.
 */

import React, { useEffect, useContext, useRef } from 'react';
import { WebSocketContext } from '@/providers/websocket-provider';
import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('FormSubmissionListener');

// Global tracking of processed messages and active listeners
// These static variables are shared across all instances of the component
// We use window object to make it globally accessible for both component and hook
const GLOBAL_STATE = {
  // Global set to track processed submission messages across all instances
  // This ensures we never process the same message twice, even across different components
  processedMessages: new Set<string>(),
  
  // Map of active listeners by task and form type
  // Used to prevent duplicate listeners for the same task+form combination
  activeListeners: new Map<string, boolean>(),
  
  // Get a unique key for a task+form combination
  getListenerKey(taskId: number, formType: string): string {
    return `${taskId}:${formType}`;
  }
};

// Make the global state available to other modules through the window object
// This allows the useFormSubmissionEvents hook to access the same state
(window as any).__FORM_SUBMISSION_GLOBAL_STATE = GLOBAL_STATE;

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
  source?: string;                            // Source of the message (e.g., 'server-broadcast', 'final_completion')
  serverVersion?: string;                     // Version of the server that sent the message
  reason?: string;                            // Optional reason for the status (mostly for errors)
  warnings?: string[];                        // Optional warnings that occurred during submission
  
  // ADDED: Metadata field for enhanced compatibility and additional information
  metadata?: {
    source?: string;                          // Source of the message in metadata
    finalCompletion?: boolean;                // Indicates if this is the final completion message
    submissionDate?: string;                  // Submission date in metadata
    [key: string]: any;                       // Allow for any other metadata properties
  };
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
  showToasts = false // Default to false to prevent duplicate toasts
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
        // Added support for form_submission_completed which indicates all operations are complete
        if (data.type !== 'form_submission' && 
            data.type !== 'form_submitted' && 
            data.type !== 'task_update' &&
            data.type !== 'task_updated' &&
            data.type !== 'form_submission_completed') {
          return;
        }
        
        // Message deduplication: check if we've already processed this message globally
        const messageId = data.messageId || (data.payload?.messageId) || 
                          `${data.type}_${data.taskId || data.payload?.taskId}_${data.timestamp || data.payload?.timestamp}`;
        
        // Skip if we've already processed this message (globally across all components)
        if (messageId && GLOBAL_STATE.processedMessages.has(messageId)) {
          logger.debug(`Skipping duplicate message: ${messageId} (globally)`);
          return;
        }
        
        // Add to both the global processed messages set and our local component set
        if (messageId) {
          // Add to global set to prevent any other component from processing this same message
          GLOBAL_STATE.processedMessages.add(messageId);
          
          // Also add to our local component set for cleanup on unmount
          processedMessagesRef.current.add(messageId);
          
          // Limit size of global processed messages set to avoid memory leaks
          if (GLOBAL_STATE.processedMessages.size > 500) {
            // Keep only the most recent 250 messages
            const messagesToKeep = Array.from(GLOBAL_STATE.processedMessages).slice(-250);
            GLOBAL_STATE.processedMessages = new Set(messagesToKeep);
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
          ...(payload.completedActions && { completedActions: payload.completedActions }),
          // Include source property if it exists (critical for final_completion detection)
          ...(payload.source && { source: payload.source })
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
        
        // ENHANCED DETECTION: Special handling for form_submission_completed message type
        // This is our comprehensive message sent after ALL server-side operations are complete
        // Check multiple possible locations for source = 'final_completion' for max compatibility
        if (data.type === 'form_submission_completed' || 
            payload.source === 'final_completion' || 
            payload.metadata?.source === 'final_completion' ||
            payload.metadata?.finalCompletion === true) {
            
          // CRITICAL FIX: The 'source' property must be explicitly set to match what task-page.tsx expects
          submissionEvent.source = 'final_completion';
          
          // IMPORTANT: Also update the task status in the form when final completion is detected
          // This ensures the form switches to read-only mode immediately after submission
          const taskStatusEvent = new CustomEvent('task-status-update', {
            bubbles: true,
            detail: {
              taskId,
              status: 'submitted',
              progress: 100,
              source: 'websocket',
              timestamp: new Date().toISOString()
            }
          });
          document.dispatchEvent(taskStatusEvent);
          
          // Log this important status change
          logger.info(`[FormSubmissionListener] 🔄 Dispatched task-status-update event to mark task ${taskId} as submitted`, {
            taskId,
            formType,
            source: 'final_completion',
            timestamp: new Date().toISOString()
          });
          
          // Also ensure the metadata has the source field for maximum compatibility
          if (!submissionEvent.metadata) {
            submissionEvent.metadata = {};
          }
          submissionEvent.metadata.source = 'final_completion';
          submissionEvent.metadata.finalCompletion = true;

          // Add more detailed logging to help with debugging
          logger.info(`Received FINAL form submission completion event for task ${taskId}`, {
            hasCompletedActions: payload.completedActions?.length || 0,
            hasFileInfo: !!payload.fileId,
            hasUnlockedTabs: payload.unlockedTabs?.length || 0,
            originalSource: payload.source || payload.metadata?.source || 'not_set',
            messageType: data.type,
            finalSource: submissionEvent.source,
            timestamp: new Date().toISOString()
          });
          
          // Always ensure the submission status is success for the final completion message
          submissionEvent.status = 'success';
          
          // Show a single toast notification for the completed submission
          if (showToastsRef.current) {
            // Only show one toast with the most informative message
            toast({
              title: 'Form Submission Complete',
              description: 'Your form has been successfully processed and all related actions completed.',
              variant: 'success',
              duration: 5000,
            });
          }
          
          // Call success callback with the complete information that includes all completedActions
          if (onSuccessRef.current) {
            logger.info('Calling success callback with final completion source and all actions', {
              source: submissionEvent.source, 
              taskId: submissionEvent.taskId,
              hasCompletedActions: (submissionEvent.completedActions?.length || 0) > 0,
              actionCount: submissionEvent.completedActions?.length || 0
            });
            
            // Since this is the final completion message, pass it to the success handler
            onSuccessRef.current(submissionEvent);
          }
          
          // Don't process further as we've handled this special message type completely
          return;
        }
        
        // Standard handling for other message types based on status
        if (formStatus === 'success') {
          // For regular success messages, only show a toast if showToasts is enabled
          // But do NOT trigger the modal display yet (unless it's form_submission_completed)
          // This prevents showing the modal with incomplete information
          if (showToastsRef.current) {
            toast({
              title: 'Form submitted successfully',
              description: (payload.message as string) || 'Your form has been successfully submitted.',
              variant: 'success',
              duration: 5000,
            });
          }
          
          // For backward compatibility, still call the success callback 
          // but we'll rely on form_submission_completed for the final modal
          if (onSuccessRef.current && data.type !== 'task_update' && data.type !== 'task_updated') {
            onSuccessRef.current(submissionEvent);
          }
        } else if (formStatus === 'error') {
          // Error handling remains unchanged
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
          // In-progress handling remains unchanged
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
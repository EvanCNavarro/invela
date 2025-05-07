import React, { useContext, useEffect, useRef } from 'react';
import { WebSocketContext } from '../../context/WebSocketContext';
import { toast } from '../../hooks/use-toast';
import { logger } from '../../lib/logger';

/**
 * FormFieldsListener - A component for listening to form fields-related events via WebSocket
 * 
 * This component listens for events related to form field operations (clear, bulk update, etc.)
 * and invokes the appropriate callbacks. It's similar to FormSubmissionListener but focuses
 * specifically on field operations rather than form submissions.
 */
export const FormFieldsListener = ({
  taskId,
  formType,
  onFieldsCleared,
  showToasts = false // Default to false to prevent duplicate toasts
}) => {
  const { socket, isConnected } = useContext(WebSocketContext);
  
  // Use refs to track listener state and prevent unnecessary reattachment
  const handleMessageRef = useRef(null);
  const listenerInfoRef = useRef(null);
  const hasSetupListenerRef = useRef(false);
  const reconnectionAttemptsRef = useRef(0);
  
  // Use refs for callback functions to prevent unnecessary reattachment
  const onFieldsClearedRef = useRef(onFieldsCleared);
  const showToastsRef = useRef(showToasts);
  
  // Update refs when props change
  useEffect(() => {
    onFieldsClearedRef.current = onFieldsCleared;
    showToastsRef.current = showToasts;
  }, [onFieldsCleared, showToasts]);

  // Main effect for setting up WebSocket listeners
  useEffect(() => {
    // Only proceed if we actually have a socket and it's connected
    if (!socket || !isConnected) {
      // Don't show warnings during initial page load - only when we've been connected before
      if (hasSetupListenerRef.current) {
        reconnectionAttemptsRef.current += 1;
        logger.warn(`WebSocket not connected (attempt ${reconnectionAttemptsRef.current}), form field updates will not be received`);
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
    if (socket && handleMessageRef.current && hasSetupListenerRef.current) {
      try {
        socket.removeEventListener('message', handleMessageRef.current);
        logger.info(`Cleaned up form fields listener for task ${listenerInfoRef.current?.taskId}`);
      } catch (e) {
        // Ignore errors removing listeners from potentially closed sockets
      }
    }
    
    // Create a new message handler function
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Skip events that don't match our expected type patterns
        if (!data.type || (
          data.type !== 'fields_cleared' && 
          data.type !== 'task_update' && 
          data.type !== 'task_updated'
        )) {
          return;
        }
        
        logger.debug('Received WebSocket message:', data);
        
        // Extract payload from potentially nested structures
        let payload;
        
        if (data.payload) {
          payload = data.payload;
        } else if (data.data) {
          payload = data.data;
        } else {
          payload = data;
        }
        
        // Handle numeric or string taskId formats (server can send either)
        const extractedTaskId = payload.taskId || payload.formId || payload.id || null;
        if (extractedTaskId !== null) {
          // Ensure taskId is a number for comparison
          payload.taskId = Number(extractedTaskId);
        }
        
        // Log the detailed event structure to help debug compatibility issues
        logger.debug('FormFieldsListener: Raw WebSocket message structure:', {
          messageType: data.type,
          hasPayload: data.payload !== undefined,
          hasData: data.data !== undefined,
          extractedTaskId,
          expectedTaskId: taskId,
          formType: payload.formType,
          expectedFormType: formType,
          action: payload.action,
          rootKeys: Object.keys(data),
          payloadKeys: Object.keys(payload)
        });
        
        // Only process events for this task
        if (payload.taskId !== taskId) {
          return;
        }
        
        // For task_update events with fields_cleared action, provide the formType if missing
        if (payload.action === 'fields_cleared' && !payload.formType && 
           (data.type === 'task_update' || data.type === 'task_updated')) {
          payload.formType = formType;
          logger.debug(`Added formType to fields_cleared payload: ${formType}`);
        } else if (payload.formType !== formType) {
          // Skip events for different form types
          logger.debug(`Skipping event for different form type: ${payload.formType} (expected: ${formType})`);
          return;
        }
        
        // Now handle the event based on the specific action
        if (data.type === 'fields_cleared' || payload.action === 'fields_cleared') {
          logger.info(`Fields cleared event received for task ${taskId}`, {
            taskId,
            formType,
            timestamp: payload.timestamp || new Date().toISOString(),
            progress: payload.progress
          });
          
          // Show toast notification if enabled
          if (showToastsRef.current) {
            toast({
              title: 'Form Fields Cleared',
              description: 'The form fields have been cleared by another user.',
              variant: 'info',
            });
          }
          
          // Invoke the callback if provided
          if (onFieldsClearedRef.current) {
            onFieldsClearedRef.current({
              type: 'fields_cleared',
              payload,
              timestamp: data.timestamp || payload.timestamp
            });
          }
        }
      } catch (err) {
        // Just log errors to avoid crashing the component
        logger.error('Error processing WebSocket fields event:', err);
      }
    };
  
    logger.info(`Setting up WebSocket listener for fields events on task ${taskId} (${formType})`);
    
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
          logger.info(`Cleaned up form fields listener for task ${taskId}`);
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

export default FormFieldsListener;
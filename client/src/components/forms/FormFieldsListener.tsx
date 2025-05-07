/**
 * Form Fields Listener Component
 * 
 * This component listens for WebSocket form fields events and calls
 * the appropriate callbacks when events are received.
 * 
 * Used to handle real-time field clearing and batch operations across
 * multiple client sessions.
 */

import React, { useEffect, useContext, useRef } from 'react';
import { WebSocketContext } from '@/providers/websocket-provider';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

// Add type declaration for the fieldEventTracker global object
declare global {
  interface Window {
    fieldEventTracker?: {
      processedEventIds: Set<string>;
      activeListeners: number;
    };
  }
}

// Global tracking of processed messages and active listeners
// These static variables are shared across all instances of the component
if (typeof window !== 'undefined' && !window.fieldEventTracker) {
  window.fieldEventTracker = {
    processedEventIds: new Set<string>(),
    activeListeners: 0
  };
}

export interface FieldsEventPayload {
  taskId: number;
  formType: string;
  action: string;
  progress?: number;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface FieldsEvent {
  type: string;
  payload: FieldsEventPayload;
  timestamp?: string;
}

interface FormFieldsListenerProps {
  taskId: number;
  formType: string;
  onFieldsCleared?: (event: FieldsEvent) => void;
  showToasts?: boolean;
}

/**
 * FormFieldsListener - A component for listening to form fields-related events via WebSocket
 * 
 * This component listens for events related to form field operations (clear, bulk update, etc.)
 * and invokes the appropriate callbacks. It's similar to FormSubmissionListener but focuses
 * specifically on field operations rather than form submissions.
 */
const FormFieldsListener: React.FC<FormFieldsListenerProps> = ({
  taskId,
  formType,
  onFieldsCleared,
  showToasts = true
}) => {
  const { socket, isConnected } = useContext(WebSocketContext);
  const handleMessageRef = useRef<((event: MessageEvent) => void) | null>(null);
  const listenerInfoRef = useRef({ taskId, formType });
  const hasSetupListenerRef = useRef(false);

  useEffect(() => {
    // We need both the socket and an active connection
    if (!socket || !isConnected) {
      return;
    }

    // Skip if we've already set up a listener for this task/form
    if (hasSetupListenerRef.current && 
        listenerInfoRef.current.taskId === taskId && 
        listenerInfoRef.current.formType === formType) {
      return;
    }

    // Track active listeners for this specific task/form combination
    if (typeof window !== 'undefined' && window.fieldEventTracker) {
      window.fieldEventTracker.activeListeners++;
    }

    logger.info(`Setting up form fields listener for task ${taskId} (${formType})`);

    // Define message handler
    const handleMessage = (messageEvent: MessageEvent): void => {
      try {
        // Parse incoming message
        const message = JSON.parse(messageEvent.data);
        
        // Process only 'form_fields' type messages
        if (message.type !== 'form_fields') {
          return;
        }
        
        let payload: FieldsEventPayload;
        
        // Handle both 'payload' and 'data' formats for backwards compatibility
        if (message.payload) {
          payload = message.payload;
        } else if (message.data) {
          payload = message.data;
        } else {
          logger.warn('Received form_fields message with no payload or data');
          return;
        }

        // Ensure the message is for this task and form type
        if (payload.taskId !== taskId || payload.formType !== formType) {
          return;
        }

        // Create a unique message ID to prevent duplicate processing
        const messageId = `field_${payload.action}_${payload.taskId}_${payload.timestamp || Date.now()}`;
        
        // Skip if we've already processed this message (global deduplication)
        if (typeof window !== 'undefined' && window.fieldEventTracker?.processedEventIds.has(messageId)) {
          logger.debug(`Skipping already processed message: ${messageId}`);
          return;
        }
        
        // Mark this message as processed
        if (typeof window !== 'undefined' && window.fieldEventTracker) {
          window.fieldEventTracker.processedEventIds.add(messageId);
          
          // Prevent the set from growing too large
          if (window.fieldEventTracker.processedEventIds.size > 100) {
            const values = Array.from(window.fieldEventTracker.processedEventIds);
            window.fieldEventTracker.processedEventIds = new Set(values.slice(-50));
          }
        }

        // Create a standardized event object
        const fieldsEvent: FieldsEvent = {
          type: payload.action,
          payload,
          timestamp: payload.timestamp || new Date().toISOString()
        };

        // Handle different field operations based on the action
        switch (payload.action) {
          case 'fields_cleared':
            logger.info(`[DIAGNOSTIC] Fields cleared WebSocket event received for task ${taskId} (${formType})`, {
              timestamp: new Date().toISOString(),
              taskId,
              formType,
              payloadProgress: payload.progress,
              metadata: payload.metadata,
              eventTimestamp: payload.timestamp,
              receivedAt: new Date().toISOString(),
              hasCallback: !!onFieldsCleared
            });
            
            // Show a toast notification if enabled
            if (showToasts) {
              toast({
                title: 'Form Fields Cleared',
                description: 'All form fields have been cleared.',
                variant: 'info'
              });
            }
            
            // Call the onFieldsCleared callback if provided
            if (onFieldsCleared) {
              logger.info(`[DIAGNOSTIC] Calling onFieldsCleared callback for task ${taskId}`, {
                hasPayload: !!fieldsEvent.payload,
                payloadKeys: Object.keys(fieldsEvent.payload || {})
              });
              onFieldsCleared(fieldsEvent);
            } else {
              logger.warn(`[DIAGNOSTIC] No onFieldsCleared callback provided for task ${taskId}`);
            }
            break;
            
          case 'bulk_update':
            logger.info(`Bulk update for task ${taskId} (${formType})`);
            
            // No toast needed for bulk updates as they are typically handled by the
            // form directly through state updates
            
            // You can add a callback for bulk updates if needed in the future
            break;
            
          default:
            logger.debug(`Unhandled form_fields action: ${payload.action}`);
        }
      } catch (error) {
        logger.error('Error processing form_fields message:', error);
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
          logger.info(`Cleaned up form fields listener for task ${taskId}`);
          
          // Update active listener count
          if (typeof window !== 'undefined' && window.fieldEventTracker) {
            window.fieldEventTracker.activeListeners = Math.max(0, window.fieldEventTracker.activeListeners - 1);
          }
        } catch (e) {
          // Ignore errors removing listeners from potentially closed sockets
        } finally {
          hasSetupListenerRef.current = false;
          handleMessageRef.current = null;
        }
      }
    };
  }, [socket, isConnected, taskId, formType, onFieldsCleared, showToasts]);

  return null; // This component doesn't render anything
};

export default FormFieldsListener;
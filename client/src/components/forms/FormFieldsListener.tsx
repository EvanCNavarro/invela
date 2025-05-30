/**
 * Form Fields Listener Component
 * 
 * This component listens for WebSocket form fields events and calls
 * the appropriate callbacks when events are received.
 * 
 * Used to handle real-time field clearing and batch operations across
 * multiple client sessions.
 */

import React, { useEffect, useRef } from 'react';
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';

// Add type declaration for the fieldEventTracker global object
declare global {
  interface Window {
    fieldEventTracker?: {
      processedEventIds: Set<string>;
      activeListeners: number;
    };
    _lastClearOperation?: {
      taskId: number;
      formType: string;
      timestamp: number;
      blockExpiration: number;
      operationId: string;
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
  // Enhanced properties for improved client-side handling
  clearSections?: boolean;   // Flag to indicate all section statuses should be reset
  resetUI?: boolean;         // Flag to indicate a full UI reset is needed
  clearedAt?: string;        // Timestamp when fields were cleared
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
  const { isConnected, subscribe, unsubscribe } = useUnifiedWebSocket();
  const queryClient = useQueryClient();
  const handleMessageRef = useRef<(() => void) | null>(null);
  const listenerInfoRef = useRef({ taskId, formType });
  const hasSetupListenerRef = useRef(false);

  useEffect(() => {
    // We need an active connection for unified WebSocket
    if (!isConnected) {
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

    // Define message handler for unified WebSocket
    const handleMessage = (message: any): void => {
      try {
        
        // Process both 'form_fields' and 'clear_fields' type messages
        if (message.type !== 'form_fields' && message.type !== 'clear_fields') {
          return;
        }
        
        // Special handling for clear_fields events
        if (message.type === 'clear_fields') {
          // Import dynamically to avoid circular dependencies
          import('./enhancedClearFields').then(({ handleWebSocketClearFields }) => {
            // Use our enhanced handler
            handleWebSocketClearFields(message, queryClient);
            
            // Also call the callback if provided
            if (onFieldsCleared) {
              const fieldsEvent: FieldsEvent = {
                type: 'fields_cleared',
                payload: {
                  taskId,
                  formType,
                  action: 'fields_cleared',
                  metadata: message.payload?.metadata || {},
                  clearSections: true,
                  resetUI: true,
                  clearedAt: message.payload?.timestamp || new Date().toISOString()
                },
                timestamp: message.timestamp || new Date().toISOString()
              };
              
              setTimeout(() => {
                onFieldsCleared(fieldsEvent);
              }, 100);
            }
          }).catch(err => {
            logger.error(`Error handling clear_fields event:`, err);
          });
          
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
              // Enhanced logging for the new flags
              clearSections: !!payload.clearSections,
              resetUI: !!payload.resetUI, 
              clearedAt: payload.clearedAt || 'not provided',
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
            // CRITICAL FIX: Before calling onFieldsCleared, ensure we set window._lastClearOperation
            // to prevent this clear operation from being immediately followed by a server refresh
            try {
              const now = Date.now();
              const blockExpiration = now + 60000; // 60 seconds
              
              // Update window._lastClearOperation with the information from the websocket event
              window._lastClearOperation = {
                taskId,
                timestamp: now,
                formType,
                blockExpiration,
                // Use event operation ID if available, otherwise generate one
                operationId: (payload.metadata?.operationId || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
              };
              
              // Store backup in localStorage
              try {
                localStorage.setItem('lastClearOperation', JSON.stringify({
                  taskId,
                  timestamp: now,
                  formType,
                  blockExpiration,
                  // Use event operation ID if available, otherwise generate one
                  operationId: (payload.metadata?.operationId || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
                }));
              } catch (localStorageError) {
                // Non-critical error, just log it
                logger.warn(`[FormFieldsListener] Failed to store backup clear operation in localStorage`);
              }
              
              logger.info(`[DIAGNOSTIC] Set window._lastClearOperation to prevent race conditions`, {
                taskId,
                formType,
                timestamp: new Date().toISOString(),
                blockExpiresAt: new Date(blockExpiration).toISOString()
              });
            } catch (winError) {
              logger.warn(`[DIAGNOSTIC] Error setting window._lastClearOperation:`, {
                error: winError instanceof Error ? winError.message : String(winError)
              });
            }
            
            // Now call the callback with the enhanced event
            if (onFieldsCleared) {
              logger.info(`[DIAGNOSTIC] Calling onFieldsCleared callback for task ${taskId}`, {
                hasPayload: !!fieldsEvent.payload,
                payloadKeys: Object.keys(fieldsEvent.payload || {}),
                // Add enhanced details to the log
                clearSections: !!payload.clearSections,
                resetUI: !!payload.resetUI, 
                hasMetadata: !!payload.metadata,
                timestamp: new Date().toISOString()
              });
              
              // Force a slight delay before calling the callback to allow state updates to settle
              setTimeout(() => {
                onFieldsCleared(fieldsEvent);
              }, 50);
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
    listenerInfoRef.current = { taskId, formType };
    hasSetupListenerRef.current = true;
    
    // Subscribe to both message types using unified WebSocket
    const unsubscribeFormFields = subscribe('form_fields', handleMessage);
    const unsubscribeClearFields = subscribe('clear_fields', handleMessage);
    
    // Store unsubscribe function for cleanup
    handleMessageRef.current = () => {
      unsubscribeFormFields();
      unsubscribeClearFields();
    };

    // Cleanup function - only execute on unmount or when task/form changes
    return () => {
      if (handleMessageRef.current) {
        try {
          handleMessageRef.current();
          logger.info(`Cleaned up form fields listener for task ${taskId}`);
          
          // Update active listener count
          if (typeof window !== 'undefined' && window.fieldEventTracker) {
            window.fieldEventTracker.activeListeners = Math.max(0, window.fieldEventTracker.activeListeners - 1);
          }
        } catch (e) {
          // Ignore errors during cleanup
        } finally {
          hasSetupListenerRef.current = false;
          handleMessageRef.current = null;
        }
      }
    };
  }, [isConnected, taskId, formType, onFieldsCleared, showToasts, subscribe]);

  return null; // This component doesn't render anything
};

export default FormFieldsListener;
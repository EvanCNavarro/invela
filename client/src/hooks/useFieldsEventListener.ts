/**
 * useFieldsEventListener hook
 * 
 * This hook provides a way to listen for form fields events via WebSocket,
 * such as clear_fields, field_updated, or batch_update operations.
 * 
 * It abstracts the WebSocket event subscription and ensures proper cleanup.
 */

import { useEffect, useRef, useState } from 'react';
import { useUnifiedWebSocket } from './use-unified-websocket';
import { useQueryClient } from '@tanstack/react-query';
import { handleWebSocketClearFields } from '../components/forms/enhancedClearFields';
import { toast } from '../hooks/use-toast';

export interface FieldsEventPayload {
  taskId: number;
  formType: string;
  action?: string;
  progress?: number;
  metadata?: Record<string, any>;
  timestamp?: string;
  clearSections?: boolean;
  resetUI?: boolean;
  clearedAt?: string;
}

export interface FieldsEvent {
  type: string;
  payload: FieldsEventPayload;
  timestamp?: string;
}

interface UseFieldsEventListenerProps {
  taskId: number;
  formType: string;
  onFieldsCleared?: (event: FieldsEvent) => void;
  onFieldUpdated?: (event: FieldsEvent) => void;
  onBatchUpdate?: (event: FieldsEvent) => void;
  showToasts?: boolean;
}

/**
 * Hook to listen for form field-related WebSocket events
 * 
 * This hook listens for events related to form fields and executes 
 * the appropriate callback when a relevant event is received.
 */
export function useFieldsEventListener({
  taskId,
  formType,
  onFieldsCleared,
  onFieldUpdated,
  onBatchUpdate,
  showToasts = true,
}: UseFieldsEventListenerProps) {
  const { subscribe, isConnected } = useUnifiedWebSocket();
  const queryClient = useQueryClient();
  const [lastEvent, setLastEvent] = useState<FieldsEvent | null>(null);
  
  // Ref to keep track of processed events to avoid duplicates
  const processedEvents = useRef<Set<string>>(new Set());
  
  // Set up event tracker on window to manage multiple listeners
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize the event tracker if it doesn't exist
      if (!window.fieldEventTracker) {
        window.fieldEventTracker = {
          processedEventIds: new Set<string>(),
          activeListeners: 0
        };
      }
      
      // Increment active listeners count
      window.fieldEventTracker.activeListeners++;
      
      // Cleanup on unmount
      return () => {
        if (window.fieldEventTracker) {
          window.fieldEventTracker.activeListeners--;
          
          // Clean up the tracker if there are no active listeners
          if (window.fieldEventTracker.activeListeners <= 0) {
            delete window.fieldEventTracker;
          }
        }
      };
    }
  }, []);
  
  // Handle WebSocket messages
  useEffect(() => {
    if (!isConnected || !taskId || !formType) {
      return;
    }
    
    const handleMessage = (data: any) => {
      try {
        
        // Check if this is a fields event
        if (
          data && 
          data.payload && 
          data.payload.taskId === taskId &&
          data.payload.formType === formType
        ) {
          // Create an event ID to track processed events
          const eventId = `${data.type}_${data.payload.taskId}_${data.payload.formType}_${data.payload.timestamp || Date.now()}`;
          
          // Skip if this event has already been processed
          if (window.fieldEventTracker?.processedEventIds.has(eventId)) {
            console.log(`[FieldsEventListener] Skipping already processed event: ${eventId}`);
            return;
          }
          
          // Mark this event as processed
          if (window.fieldEventTracker) {
            window.fieldEventTracker.processedEventIds.add(eventId);
            
            // Limit the size of the processed events set to prevent memory leaks
            if (window.fieldEventTracker.processedEventIds.size > 100) {
              const iterator = window.fieldEventTracker.processedEventIds.values();
              const firstValue = iterator.next().value;
              if (firstValue) {
                window.fieldEventTracker.processedEventIds.delete(firstValue);
              }
            }
          }
          
          // Format the event data
          const fieldsEvent: FieldsEvent = {
            type: data.type,
            payload: data.payload,
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          // Update the last event state
          setLastEvent(fieldsEvent);
          
          // Handle different event types
          switch (data.type) {
            case 'clear_fields':
              console.log(`[FieldsEventListener] Received clear_fields event for task ${taskId}`, data);
              
              if (showToasts) {
                toast({
                  title: 'Form Cleared',
                  description: 'The form fields have been cleared.',
                  variant: 'default',
                });
              }
              
              // Handle the clear fields operation with the React Query client
              handleWebSocketClearFields(fieldsEvent, queryClient);
              
              // Call the onFieldsCleared callback if provided
              if (onFieldsCleared) {
                onFieldsCleared(fieldsEvent);
              }
              break;
              
            case 'field_updated':
              console.log(`[FieldsEventListener] Received field_updated event for task ${taskId}`, data);
              
              if (showToasts) {
                toast({
                  title: 'Field Updated',
                  description: 'A field was updated by another user.',
                  variant: 'default',
                });
              }
              
              // Call the onFieldUpdated callback if provided
              if (onFieldUpdated) {
                onFieldUpdated(fieldsEvent);
              }
              break;
              
            case 'batch_update':
              console.log(`[FieldsEventListener] Received batch_update event for task ${taskId}`, data);
              
              if (showToasts) {
                toast({
                  title: 'Form Updated',
                  description: 'Multiple fields were updated.',
                  variant: 'default',
                });
              }
              
              // Call the onBatchUpdate callback if provided
              if (onBatchUpdate) {
                onBatchUpdate(fieldsEvent);
              }
              break;
              
            default:
              // Ignore other event types
              break;
          }
        }
      } catch (error) {
        console.error('[FieldsEventListener] Error processing WebSocket message:', error);
      }
    };
    
    // Subscribe to unified WebSocket events
    const unsubscribeFormFields = subscribe('form_fields', handleMessage);
    const unsubscribeClearFields = subscribe('clear_fields', handleMessage);
    
    // Remove the event listeners when the component unmounts
    return () => {
      unsubscribeFormFields();
      unsubscribeClearFields();
    };
  }, [subscribe, taskId, formType, onFieldsCleared, onFieldUpdated, onBatchUpdate, queryClient, showToasts]);
  
  return {
    lastEvent,
    isConnected
  };
}

// Add window augmentation for TypeScript
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
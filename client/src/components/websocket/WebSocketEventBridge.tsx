/**
 * WebSocketEventBridge Component
 * 
 * This component bridges WebSocket messages to DOM custom events
 * so components can listen for specific event types without
 * maintaining separate WebSocket connections.
 * 
 * This component should be mounted once at the application root.
 */

import { useEffect, useRef } from 'react';
import type { WebSocketMessage } from '@/lib/types';

// Import the websocket singleton service
import { wsService } from '@/lib/websocket';

interface WebSocketEventBridgeProps {
  // Optional event types to bridge (if empty, all events are bridged)
  eventTypes?: string[];
}

export function WebSocketEventBridge({ eventTypes = [] }: WebSocketEventBridgeProps) {
  // Use a ref to track if we're already initialized to prevent duplicate setup
  const isInitializedRef = useRef(false);
  const unsubscribeFunctionRef = useRef<(() => void) | null>(null);
  const eventsHashRef = useRef<string>('');

  // Calculate a hash of the eventTypes to detect actual changes
  const eventsHash = eventTypes.sort().join(',');

  useEffect(() => {
    // Only initialize if we're not already initialized or if eventTypes changed
    if (!isInitializedRef.current || eventsHash !== eventsHashRef.current) {
      // Cleanup previous subscription if it exists
      if (unsubscribeFunctionRef.current) {
        console.log('[WebSocketEventBridge] Cleaning up previous subscription due to eventTypes change');
        unsubscribeFunctionRef.current();
        unsubscribeFunctionRef.current = null;
      }

      console.log('[WebSocketEventBridge] Initializing event bridge');
      eventsHashRef.current = eventsHash;

      // Create a message handler that will bridge WS messages to DOM events
      const handleMessage = (message: WebSocketMessage) => {
        // Extract message type and payload
        const { type, payload, data } = message;
        
        // Use payload if available, otherwise use data (for backwards compatibility)
        const eventData = payload !== undefined ? payload : data;

        // Only log important message types to reduce console noise
        if (type === 'task_update' || type === 'company_tabs_update' || type === 'form_submission') {
          console.log(`[WebSocketEventBridge] Received message type: ${type}`, { 
            type, 
            timestamp: new Date().toISOString()
          });
        }
        
        // Only bridge specific event types if provided
        if (eventTypes.length > 0 && !eventTypes.includes(type)) {
          return;
        }

        try {
          // Create a generic ws_message event that contains the full message
          const genericEvent = new CustomEvent('ws_message', {
            detail: message,
            bubbles: true
          });
          window.dispatchEvent(genericEvent);
          
          // Also create a specific event for this message type
          const specificEvent = new CustomEvent(type, {
            detail: eventData,
            bubbles: true
          });
          window.dispatchEvent(specificEvent);
          
          // Only log important message types to reduce console noise
          if (type === 'task_update' || type === 'company_tabs_update' || type === 'form_submission') {
            console.log(`[WebSocketEventBridge] Dispatched events for ${type}`);
          }
        } catch (error) {
          console.error(`[WebSocketEventBridge] Error dispatching event:`, error);
        }
      };

      // Set up subscription async
      const setupSubscription = async () => {
        try {
          // Use async subscribe method and await the result
          const unsubscribe = await wsService.subscribe('*', handleMessage);
          unsubscribeFunctionRef.current = unsubscribe;
          isInitializedRef.current = true;
          console.log('[WebSocketEventBridge] Successfully subscribed to WebSocket events');
        } catch (error) {
          console.error('[WebSocketEventBridge] Error subscribing to WebSocket:', error);
          // Reset initialization flag to allow retry on next render
          isInitializedRef.current = false;
        }
      };
      
      // Call the setup function
      setupSubscription();
    }
    
    // Return cleanup function - only actually clean up when component unmounts
    return () => {
      // We're only cleaning up on actual unmount, not on re-renders with same props
      console.log('[WebSocketEventBridge] Cleaning up event bridge');
      if (unsubscribeFunctionRef.current) {
        unsubscribeFunctionRef.current(); 
        unsubscribeFunctionRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [eventsHash]); // Only depend on the eventsHash, not the array reference

  // This is a utility component with no UI
  return null;
}

export default WebSocketEventBridge;
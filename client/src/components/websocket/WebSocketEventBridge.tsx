/**
 * WebSocketEventBridge Component
 * 
 * This component bridges WebSocket messages to DOM custom events
 * so components can listen for specific event types without
 * maintaining separate WebSocket connections.
 * 
 * This component should be mounted once at the application root.
 */

import { useEffect } from 'react';
import type { WebSocketMessage } from '@/lib/types';

// Import the websocket singleton service
import { wsService } from '@/lib/websocket';

interface WebSocketEventBridgeProps {
  // Optional event types to bridge (if empty, all events are bridged)
  eventTypes?: string[];
}

export function WebSocketEventBridge({ eventTypes = [] }: WebSocketEventBridgeProps) {
  useEffect(() => {
    console.log('[WebSocketEventBridge] Initializing event bridge');

    // Create a message handler that will bridge WS messages to DOM events
    const handleMessage = (message: WebSocketMessage) => {
      // Extract message type and payload
      const { type, payload, data } = message;
      
      // Use payload if available, otherwise use data (for backwards compatibility)
      const eventData = payload !== undefined ? payload : data;

      // Log the received message for debugging
      console.log(`[WebSocketEventBridge] Received message type: ${type}`, { 
        type, 
        eventData,
        timestamp: new Date().toISOString()
      });
      
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
        
        console.log(`[WebSocketEventBridge] Dispatched events for ${type}`);
      } catch (error) {
        console.error(`[WebSocketEventBridge] Error dispatching event:`, error);
      }
    };

    // Subscribe to all WebSocket messages
    let unsubscribeFunction: (() => void) | null = null;
    
    // Set up subscription async
    const setupSubscription = async () => {
      try {
        // Use async subscribe method and await the result
        unsubscribeFunction = await wsService.subscribe('*', handleMessage);
        console.log('[WebSocketEventBridge] Successfully subscribed to WebSocket events');
      } catch (error) {
        console.error('[WebSocketEventBridge] Error subscribing to WebSocket:', error);
      }
    };
    
    // Call the setup function
    setupSubscription();
    
    // Return cleanup function
    return () => {
      console.log('[WebSocketEventBridge] Cleaning up event bridge');
      if (unsubscribeFunction) {
        unsubscribeFunction(); 
      }
    };
  }, [eventTypes]);

  // This is a utility component with no UI
  return null;
}

export default WebSocketEventBridge;
/**
 * WebSocket Hook
 * 
 * This hook provides access to the WebSocket context for components
 * to subscribe to WebSocket events and send messages.
 */

import { useContext } from 'react';
import { WebSocketContext, WebSocketMessage } from '../providers/websocket-provider';

/**
 * WebSocket hook that provides access to WebSocket functionality
 * 
 * @returns WebSocket connection state, last message, and send function
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
}

/**
 * Send a WebSocket message
 * 
 * @param type Message type
 * @param payload Optional message payload
 */
export function useSendWebSocketMessage() {
  const { sendMessage } = useWebSocket();
  
  return (type: string, payload?: any) => {
    const message: WebSocketMessage = { type };
    
    if (payload !== undefined) {
      message.payload = payload;
    }
    
    sendMessage(message);
  };
}

export default useWebSocket;
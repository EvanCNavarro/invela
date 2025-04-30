/**
 * WebSocket Hook
 * 
 * This hook provides access to the WebSocket context functionality
 * and WebSocket server messages.
 */

import { useWebSocket as useWebSocketContext } from '@/contexts/WebSocketContext';
import { useEffect, useState } from 'react';

export interface WebSocketMessage {
  type: string;
  payload?: any;
}

export interface WebSocketHookReturn {
  socket: WebSocket | null;
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (type: string, payload?: any) => void;
  connectionState: 'connecting' | 'connected' | 'disconnected';
}

/**
 * Hook to access the WebSocket connection and message data
 * 
 * @returns WebSocket connection and data access tools
 */
export function useWebSocket(): WebSocketHookReturn {
  const {
    connected,
    lastMessage,
    sendMessage
  } = useWebSocketContext();
  
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>(
    connected ? 'connected' : 'connecting'
  );
  
  // Update connection state based on connected status
  useEffect(() => {
    setConnectionState(connected ? 'connected' : 'disconnected');
  }, [connected]);
  
  return {
    socket: null, // The actual socket is encapsulated in the context
    connected,
    lastMessage,
    sendMessage,
    connectionState
  };
}

export default useWebSocket;
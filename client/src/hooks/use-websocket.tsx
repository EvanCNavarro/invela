import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketClient } from '@/services/websocket';

export type WebSocketMessageType = string;
export type WebSocketMessageListener = (data: any) => void;
export type WebSocketConnectionListener = (connected: boolean) => void;

export interface UseWebSocketReturn {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => boolean;
  addMessageListener: (type: WebSocketMessageType, listener: WebSocketMessageListener) => void;
  removeMessageListener: (type: WebSocketMessageType, listener: WebSocketMessageListener) => void;
  addConnectionListener: (listener: WebSocketConnectionListener) => void;
  removeConnectionListener: (listener: WebSocketConnectionListener) => void;
}

/**
 * Custom hook for WebSocket communication
 * @param autoConnect Whether to automatically connect to the WebSocket server on mount
 * @returns An object with WebSocket methods and connection state
 */
export function useWebSocket(autoConnect: boolean = true): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const webSocketClient = getWebSocketClient();
  const connectionAttemptsRef = useRef(0);
  
  // Update connection state when the WebSocket connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    
    if (connected) {
      // Reset connection attempts on successful connection
      connectionAttemptsRef.current = 0;
      console.log('[useWebSocket] Connection established');
    } else {
      connectionAttemptsRef.current++;
      console.log(`[useWebSocket] Connection lost or failed (attempt ${connectionAttemptsRef.current})`);
    }
  }, []);
  
  // Connect to the WebSocket server
  const connect = useCallback(() => {
    try {
      webSocketClient.connect();
    } catch (err) {
      console.error('[useWebSocket] Error initiating connection:', err);
      // Don't block the app - continue with disconnected state
      setIsConnected(false);
    }
  }, [webSocketClient]);
  
  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    webSocketClient.disconnect();
  }, [webSocketClient]);
  
  // Send a message to the WebSocket server
  const send = useCallback((message: any): boolean => {
    if (!isConnected) {
      console.warn('[useWebSocket] Cannot send message - disconnected');
      return false;
    }
    return webSocketClient.send(message);
  }, [webSocketClient, isConnected]);
  
  // Add a listener for a specific message type
  const addMessageListener = useCallback(
    (type: WebSocketMessageType, listener: WebSocketMessageListener) => {
      webSocketClient.addMessageListener(type, listener);
    },
    [webSocketClient]
  );
  
  // Remove a listener for a specific message type
  const removeMessageListener = useCallback(
    (type: WebSocketMessageType, listener: WebSocketMessageListener) => {
      webSocketClient.removeMessageListener(type, listener);
    },
    [webSocketClient]
  );
  
  // Add connection listener
  const addConnectionListener = useCallback(
    (listener: WebSocketConnectionListener) => {
      webSocketClient.addConnectionListener(listener);
    },
    [webSocketClient]
  );
  
  // Remove connection listener
  const removeConnectionListener = useCallback(
    (listener: WebSocketConnectionListener) => {
      webSocketClient.removeConnectionListener(listener);
    },
    [webSocketClient]
  );
  
  // Set up the connection and clean up on unmount
  useEffect(() => {
    // Add connection state change listener
    webSocketClient.addConnectionListener(handleConnectionChange);
    
    // Connect if autoConnect is true
    if (autoConnect) {
      connect();
    }
    
    // Clean up on unmount
    return () => {
      webSocketClient.removeConnectionListener(handleConnectionChange);
    };
  }, [autoConnect, connect, handleConnectionChange, webSocketClient]);
  
  return {
    isConnected,
    connect,
    disconnect,
    send,
    addMessageListener,
    removeMessageListener,
    addConnectionListener,
    removeConnectionListener
  };
}
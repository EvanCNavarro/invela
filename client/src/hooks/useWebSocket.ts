/**
 * WebSocket Hook
 * 
 * This hook provides a way to use the WebSocket service in React components.
 * It handles connection, reconnection, and event listening for components.
 */

import { useEffect, useState, useCallback } from 'react';
import websocketService from '@/services/websocket-service';

interface WebSocketHookOptions {
  autoConnect?: boolean;
  pingInterval?: number;
}

interface WebSocketHookResult {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  send: (type: string, data?: any) => boolean;
  lastMessage: any;
  connectionState: number;
}

export function useWebSocket(
  events: Record<string, (data: any) => void> = {},
  options: WebSocketHookOptions = {}
): WebSocketHookResult {
  const { autoConnect = true, pingInterval = 30000 } = options;
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionState, setConnectionState] = useState(websocketService.getState());

  // Handle connection status changes
  const handleConnectionChange = useCallback(() => {
    setIsConnected(websocketService.isConnected());
    setConnectionState(websocketService.getState());
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((message: any) => {
    setLastMessage(message);
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    websocketService.connect();
  }, []);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  // Send a message
  const send = useCallback((type: string, data?: any) => {
    return websocketService.send(type, data);
  }, []);

  // Set up event handlers and connection
  useEffect(() => {
    // Register all event handlers from props
    for (const [event, handler] of Object.entries(events)) {
      websocketService.on(event, handler);
    }

    // Register general event handlers
    websocketService.on('open', handleConnectionChange);
    websocketService.on('close', handleConnectionChange);
    websocketService.on('message', handleMessage);

    // Connect if autoConnect is true
    if (autoConnect && !websocketService.isConnected()) {
      websocketService.connect();
    }

    // Set up ping interval
    let pingTimer: NodeJS.Timeout | null = null;
    if (pingInterval > 0) {
      pingTimer = setInterval(() => {
        if (websocketService.isConnected()) {
          websocketService.ping();
        }
      }, pingInterval);
    }

    // Cleanup event handlers and ping timer
    return () => {
      for (const [event, handler] of Object.entries(events)) {
        websocketService.off(event, handler);
      }

      websocketService.off('open', handleConnectionChange);
      websocketService.off('close', handleConnectionChange);
      websocketService.off('message', handleMessage);

      if (pingTimer) {
        clearInterval(pingTimer);
      }
    };
  }, [autoConnect, events, handleConnectionChange, handleMessage, pingInterval]);

  return {
    isConnected,
    connect,
    disconnect,
    send,
    lastMessage,
    connectionState
  };
}

export default useWebSocket;
/**
 * WebSocket Provider
 * 
 * This component provides WebSocket connectivity to the entire application
 * using React Context. It handles connection setup, reconnection, and
 * exposes methods for sending messages and subscribing to events.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { WebSocketEventMap, PayloadFromEventType } from '@/lib/websocket-types';

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionId: string | null;
  send: (message: any) => void;
  subscribe: <T extends keyof WebSocketEventMap>(
    eventType: T,
    callback: (payload: PayloadFromEventType<T>) => void
  ) => () => void;
  unsubscribe: <T extends keyof WebSocketEventMap>(
    eventType: T,
    callback: (payload: PayloadFromEventType<T>) => void
  ) => void;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  debug?: boolean;
}

/**
 * WebSocket Provider Component
 * 
 * This component sets up the WebSocket connection and provides it to all child components.
 */
export function WebSocketProvider({ children, debug = false }: WebSocketProviderProps) {
  const [wsUrl, setWsUrl] = useState<string>('');
  
  // Determine the correct WebSocket URL based on the current location
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Ensure we're using the correct WebSocket URL
    console.log(`[WebSocket] Setting up connection to ${protocol}//${host}/ws`);
    setWsUrl(`${protocol}//${host}/ws`);
  }, []);
  
  // Only create the WebSocket connection after we have the URL
  const {
    isConnected,
    isConnecting,
    connectionId,
    send,
    subscribe,
    unsubscribe
  } = useWebSocket(wsUrl, {
    debug,
    autoConnect: wsUrl !== '', // Only auto-connect once we have a URL
    reconnectInterval: 3000,
    maxReconnectAttempts: 5
  });
  
  const value = {
    isConnected,
    isConnecting,
    connectionId,
    send,
    subscribe,
    unsubscribe
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to use the WebSocket service within components
 * 
 * @returns WebSocket methods and state
 */
export function useWebSocketService() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketService must be used within a WebSocketProvider');
  }
  
  return context;
}

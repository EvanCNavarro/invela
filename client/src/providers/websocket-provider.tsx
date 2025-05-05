/**
 * WebSocket Provider
 * 
 * This component provides WebSocket connectivity to the entire application
 * using React Context. It handles connection setup, reconnection, and
 * exposes methods for sending messages and subscribing to events.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
// Direct import without using @ alias to prevent circular dependency issues
import { useWebSocket } from '../hooks/use-websocket.tsx';
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
    // In Replit, we need to use the same host as the current page
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // This includes hostname and port
    const wsPath = '/ws';
    
    // Build the WebSocket URL - use host which already includes port if present
    const websocketUrl = `${protocol}//${host}${wsPath}`;
    
    // Log detailed connection information
    console.log(`[WebSocket] Attempting connection with URL: ${websocketUrl}`, {
      protocol,
      host,
      path: wsPath,
      fullUrl: websocketUrl,
      locationInfo: {
        href: window.location.href,
        host: window.location.host,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol
      }
    });
    
    setWsUrl(websocketUrl);
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
    reconnectInterval: 2000, // Faster reconnection attempts
    maxReconnectAttempts: 10  // More reconnection attempts before giving up
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

/**
 * Legacy alias for useWebSocketService - for backward compatibility
 * 
 * @returns WebSocket methods and state
 */
export function useWebSocketContext() {
  return useWebSocketService();
}

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
  // Flag to track if we've tried and failed to connect multiple times
  hasAttemptedConnecting: boolean;
  // Connection control methods
  connect: () => void;
  disconnect: () => void;
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
  // Add a state to track failed connection attempts even after recovery tries
  const [hasAttemptedConnecting, setHasAttemptedConnecting] = useState(false);
  
  // Determine the correct WebSocket URL based on the current location
  useEffect(() => {
    try {
      // In Replit, we need to use the same host as the current page
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // This includes hostname and port
      const wsPath = '/ws';
      
      // Build the WebSocket URL - use host which already includes port if present
      const websocketUrl = `${protocol}//${host}${wsPath}`;
      
      // Log detailed connection information for diagnostics
      console.log(`[WebSocket] URL construction:`, {
        protocol,
        host,
        path: wsPath,
        fullUrl: websocketUrl,
        locationInfo: {
          href: window.location.href,
          host: window.location.host,
          hostname: window.location.hostname,
          port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
          protocol: window.location.protocol
        },
        timestamp: new Date().toISOString()
      });
      
      // Safety check to ensure the URL is valid before we attempt to connect
      if (!websocketUrl.startsWith('ws:') && !websocketUrl.startsWith('wss:')) {
        console.error(`[WebSocket] Invalid WebSocket URL: ${websocketUrl}`);
        // Don't set the URL if it's invalid
        return;
      }
      
      console.log(`[WebSocket] Setting connection URL: ${websocketUrl}`);
      setWsUrl(websocketUrl);
    } catch (error) {
      console.error('[WebSocket] Error constructing WebSocket URL:', error);
      // We don't set the URL in case of error, preventing connection attempts
    }
  }, []);
  
  // Only create the WebSocket connection after we have the URL
  const {
    isConnected,
    isConnecting,
    connectionId,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe
  } = useWebSocket(wsUrl, {
    debug,
    autoConnect: wsUrl !== '', // Only auto-connect once we have a URL
    reconnectInterval: 2000, // Faster reconnection attempts
    maxReconnectAttempts: 10,  // More reconnection attempts before giving up
    onMaxReconnectAttemptsReached: () => {
      // Track that we've attempted connecting extensively
      setHasAttemptedConnecting(true);
      console.log('[WebSocket] Maximum reconnection attempts reached, operating in fallback mode');
    }
  });
  
  const value = {
    isConnected,
    isConnecting,
    connectionId,
    // Include the flag to tell components we've tried but failed to connect
    hasAttemptedConnecting,
    // Add connection control methods
    connect,
    disconnect,
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

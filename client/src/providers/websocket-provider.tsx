/**
 * WebSocket Provider
 * 
 * This component provides WebSocket functionality to the entire app through
 * React Context, allowing components to subscribe to WebSocket events.
 */

import React, { createContext, useEffect, useState, useRef, useCallback } from 'react';

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload?: any;
}

// WebSocket connection states
type ConnectionState = 'connecting' | 'connected' | 'disconnected';

// WebSocket context interface
interface WebSocketContextType {
  connectionState: ConnectionState;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: WebSocketMessage) => void;
}

// Create the WebSocket context
export const WebSocketContext = createContext<WebSocketContextType>({
  connectionState: 'disconnected',
  lastMessage: null,
  sendMessage: () => {}
});

// WebSocket provider props
interface WebSocketProviderProps {
  children: React.ReactNode;
}

/**
 * WebSocket Provider Component
 * 
 * Wraps the application with WebSocket functionality and exposes
 * a React context for components to use.
 */
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  // Connection state management
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  // WebSocket instance reference
  const socketRef = useRef<WebSocket | null>(null);
  
  // Reconnection management
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_BASE_DELAY = 3000; // 3 seconds base delay
  
  /**
   * Calculate reconnection delay with exponential backoff
   * 
   * @returns Delay in milliseconds
   */
  const calculateReconnectDelay = useCallback((): number => {
    // Exponential backoff with jitter
    const exponentialDelay = RECONNECT_BASE_DELAY * Math.pow(1.5, Math.min(reconnectAttempts.current, 8));
    const jitter = 0.2; // 20% jitter
    const randomFactor = 1 - jitter + (Math.random() * jitter * 2);
    
    return Math.min(exponentialDelay * randomFactor, 30000); // Cap at 30 seconds
  }, []);
  
  /**
   * Connect to the WebSocket server
   */
  const connect = useCallback(() => {
    // If we already have a connection, don't create another one
    if (socketRef.current?.readyState === WebSocket.OPEN || 
        socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }
    
    setConnectionState('connecting');
    
    // Close any existing socket
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    try {
      // Determine WebSocket URL based on current connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      
      // Create new WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Connection event handlers
      socket.onopen = () => {
        console.log('[WebSocket] Connection established');
        setConnectionState('connected');
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('[WebSocket] Received message:', message);
          
          // Store the last message in state
          setLastMessage(message);
          
          // Handle ping messages with pong responses
          if (message.type === 'ping') {
            sendMessage({ type: 'pong' });
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
      
      socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setConnectionState('disconnected');
        
        // Schedule reconnection attempt
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = calculateReconnectDelay();
          console.log(`[WebSocket] Scheduling reconnection attempt in ${delay / 1000} seconds...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.log('[WebSocket] Maximum reconnection attempts reached');
        }
      };
      
      socket.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        console.error('%c[WebSocket] Error:', 'color: #F44336', {
          error,
          connectionId: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          timestamp: new Date().toISOString()
        });
      };
    } catch (error) {
      console.error('[WebSocket] Error creating WebSocket connection:', error);
      setConnectionState('disconnected');
      
      // Schedule reconnection attempt
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = calculateReconnectDelay();
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    }
  }, [calculateReconnectDelay]);
  
  /**
   * Send a message to the WebSocket server
   * 
   * @param message The message to send
   */
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, socket not connected');
    }
  }, []);
  
  // Connect to WebSocket on component mount
  useEffect(() => {
    connect();
    
    // Cleanup function to close WebSocket connection and clear timeouts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);
  
  // Handle window focus/blur events to reconnect when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connectionState !== 'connected') {
        console.log('[WebSocket] Tab became visible, attempting to reconnect');
        connect();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionState, connect]);
  
  // Provide WebSocket context to children
  const contextValue: WebSocketContextType = {
    connectionState,
    lastMessage,
    sendMessage
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook for accessing the WebSocket context directly
 * 
 * @returns WebSocket context for more direct access to connection methods
 */
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  // For compatibility with existing components using the old context
  return {
    ...context,
    isConnected: context.connectionState === 'connected',
    status: context.connectionState,
    connect: () => console.log('[WebSocket] Connect requested - auto-connect is enabled'),
    disconnect: () => console.log('[WebSocket] Disconnect requested - not implemented'),
    subscribe: (type: string, callback: (data: any) => void) => {
      console.log(`[WebSocket] Subscribe requested for ${type} - not implemented`);
      return () => {};
    },
    unsubscribe: (type: string) => {
      console.log(`[WebSocket] Unsubscribe requested for ${type} - not implemented`);
    },
    send: (type: string, payload?: any) => {
      context.sendMessage({ type, payload });
    }
  };
}

export default WebSocketProvider;
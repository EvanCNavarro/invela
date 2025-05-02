/**
 * WebSocket Provider
 * 
 * This component provides WebSocket connectivity to the entire app.
 * It uses React Context to share the WebSocket connection and manages reconnection logic.
 */

import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import getLogger from '@/utils/logger';

const logger = getLogger('WebSocket');

export interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  lastMessage: any | null;
  sendMessage: (message: any) => void;
}

// Create the WebSocket context
export const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  lastMessage: null,
  sendMessage: () => {}
});

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectAttempts = useRef(0);
  const alreadyInitialized = useRef(false);
  
  // Connect to WebSocket
  const connect = () => {
    try {
      // Clear any existing connection
      if (socket) {
        try {
          socket.close(1000, 'Reconnecting');
        } catch (err) {
          // Ignore errors on close
        }
      }
      
      // Create WebSocket URL based on current protocol and host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      logger.info('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        connectAttempts.current = 0;
        logger.info('WebSocket connection established');
        
        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
          }
        }, 30000);
      };
      
      ws.onclose = (event) => {
        setIsConnected(false);
        logger.info('WebSocket connection closed:', event.code, event.reason || 'No reason provided');
        
        // Stop heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Try reconnecting if it wasn't a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          if (connectAttempts.current < 3) {
            const delay = Math.min(1000 * Math.pow(1.5, connectAttempts.current), 10000);
            connectAttempts.current++;
            
            // Clear any existing reconnect timeout
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          } else {
            logger.warn('Maximum reconnection attempts reached');
          }
        }
      };
      
      ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };
      
      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          // Don't log heartbeat messages to reduce console spam
          if (data.type !== 'ping' && data.type !== 'pong') {
            logger.info(`Received message of type: ${data.type}`);
          }
          
          // Handle special message types
          if (data.type === 'form_submission' || data.type === 'form_submitted') {
            // Log submission updates separately
            logger.info('Form submission update:', {
              type: data.type,
              taskId: data.payload?.taskId || data.taskId,
              status: data.payload?.status || 'unknown'
            });
          }
          
          // Store normalized message
          setLastMessage({
            type: data.type,
            payload: data.payload || data.data || data,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      };
      
      setSocket(ws);
    } catch (error) {
      logger.error('Error connecting to WebSocket:', error);
    }
  };
  
  // Send a message
  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    } else {
      logger.warn('Cannot send message: WebSocket not connected');
    }
  };
  
  // Connect on mount
  useEffect(() => {
    if (alreadyInitialized.current) return;
    
    alreadyInitialized.current = true;
    logger.info('WebSocket connection manager initialized');
    connect();
    
    // Clean up on unmount
    return () => {
      // Stop heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Cancel any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close socket
      if (socket) {
        try {
          socket.close(1000, 'Component unmounting');
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Reset state
      alreadyInitialized.current = false;
    };
  }, []);
  
  const contextValue: WebSocketContextType = {
    socket,
    isConnected,
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
 * Custom hook to use the WebSocket context
 * @returns WebSocketContextType
 */
export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
};

export default WebSocketProvider;
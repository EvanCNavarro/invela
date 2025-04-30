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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Connect to WebSocket
  const connectWebSocket = () => {
    try {
      // Create WebSocket URL based on current protocol and host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      logger.info('Connecting to WebSocket:', wsUrl);
      
      const newSocket = new WebSocket(wsUrl);
      
      // Set up event handlers
      newSocket.addEventListener('open', () => {
        logger.info('WebSocket connection established');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      });
      
      newSocket.addEventListener('close', (event) => {
        logger.info('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          scheduleReconnect();
        }
      });
      
      newSocket.addEventListener('error', (error) => {
        logger.error('WebSocket error:', error);
        setIsConnected(false);
      });
      
      newSocket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });
      
      setSocket(newSocket);
      
    } catch (error) {
      logger.error('Error creating WebSocket connection:', error);
      scheduleReconnect();
    }
  };
  
  // Schedule a reconnection attempt
  const scheduleReconnect = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      logger.warn('Maximum reconnection attempts reached');
      return;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 30000);
    reconnectAttempts.current += 1;
    
    logger.info(`Scheduling reconnection attempt in ${delay / 1000} seconds...`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      logger.info(`Attempting to reconnect (attempt ${reconnectAttempts.current})...`);
      connectWebSocket();
    }, delay);
  };
  
  // Send a message to the server
  const sendMessage = (message: any) => {
    if (socket && isConnected) {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    } else {
      logger.warn('Cannot send message: WebSocket not connected');
    }
  };
  
  // Connect on component mount
  useEffect(() => {
    logger.info('Smart WebSocket connection manager initialized');
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
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
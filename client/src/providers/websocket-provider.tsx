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
          logger.info(`Received WebSocket message of type: ${data.type}`);
          
          // Special handling for pong messages
          if (data.type === 'pong') {
            logger.info('Received pong from server, connection is healthy');
          }
          
          // Special handling for connection_established messages
          if (data.type === 'connection_established') {
            logger.info('WebSocket connection confirmed by server');
          }
          
          // Special handling for form_submission messages
          if (data.type === 'form_submission' || data.type === 'form_submitted' || data.type === 'submission_status') {
            logger.info('Received form submission update:', {
              type: data.type,
              taskId: data.payload?.taskId || data.taskId,
              status: data.payload?.status || 'unknown',
              formType: data.payload?.formType,
              fileId: data.payload?.fileId
            });
          }
          
          // Handle payload format variations
          setLastMessage({
            type: data.type,
            // Handle both formats: { payload: {...} } and { data: {...} }
            payload: data.payload || data.data || data,
            // Extract top-level properties that might be needed separately
            taskId: data.taskId || data.payload?.taskId || data.data?.taskId,
            timestamp: data.timestamp || data.payload?.timestamp || new Date().toISOString()
          });
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
  
  // Start ping heartbeat mechanism to keep connection alive
  const startHeartbeat = (ws: WebSocket) => {
    const heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        logger.info('Sending ping heartbeat to server');
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      } else if (ws && ws.readyState !== WebSocket.CONNECTING) {
        logger.warn('No pong received, reconnecting...');
        if (ws.readyState !== WebSocket.CLOSED) {
          try {
            ws.close();
          } catch (e) {
            // Ignore errors when closing an already closed connection
          }
        }
        scheduleReconnect();
      }
    }, 30000); // 30 second ping interval
    
    return heartbeatInterval;
  };
  
  // Connect on component mount
  useEffect(() => {
    logger.info('Smart WebSocket connection manager initialized');
    connectWebSocket();
    
    // Set up a heartbeat interval when socket is initialized
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    if (socket) {
      heartbeatInterval = startHeartbeat(socket);
    }
    
    // Clean up on unmount
    return () => {
      // Clear heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Close any open socket
      if (socket) {
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close(1000, 'Component unmounting'); // Normal closure
          }
        } catch (e) {
          logger.error('Error closing WebSocket on unmount:', e);
        }
      }
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      logger.info('FormSubmissionListener cleaned up form submission listener for task 718');
    };
  }, [socket]); // Re-initialize heartbeat when socket changes
  
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
/**
 * WebSocket Provider
 * 
 * This component provides WebSocket connectivity to the entire app.
 * It uses React Context to share the WebSocket connection and manages reconnection logic.
 */

import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import getLogger from '@/utils/standardized-logger';

// Create a logger instance for WebSocket provider with appropriate context
const logger = getLogger('WebSocket');

// Create a namespace for WebSocket logs to maintain the same format

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
  
  /**
   * Get WebSocket URL with improved reliability
   * 
   * KISS Principle: Simple function that just returns the proper URL or null
   * if we need to delay connection. This avoids invalid WebSocket URLs.
   * 
   * OODA Loop Implementation:
   * - Observe: Check for valid location and host information
   * - Orient: Determine the appropriate protocol and connection strategy
   * - Decide: Choose whether to create URL or delay connection
   * - Act: Return properly formed URL or null to trigger retry
   */
  const getWebSocketUrl = () => {
    try {
      // OODA: Observe - Verify window and location are available
      if (!window || !window.location) {
        logger.info('Window or location not available, delaying connection');
        return null;
      }
      
      // Determine protocol (wss for https, ws for http)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // OODA: Observe - Enhanced check for valid host information
      if (!window.location.host || 
          window.location.host === '' || 
          window.location.host.includes('undefined') || 
          window.location.host.includes('null')) {
        // Log as info to avoid false alarms, this is expected during startup
        logger.info('No valid host information available yet, delaying connection', 
          { host: window.location.host }, { tags: ['startup'] });
        return null; // Signal we need to delay
      }
      
      // OODA: Orient - Create URL based on current location
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Validate URL before returning with more detailed error reporting
      try {
        // This will throw if the URL is invalid
        const url = new URL(wsUrl);
        
        // Additional validation to catch problematic URLs that might parse successfully
        // but would still lead to connection errors
        if (!url.host || url.host === '' || url.host.includes('undefined')) {
          logger.warn(`Technically valid but suspicious WebSocket URL: ${wsUrl}, host: ${url.host}`);
          return null;
        }
        
        return wsUrl;
      } catch (urlError) {
        logger.warn(`Invalid WebSocket URL: ${wsUrl}`, urlError);
        return null;
      }
    } catch (error) {
      logger.warn('Error generating WebSocket URL', error);
      return null;
    }
  };
  
  // Connect to WebSocket with improved resilience
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
      
      // OODA: Orient - Get a reliable WebSocket URL
      const wsUrl = getWebSocketUrl();
      
      // OODA: Decide - If URL isn't ready, delay and retry
      if (!wsUrl) {
        // Schedule a retry after a short delay (using exponential backoff)
        const delay = Math.min(500 * Math.pow(1.2, Math.min(connectAttempts.current, 5)), 2000);
        logger.info(`Scheduling connection retry in ${delay}ms...`, null, { tags: ['reconnect'] });
        setTimeout(connect, delay);
        return;
      }
      
      logger.info('Connecting to WebSocket:', wsUrl);
      
      // OODA: Act - Create the WebSocket with the valid URL
      const ws = new WebSocket(wsUrl);
      const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set connection timeout - if it doesn't connect in 5 seconds, try again
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          logger.warn('WebSocket connection timeout, attempting to reconnect');
          try {
            ws.close();
          } catch (err) {
            // Ignore close errors
          }
          // Schedule reconnection
          const delay = Math.min(1000 * Math.pow(1.5, connectAttempts.current), 5000);
          connectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      }, 5000);
      
      ws.onopen = () => {
        // Clear the connection timeout since we successfully connected
        clearTimeout(connectionTimeout);
        
        setIsConnected(true);
        connectAttempts.current = 0;
        logger.info('WebSocket connection established');
        
        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ 
                type: 'ping', 
                timestamp: new Date().toISOString(),
                connectionId
              }));
            } catch (err) {
              logger.warn('Error sending ping, connection may be dead', err);
              if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
              }
              // Force reconnection
              connect();
            }
          }
        }, 20000); // More frequent heartbeat for better connection monitoring
      };
      
      ws.onclose = (event) => {
        // Clear the connection timeout in case we're closing before it fired
        clearTimeout(connectionTimeout);
        
        setIsConnected(false);
        logger.info('WebSocket connection closed', { code: event.code, reason: event.reason || 'No reason provided' });
        
        // Stop heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Try reconnecting if it wasn't a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          // Increase reconnection attempts to improve resilience
          if (connectAttempts.current < 10) { // Increased from 3 to 10 attempts
            const delay = Math.min(1000 * Math.pow(1.5, connectAttempts.current), 10000);
            connectAttempts.current++;
            
            // Clear any existing reconnect timeout
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            logger.info(`Scheduling reconnection attempt in ${delay/1000} seconds...`);
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          } else {
            logger.warn('Maximum reconnection attempts reached', {
              connectionId,
              timestamp: new Date().toISOString()
            });
          }
        }
      };
      
      ws.onerror = (error) => {
        // Create separate data object to avoid mixing with log options
        const errorData = {
          errorEvent: error,
          connectionId,
          timestamp: new Date().toISOString()
        };
        
        // Pass the data and valid log options separately
        logger.error('WebSocket error', errorData, { tags: ['error', 'websocket'] });
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
  
  // Connect on mount with delayed initial connection
  useEffect(() => {
    if (alreadyInitialized.current) return;
    
    alreadyInitialized.current = true;
    logger.info('WebSocket connection manager initialized');
    
    // Intentionally delay initial connection attempt to give the application time to fully initialize
    // This allows location information to be properly populated before attempting connection
    const initialDelay = 1000; // 1 second delay for initial connection
    logger.info(`Scheduling initial WebSocket connection in ${initialDelay}ms to ensure environment is ready`);
    
    const initialConnectionTimer = setTimeout(() => {
      connect();
    }, initialDelay);
    
    // Clean up on unmount
    return () => {
      // Cancel initial connection if component unmounts before it happens
      clearTimeout(initialConnectionTimer);
      
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
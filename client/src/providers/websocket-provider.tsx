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
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  connect: () => void;
  disconnect: () => void;
  connectionStats: {
    attempts: number;
    lastConnected: string | null;
    disconnectReason: string | null;
  };
  forceReconnect: () => void;
}

// Create the WebSocket context with enhanced interface 
export const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  lastMessage: null,
  sendMessage: () => {},
  status: 'disconnected',
  connect: () => {},
  disconnect: () => {},
  connectionStats: {
    attempts: 0,
    lastConnected: null,
    disconnectReason: null
  },
  forceReconnect: () => {}
});

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'>('disconnected');
  const [connectionStats, setConnectionStats] = useState<{
    attempts: number;
    lastConnected: string | null;
    disconnectReason: string | null;
  }>({
    attempts: 0,
    lastConnected: null,
    disconnectReason: null
  });
  
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
  
  // Disconnect WebSocket manually (for user-initiated disconnections)
  const disconnect = () => {
    if (socket) {
      try {
        // Set status before closing to notify UI
        setStatus('disconnected');
        setIsConnected(false);
        
        // Update connection stats with reason
        setConnectionStats(prev => ({
          ...prev,
          disconnectReason: 'User initiated disconnect'
        }));
        
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
        
        socket.close(1000, 'User disconnected');
        logger.info('User manually disconnected WebSocket');
      } catch (err) {
        logger.warn('Error during manual disconnect:', err);
      }
    }
  };
  
  // Force reconnect (for manual reconnection when needed)
  const forceReconnect = () => {
    logger.info('Manual reconnection requested');
    
    // Reset connection attempts counter to avoid long backoff times
    connectAttempts.current = 0;
    
    // Update connection stats
    setConnectionStats(prev => ({
      ...prev,
      attempts: prev.attempts + 1,
      disconnectReason: 'Manual reconnection requested'
    }));
    
    // Set status to reconnecting
    setStatus('reconnecting');
    
    // Disconnect and reconnect
    if (socket) {
      try {
        socket.close(1000, 'Manual reconnection');
      } catch (err) {
        // Non-critical error, we'll create a new connection anyway
        logger.warn('Error closing socket during manual reconnection:', err);
      }
    }
    
    // Connect after a short delay to ensure clean closure
    setTimeout(connect, 250);
  };
  
  // Connect to WebSocket with improved resilience
  const connect = () => {
    try {
      // Update status to connecting
      setStatus('connecting');
      
      // Update connection stats
      setConnectionStats(prev => ({
        ...prev,
        attempts: prev.attempts + 1
      }));
      
      // Clear any existing connection with improved state handling
      if (socket) {
        // Only attempt to close if socket is open or connecting
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          logger.info(`Closing existing WebSocket connection in readyState: ${socket.readyState}`);
          try {
            socket.close(1000, 'Reconnecting');
          } catch (err) {
            // Log but continue - this is non-critical
            logger.warn('Error closing existing socket:', err);
          }
        } else {
          // Just log if the socket is already closed or closing
          logger.info(`Existing socket already in readyState: ${socket.readyState}, no need to close`);
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
      // This improved version checks connection state more thoroughly and
      // ensures proper cleanup of failed connection attempts
      const connectionTimeout = setTimeout(() => {
        // Check if connection is not yet open
        if (ws && ws.readyState !== WebSocket.OPEN) {
          logger.warn('WebSocket connection timeout', {
            readyState: ws.readyState, 
            attempt: connectAttempts.current + 1,
            url: wsUrl
          });
          
          // Always attempt to clean up the failed connection
          try {
            // First remove all event handlers to prevent any callbacks
            ws.onopen = null;
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
            
            // Then attempt to close the connection
            if (ws.readyState === WebSocket.CONNECTING) {
              ws.close(1000, 'Connection timeout');
            }
          } catch (err) {
            logger.warn('Error cleaning up timed-out WebSocket:', err);
          }
          
          // Schedule reconnection with exponential backoff
          const maxBackoffAttempt = 8; // Cap the exponent to avoid extremely long delays
          const delay = Math.min(1000 * Math.pow(1.5, Math.min(connectAttempts.current, maxBackoffAttempt)), 10000);
          connectAttempts.current++;
          
          logger.info(`Scheduling reconnection attempt ${connectAttempts.current} in ${delay/1000} seconds after timeout`);
          
          // Clear any existing reconnect timeout first
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            logger.info(`Executing reconnection attempt ${connectAttempts.current} after timeout`);
            connect();
          }, delay);
        }
      }, 5000);
      
      ws.onopen = () => {
        // Clear the connection timeout since we successfully connected
        clearTimeout(connectionTimeout);
        
        // Update connection state
        setIsConnected(true);
        setStatus('connected');
        
        // Update connection stats
        setConnectionStats(prev => ({
          ...prev,
          lastConnected: new Date().toISOString(),
          disconnectReason: null
        }));
        
        connectAttempts.current = 0;
        logger.info('WebSocket connection established');
        
        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // Send initial authentication message using current user data from API
        try {
          // First attempt to fetch current user data from API
          logger.info('Fetching current user data for WebSocket authentication');
          
          // We'll use the credentials api to get user ID and company ID
          fetch('/api/user', {
            credentials: 'include', // Important: include cookies for authentication
            headers: { 'Content-Type': 'application/json' }
          })
          .then(response => {
            if (!response.ok) return null;
            return response.json();
          })
          .then(userData => {
            // Once we have the user data, get the company info
            if (userData && userData.id) {
              // Store for future reconnects
              localStorage.setItem('userId', userData.id.toString());
              
              // Now get company info
              return fetch('/api/companies/current', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(response => {
                if (!response.ok) return { userData, companyData: null };
                return response.json().then(companyData => ({ userData, companyData }));
              });
            }
            return { userData: null, companyData: null };
          })
          .then(({ userData, companyData }) => {
            // Now we have both user and company data if available
            const userId = userData?.id || localStorage.getItem('userId') || null;
            const companyId = companyData?.id || localStorage.getItem('companyId') || null;
            
            if (companyId) {
              localStorage.setItem('companyId', companyId.toString());
            }
            
            logger.info('Sending authentication message', { 
              userId, 
              companyId, 
              connectionId,
              hasUserData: !!userData,
              hasCompanyData: !!companyData
            });
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'authenticate',
                userId,
                companyId,
                clientId: connectionId,
                timestamp: new Date().toISOString()
              }));
            } else {
              logger.warn('WebSocket not open when trying to send authentication');
            }
          })
          .catch(error => {
            logger.warn('Error fetching authentication data', error);
            // Still try to authenticate with whatever we have in localStorage
            const userId = localStorage.getItem('userId') || null;
            const companyId = localStorage.getItem('companyId') || null;
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'authenticate',
                userId,
                companyId, 
                clientId: connectionId,
                timestamp: new Date().toISOString()
              }));
            }
          });
        } catch (authError) {
          logger.warn('Error initiating authentication process', authError);
        }
        
        // Setup regular heartbeat 
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
        
        // Update connection state
        setIsConnected(false);
        setStatus('disconnected');
        
        // Update connection stats
        setConnectionStats(prev => ({
          ...prev,
          disconnectReason: event.reason || `Closed with code ${event.code}`
        }));
        
        logger.info('WebSocket connection closed', { code: event.code, reason: event.reason || 'No reason provided' });
        
        // Stop heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Try reconnecting if it wasn't a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          // Increase reconnection attempts to improve resilience
          if (connectAttempts.current < 20) { // Increased from 10 to 20 attempts for higher resilience
            // Implement an exponential backoff with a minimum of 1s and cap at 30s
            const delay = Math.min(1000 * Math.pow(1.5, Math.min(connectAttempts.current, 10)), 30000);
            connectAttempts.current++;
            
            // Clear any existing reconnect timeout
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            logger.info(`Scheduling reconnection attempt ${connectAttempts.current} in ${delay/1000} seconds...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              logger.info(`Executing reconnection attempt ${connectAttempts.current}`);
              connect();
            }, delay);
          } else {
            // Reset attempts after the max to allow eventual recovery after a break
            logger.warn('Maximum reconnection attempts reached, will reset after 60 seconds', {
              connectionId,
              attempts: connectAttempts.current,
              timestamp: new Date().toISOString()
            });
            
            // Set a longer timeout to try again after a longer break
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              logger.info('Resetting reconnection attempts counter after timeout');
              connectAttempts.current = 0; 
              connect();
            }, 60000); // Try again after 1 minute
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
        
        // Update connection status
        setStatus('error');
        
        // Update connection stats
        setConnectionStats(prev => ({
          ...prev,
          disconnectReason: 'WebSocket error occurred'
        }));
        
        // Pass the data and valid log options separately
        logger.error('WebSocket error', errorData, { tags: ['error', 'websocket'] });
      };
      
      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          // Don't log heartbeat messages to reduce console spam
          if (data.type !== 'ping' && data.type !== 'pong') {
            logger.info(`Received message of type: ${data.type}`);
            
            // Additional logging for specific important message types
            if (data.type === 'task_update') {
              // Handle complex nested structures in task updates by safely extracting payload
              // This handles all known payload structures we've seen in the logs
              const extractTaskId = (data: any) => {
                if (data.taskId) return data.taskId;
                if (data.id) return data.id;
                if (data.payload?.taskId) return data.payload.taskId;
                if (data.payload?.id) return data.payload.id;
                if (data.payload?.payload?.id) return data.payload.payload.id;
                if (data.data?.id) return data.data.id;
                return undefined;
              };
              
              const extractStatus = (data: any) => {
                if (data.status) return data.status;
                if (data.payload?.status) return data.payload.status;
                if (data.payload?.payload?.status) return data.payload.payload.status;
                if (data.data?.status) return data.data.status;
                return 'unknown';
              };
              
              const extractProgress = (data: any) => {
                if (data.progress !== undefined) return data.progress;
                if (data.payload?.progress !== undefined) return data.payload.progress;
                if (data.payload?.payload?.progress !== undefined) return data.payload.payload.progress;
                if (data.data?.progress !== undefined) return data.data.progress;
                return undefined;
              };
              
              const taskId = extractTaskId(data);
              const status = extractStatus(data);
              const progress = extractProgress(data);
              
              if (taskId && (status || progress !== undefined)) {
                logger.info(`Task update received: Task #${taskId} - Status: ${status || 'unknown'}, Progress: ${progress !== undefined ? progress + '%' : 'unknown'}`);
              } else {
                // Log the raw structure if we couldn't extract the expected fields
                logger.info('Received task_update with unexpected structure:', {
                  hasTaskId: !!taskId,
                  hasStatus: status !== 'unknown',
                  hasProgress: progress !== undefined,
                  messageKeys: Object.keys(data),
                  payloadKeys: data.payload ? Object.keys(data.payload) : 'no payload',
                  nestedDataKeys: data.data ? Object.keys(data.data) : 'no data'
                });
              }
            } else if (data.type === 'authenticated') {
              logger.info('WebSocket authentication confirmed for client: ' + (data.clientId || data.payload?.clientId || 'unknown'));
            } else if (data.type === 'connection_established') {
              logger.info('WebSocket server connection confirmed with ID: ' + (data.clientId || data.payload?.clientId || 'unknown'));
            }
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
          
          // Store normalized message with improved nested payload handling
          // This addresses the doubly-nested payload issue we're seeing in the logs
          const normalizedPayload = (() => {
            // First check if we're dealing with a doubly-nested payload structure
            if (data.payload?.payload && typeof data.payload.payload === 'object') {
              return data.payload.payload;
            }
            // Then check for standard payload structure
            if (data.payload && typeof data.payload === 'object') {
              return data.payload;
            }
            // Then check for data property as alternative payload location
            if (data.data && typeof data.data === 'object') {
              return data.data;
            }
            // Finally, use the whole message if no payload found
            return data;
          })();
          
          setLastMessage({
            type: data.type,
            payload: normalizedPayload,
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
    sendMessage,
    status,
    connect,
    disconnect,
    connectionStats,
    forceReconnect
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
/**
 * WebSocket Hook
 * 
 * Provides a React hook for WebSocket connections with automatic reconnection
 * and message handling.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Message type definitions
// Keep these in sync with server/websocket.ts MessageType
export type WebSocketMessageType = 
  | 'ping' 
  | 'pong'
  | 'authenticate'
  | 'authenticated'
  | 'task_updated'
  | 'tutorial_updated'
  | 'company_tabs_updated'  // Used for real-time tab updates in the UI
  | 'connection_established';

// WebSocket message interface
export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp?: string;
  [key: string]: any;
}

// Options for the WebSocket hook
interface UseWebSocketOptions {
  /** Automatic reconnection attempt on disconnect */
  autoReconnect?: boolean;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Callback for when the WebSocket connects */
  onConnect?: () => void;
  /** Callback for when the WebSocket disconnects */
  onDisconnect?: (event: CloseEvent) => void;
  /** Callback for when a message is received */
  onMessage?: (message: WebSocketMessage) => void;
  /** Callback for when an error occurs */
  onError?: (error: Event) => void;
  /** Flag to enable debug logging */
  debug?: boolean;
}

/**
 * React hook for WebSocket connections
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    onConnect,
    onDisconnect,
    onMessage,
    onError,
    debug = false
  } = options;

  // WebSocket connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  // Refs to store WebSocket instance and reconnection state
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Logging helper
  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      if (data) {
        console.log(`[WebSocket] ${message}`, data);
      } else {
        console.log(`[WebSocket] ${message}`);
      }
    }
  }, [debug]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Only connect if not already connecting
    if (isConnecting) return;
    
    setIsConnecting(true);
    
    try {
      log('Connection attempt initiated');
      
      // Determine WebSocket URL based on current protocol and host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      log('Connecting to WebSocket:', wsUrl);
      
      // Create new WebSocket connection
      const newWs = new WebSocket(wsUrl);
      webSocketRef.current = newWs;
      
      // Set up event handlers
      newWs.onopen = () => {
        log('Connection established');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        if (onConnect) onConnect();
      };
      
      newWs.onclose = (event) => {
        log('WebSocket connection closed:', event.code);
        setIsConnected(false);
        setIsConnecting(false);
        
        if (onDisconnect) onDisconnect(event);
        
        // Attempt reconnection if auto-reconnect is enabled
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          
          log(`Scheduling reconnection attempt in ${reconnectDelay} milliseconds...`);
          
          // Clear any existing reconnection timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Schedule reconnection attempt
          reconnectTimeoutRef.current = setTimeout(() => {
            log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`);
            connect();
          }, reconnectDelay * reconnectAttemptsRef.current);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached.`);
        }
      };
      
      newWs.onerror = (error) => {
        log('WebSocket error:', error);
        if (onError) onError(error);
      };
      
      newWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // Set connectionId if this is a connection_established message
          if (message.type === 'connection_established' && message.clientId) {
            setConnectionId(message.clientId);
            log('Server connection confirmed:', message.message);
          }
          
          log('Received message:', message);
          setLastMessage(message);
          
          if (onMessage) onMessage(message);
        } catch (error) {
          log('Error parsing message:', error);
        }
      };
    } catch (error) {
      log('Error connecting to WebSocket:', error);
      setIsConnecting(false);
    }
  }, [
    isConnecting, 
    autoReconnect, 
    maxReconnectAttempts, 
    reconnectDelay, 
    onConnect, 
    onDisconnect, 
    onMessage, 
    onError,
    log
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (webSocketRef.current && (webSocketRef.current.readyState === WebSocket.OPEN || webSocketRef.current.readyState === WebSocket.CONNECTING)) {
      log('Manually disconnecting WebSocket');
      webSocketRef.current.close();
    }
    
    // Clear any reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [log]);

  // Send a message over the WebSocket connection
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString(),
        connectionId: `ws_${Date.now()}_${Math.random().toString(36).substring(2)}`
      };
      
      log('Sending message:', messageWithTimestamp);
      webSocketRef.current.send(JSON.stringify(messageWithTimestamp));
      return true;
    } else {
      log('Cannot send message - WebSocket not connected');
      return false;
    }
  }, [log]);

  // Send authentication data to the server
  const authenticate = useCallback((userId?: number, companyId?: number) => {
    if (isConnected) {
      log('Sending authentication message', {
        userId,
        companyId,
        connectionId: `ws_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        hasUserData: !!userId,
        hasCompanyData: !!companyId
      });
      
      return sendMessage({
        type: 'authenticate',
        userId,
        companyId,
        clientId: `ws_${Date.now()}_${Math.random().toString(36).substring(2)}`
      });
    } else {
      log('Cannot authenticate - WebSocket not connected');
      return false;
    }
  }, [isConnected, sendMessage, log]);

  // Send a ping message to keep the connection alive
  const sendPing = useCallback(() => {
    if (isConnected) {
      return sendMessage({
        type: 'ping',
      });
    }
    return false;
  }, [isConnected, sendMessage]);

  // Connect when the component mounts
  useEffect(() => {
    connect();
    
    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (isConnected) {
        sendPing();
      }
    }, 20000); // Send ping every 20 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, sendPing, isConnected]);

  // Return the WebSocket API
  return {
    isConnected,
    isConnecting,
    lastMessage,
    connectionId,
    connect,
    disconnect,
    sendMessage,
    authenticate,
    sendPing
  };
}

export default useWebSocket;
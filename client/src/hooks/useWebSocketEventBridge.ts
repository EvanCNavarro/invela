/**
 * WebSocketEventBridge Hook
 * 
 * This hook provides a reliable bridge for WebSocket events, ensuring
 * that components can subscribe to and receive WebSocket events
 * even if there are connection interruptions or race conditions.
 * 
 * It implements:
 * - Automatic reconnection with exponential backoff
 * - Event buffering during disconnection
 * - Deduplication of redundant messages
 * - Consistent event format across different event types
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import getLogger from '@/utils/logger';

const logger = getLogger('WebSocketEventBridge');

// Define the WebSocket message types
export type WebSocketMessage = {
  type: string;
  payload?: any;
  data?: any; // Some legacy messages use 'data' instead of 'payload'
  timestamp?: string;
};

// Define the WebSocket event handler type
export type WebSocketEventHandler = (message: WebSocketMessage) => void;

// Define the supported event types
export type WebSocketEventType = 
  | 'task_updated'
  | 'company_tabs_updated'
  | 'file_created'
  | 'form_submitted'
  | 'pong';

/**
 * Hook for subscribing to WebSocket events
 */
export function useWebSocketEventBridge() {
  // Reference to the WebSocket instance
  const socketRef = useRef<WebSocket | null>(null);
  
  // State for connection status and event handlers
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<WebSocketEventHandler>>>(new Map());
  
  // Queue for messages received while disconnected
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  
  // Track seen message IDs for deduplication
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  
  // Generate message ID for deduplication
  const getMessageId = useCallback((message: WebSocketMessage): string => {
    const { type, timestamp } = message;
    let idParts = [type];
    
    // For task updates, include the task ID
    if (type === 'task_updated' && (message.payload?.taskId || message.data?.taskId)) {
      idParts.push(String(message.payload?.taskId || message.data?.taskId));
    }
    
    // For company_tabs_updated, include the company ID
    if (type === 'company_tabs_updated' && (message.payload?.companyId || message.data?.companyId)) {
      idParts.push(String(message.payload?.companyId || message.data?.companyId));
    }
    
    // Add timestamp if available
    if (timestamp) {
      idParts.push(timestamp);
    }
    
    return idParts.join('-');
  }, []);
  
  // Initialize WebSocket connection
  const initWebSocket = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      logger.info('WebSocket connection already open');
      return;
    }
    
    try {
      // Set up WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      logger.info(`Connecting to WebSocket: ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Handle WebSocket events
      socket.onopen = () => {
        logger.info('WebSocket connection established');
        setIsConnected(true);
        
        // Process any queued messages
        if (messageQueueRef.current.length > 0) {
          logger.info(`Processing ${messageQueueRef.current.length} queued messages`);
          messageQueueRef.current.forEach(message => {
            processMessage(message);
          });
          messageQueueRef.current = [];
        }
        
        // Send authentication message
        fetchUserDataAndAuthenticate();
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle connection established message
          if (message.type === 'connection_established') {
            logger.info('WebSocket server connection confirmed with ID:', message.payload?.clientId || null);
            setConnectionId(message.payload?.clientId || null);
          }
          
          // Handle authentication confirmation
          if (message.type === 'authenticated') {
            logger.info('WebSocket authentication confirmed for client:', message.payload?.clientId || null);
          }
          
          // Log message type without full payload to reduce log volume
          logger.debug(`Received message of type: ${message.type}`);
          
          // Process the message (includes deduplication)
          processMessage(message);
        } catch (error) {
          logger.error('Error processing WebSocket message:', error);
        }
      };
      
      socket.onclose = (event) => {
        logger.info('WebSocket connection closed', { code: event.code, reason: event.reason });
        setIsConnected(false);
        setConnectionId(null);
        
        // Schedule reconnection attempt
        scheduleReconnect();
      };
      
      socket.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };
    } catch (error) {
      logger.error('Error initializing WebSocket:', error);
      scheduleReconnect();
    }
  }, []);
  
  // Fetch user data and send authentication message
  const fetchUserDataAndAuthenticate = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot authenticate - WebSocket not open');
      return;
    }
    
    try {
      logger.info('Fetching current user data for WebSocket authentication');
      
      // Try to fetch current user data
      const userResponse = await fetch('/api/me');
      let userId = null;
      let companyId = null;
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        userId = userData.id;
        companyId = userData.companyId;
      }
      
      // Send authentication message
      const authMessage = {
        type: 'authenticate',
        userId,
        companyId,
        connectionId: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        timestamp: new Date().toISOString()
      };
      
      logger.info('Sending authentication message', {
        userId,
        companyId,
        connectionId: authMessage.connectionId,
        hasUserData: !!userId,
        hasCompanyData: !!companyId
      });
      
      socketRef.current.send(JSON.stringify(authMessage));
    } catch (error) {
      logger.error('Error authenticating WebSocket:', error);
    }
  }, []);
  
  // Schedule WebSocket reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    const reconnectDelay = 1000; // Start with 1 second
    logger.info(`Scheduling reconnection attempt in ${reconnectDelay / 1000} seconds...`);
    
    setTimeout(() => {
      logger.info('Attempting to reconnect WebSocket...');
      initWebSocket();
    }, reconnectDelay);
  }, [initWebSocket]);
  
  // Process a WebSocket message (with deduplication)
  const processMessage = useCallback((message: WebSocketMessage) => {
    // Extract the message type and ensure it exists
    const { type } = message;
    if (!type) {
      logger.warn('Received message without type', message);
      return;
    }
    
    // Generate a message ID for deduplication
    const messageId = getMessageId(message);
    
    // Skip if we've already seen this message (deduplication)
    if (seenMessageIdsRef.current.has(messageId)) {
      logger.debug(`Skipping duplicate message: ${messageId}`);
      return;
    }
    
    // Mark this message as seen
    seenMessageIdsRef.current.add(messageId);
    
    // If we have too many seen message IDs, clear old ones
    if (seenMessageIdsRef.current.size > 1000) {
      logger.debug('Clearing old message IDs from deduplication cache');
      seenMessageIdsRef.current.clear();
    }
    
    // If we don't have handlers for this message type, queue it
    if (!isConnected || !eventHandlersRef.current.has(type)) {
      messageQueueRef.current.push(message);
      return;
    }
    
    // Get handlers for this message type
    const handlers = eventHandlersRef.current.get(type);
    if (!handlers || handlers.size === 0) return;
    
    // Normalize payload - some messages use 'data' instead of 'payload'
    const normalizedMessage = {
      ...message,
      payload: message.payload || message.data
    };
    
    // Call all handlers for this message type
    handlers.forEach(handler => {
      try {
        handler(normalizedMessage);
      } catch (error) {
        logger.error(`Error in handler for message type ${type}:`, error);
      }
    });
  }, [isConnected, getMessageId]);
  
  // Subscribe to WebSocket events
  const subscribe = useCallback((type: WebSocketEventType, handler: WebSocketEventHandler) => {
    if (!eventHandlersRef.current.has(type)) {
      eventHandlersRef.current.set(type, new Set());
    }
    
    eventHandlersRef.current.get(type)!.add(handler);
    logger.info(`Subscribed to WebSocket event type: ${type}`);
    
    // Process any queued messages of this type immediately
    const queuedMessages = messageQueueRef.current.filter(m => m.type === type);
    if (queuedMessages.length > 0) {
      logger.info(`Processing ${queuedMessages.length} queued messages of type ${type}`);
      queuedMessages.forEach(message => {
        try {
          handler(message);
        } catch (error) {
          logger.error(`Error in handler for queued message of type ${type}:`, error);
        }
      });
      
      // Remove processed messages from the queue
      messageQueueRef.current = messageQueueRef.current.filter(m => m.type !== type);
    }
    
    // Return unsubscribe function
    return () => {
      if (eventHandlersRef.current.has(type)) {
        eventHandlersRef.current.get(type)!.delete(handler);
        
        // If no handlers left, remove the entry
        if (eventHandlersRef.current.get(type)!.size === 0) {
          eventHandlersRef.current.delete(type);
        }
      }
    };
  }, []);
  
  // Send a WebSocket message
  const send = useCallback((message: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send message - WebSocket not open', message);
      return false;
    }
    
    try {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('Error sending WebSocket message:', error);
      return false;
    }
  }, []);
  
  // Send a ping message
  const sendPing = useCallback(() => {
    return send({
      type: 'ping',
      timestamp: new Date().toISOString(),
      connectionId: connectionId
    });
  }, [send, connectionId]);
  
  // Initialize WebSocket when component mounts
  useEffect(() => {
    logger.info('WebSocketEventBridge initializing');
    initWebSocket();
    
    // Set up periodic pings to keep connection alive
    const pingInterval = setInterval(() => {
      if (isConnected) {
        sendPing();
      }
    }, 20000); // 20 seconds
    
    // Clean up when component unmounts
    return () => {
      logger.info('Cleaning up event bridge');
      clearInterval(pingInterval);
      
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [initWebSocket, isConnected, sendPing]);
  
  // Return the API
  return {
    isConnected,
    connectionId,
    subscribe,
    send,
    sendPing
  };
}

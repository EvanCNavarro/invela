import { useState, useEffect, useCallback, useRef } from 'react';

type MessageHandler = (data: any) => void;
type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Custom hook for WebSocket communication
 * 
 * This hook handles WebSocket connection establishment, reconnection, 
 * message sending and receiving, following development guidelines for Invela.
 */
export function useWebSocket() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  
  // Keep track of connection attempts
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Create WebSocket connection
  const connect = useCallback(() => {
    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Reset reconnect timeout if exists
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Use the correct protocol and path as specified in development guidelines
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('[WebSocket] Connecting to WebSocket server:', wsUrl);
    setStatus('connecting');
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('[WebSocket] Connection established');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', message);
          
          // Set the last received message
          setLastMessage(message);
          
          // Handle different message types
          if (message.type) {
            // Call any registered handlers for this message type
            const handlers = messageHandlersRef.current.get(message.type);
            if (handlers) {
              handlers.forEach(handler => {
                try {
                  handler(message);
                } catch (error) {
                  console.error('[WebSocket] Error in message handler:', error);
                }
              });
            }
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
      
      socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setStatus('disconnected');
        
        // Only attempt to reconnect if it wasn't a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          scheduleReconnect();
        }
      };
      
      socket.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        setStatus('error');
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket connection:', error);
      setStatus('error');
      scheduleReconnect();
    }
  }, []);
  
  // Schedule a reconnection attempt with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
      console.log(`[WebSocket] Scheduling reconnection attempt in ${delay / 1000} seconds...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`[WebSocket] Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`);
        connect();
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }, [connect]);
  
  // Send a message to the server
  const sendMessage = useCallback((type: string, data: any = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type,
        timestamp: new Date().toISOString(),
        ...data
      };
      
      socketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('[WebSocket] Cannot send message, socket is not open');
      return false;
    }
  }, []);
  
  // Subscribe to a specific message type
  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    if (!messageHandlersRef.current.has(messageType)) {
      messageHandlersRef.current.set(messageType, new Set());
    }
    
    const handlers = messageHandlersRef.current.get(messageType)!;
    handlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = messageHandlersRef.current.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          messageHandlersRef.current.delete(messageType);
        }
      }
    };
  }, []);
  
  // Start the connection when the hook is first used
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
  
  // Send ping messages to keep the connection alive
  useEffect(() => {
    if (status !== 'connected') return;
    
    const pingInterval = setInterval(() => {
      sendMessage('ping', { 
        timestamp: new Date().toISOString(),
        connectionId: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    }, 30000); // Send ping every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [status, sendMessage]);
  
  return {
    status,
    lastMessage,
    sendMessage,
    subscribe,
    reconnect: connect
  };
}
import { useEffect, useState, useRef, useCallback } from 'react';
import getLogger from '@/utils/logger';

const logger = getLogger('WebSocketHook', {
  levels: { debug: true, info: true, warn: true, error: true }
});

// Interface for configuration options
interface WebSocketOptions {
  // Auto-reconnect if connection is closed
  autoReconnect?: boolean;
  // Time in ms between reconnection attempts
  reconnectInterval?: number;
  // Maximum number of reconnection attempts (0 = unlimited)
  maxReconnectAttempts?: number;
  // Callback when connection is established
  onConnect?: () => void;
  // Callback when connection is closed
  onDisconnect?: () => void;
  // Callback when error occurs
  onError?: (error: Event) => void;
}

// Message handler type
type MessageHandler = (event: MessageEvent) => void;

/**
 * Custom hook for WebSocket usage
 * 
 * @param url WebSocket URL to connect to
 * @param options Configuration options
 * @returns Object with connection status and methods to send messages
 */
export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  
  // Default options
  const defaultOptions: Required<WebSocketOptions> = {
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    onConnect: () => {},
    onDisconnect: () => {},
    onError: () => {},
  };
  
  // Merge user options with defaults
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Create a new WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      logger.warn('WebSocket connection already exists');
      return;
    }
    
    logger.info(`Creating WebSocket connection to ${url}`);
    
    const ws = new WebSocket(url);
    wsRef.current = ws;
    
    ws.addEventListener('open', () => {
      logger.info('WebSocket connection established');
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      mergedOptions.onConnect();
    });
    
    ws.addEventListener('close', (event) => {
      logger.info(`WebSocket connection closed: ${event.code} ${event.reason}`);
      setIsConnected(false);
      mergedOptions.onDisconnect();
      
      // Auto-reconnect logic
      if (mergedOptions.autoReconnect && 
          (!mergedOptions.maxReconnectAttempts || reconnectAttempts < mergedOptions.maxReconnectAttempts)) {
        logger.info(`Attempting to reconnect (${reconnectAttempts + 1}/${mergedOptions.maxReconnectAttempts || 'unlimited'})`);
        setReconnectAttempts(prev => prev + 1);
        setTimeout(connect, mergedOptions.reconnectInterval);
      }
    });
    
    ws.addEventListener('error', (err) => {
      logger.error('WebSocket error:', err);
      setError(err);
      mergedOptions.onError(err);
    });
    
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        const messageType = data.type;
        
        // Handle messages by type
        if (messageType && messageHandlersRef.current.has(messageType)) {
          const handlers = messageHandlersRef.current.get(messageType);
          if (handlers) {
            handlers.forEach(handler => handler(event));
          }
        }
        
        logger.debug('WebSocket message received:', data);
      } catch (error) {
        logger.warn('Error processing WebSocket message:', error);
      }
    });
  }, [url, mergedOptions, reconnectAttempts]);
  
  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
      logger.info('WebSocket disconnected by user');
    }
  }, []);
  
  // Send a message via the WebSocket
  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      logger.debug('WebSocket message sent:', data);
      return true;
    } else {
      logger.warn('Cannot send message: WebSocket not connected');
      return false;
    }
  }, []);
  
  // Add event handler for specific message type
  const addMessageHandler = useCallback((messageType: string, handler: MessageHandler) => {
    if (!messageHandlersRef.current.has(messageType)) {
      messageHandlersRef.current.set(messageType, new Set());
    }
    messageHandlersRef.current.get(messageType)?.add(handler);
    
    return () => {
      messageHandlersRef.current.get(messageType)?.delete(handler);
      if (messageHandlersRef.current.get(messageType)?.size === 0) {
        messageHandlersRef.current.delete(messageType);
      }
    };
  }, []);
  
  // Connect on mount and cleanup on unmount
  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
  return {
    isConnected,
    error,
    sendMessage,
    addMessageHandler,
    disconnect,
    reconnect: connect,
  };
}

/**
 * Hook for listening to WebSocket messages of a specific type
 * 
 * @param messageType The message type to listen for
 * @param onMessage Message handler function 
 * @param deps Dependencies that should trigger re-subscription
 */
export function useWebSocketListener(messageType: string, onMessage: (data: any) => void, deps: any[] = []) {
  // Build WebSocket URL once
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  };
  
  const { addMessageHandler } = useWebSocket(getWebSocketUrl());
  
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        logger.warn(`Error parsing WebSocket message for type ${messageType}:`, error);
      }
    };
    
    return addMessageHandler(messageType, handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useWebSocketListener;
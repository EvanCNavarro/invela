/**
 * WebSocket Event Bridge
 * 
 * This hook manages a reliable WebSocket connection with automatic
 * reconnection, message deduplication, and structured event handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { notify } from '@/providers/notification-provider';

type WebSocketReadyState = 0 | 1 | 2 | 3;

type WebSocketEventHandler = (data: any) => void;

type WebSocketEventSubscription = {
  eventType: string;
  handler: WebSocketEventHandler;
  id: string;
};

type MessageCache = {
  [messageId: string]: {
    timestamp: number;
    processed: boolean;
  };
};

/**
 * Hook to manage WebSocket connections and events
 */
export function useWebSocketEventBridge(options: {
  reconnectDelay?: number;
  pingInterval?: number;
  showNotifications?: boolean;
  messageExpirationTime?: number;
} = {}) {
  const {
    reconnectDelay = 3000,
    pingInterval = 20000,
    showNotifications = true,
    messageExpirationTime = 30000, // 30 seconds
  } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [readyState, setReadyState] = useState<WebSocketReadyState>(3); // 3 = CLOSED
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlers = useRef<WebSocketEventSubscription[]>([]);
  const messageCache = useRef<MessageCache>({});
  const connectionId = useRef<string>(`ws_${Date.now()}_${Math.random().toString(36).substring(2)}`);

  /**
   * Setup a new WebSocket connection
   */
  const setupWebSocket = useCallback(() => {
    // Clean up any existing connection
    if (socket.current) {
      console.info('Closing existing WebSocket connection before creating a new one');
      socket.current.close();
    }
    
    // Clear existing timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    // Determine WebSocket URL (handle both http and https)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      // Create new WebSocket
      console.info('Setting up WebSocket connection to', wsUrl);
      const newSocket = new WebSocket(wsUrl);
      socket.current = newSocket;
      
      // Setup event handlers
      newSocket.onopen = () => {
        console.info('[WebSocket] Connected');
        setIsConnected(true);
        setReadyState(1); // 1 = OPEN
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            // Send ping with timestamp
            newSocket.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString(),
              connectionId: connectionId.current,
            }));
          }
        }, pingInterval);
        
        if (showNotifications) {
          notify.success('Connected', 'Real-time connection established');
        }
      };
      
      newSocket.onclose = (event) => {
        console.info(`[WebSocket] Disconnected: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        setReadyState(3); // 3 = CLOSED
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Schedule reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          console.info('[WebSocket] Attempting to reconnect...');
          setupWebSocket();
        }, reconnectDelay);
        
        if (showNotifications) {
          notify.warning('Disconnected', 'Real-time connection lost. Reconnecting...');
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
      
      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const messageId = message.id || `${message.type}-${message.timestamp || Date.now()}`;
          
          // Log the received message
          console.info('[WebSocket] Received message:', message);
          console.log(`[${new Date().toISOString()}] [WebSocket] Received message of type: ${message.type}`);
          
          // Check for duplicates
          if (messageCache.current[messageId]) {
            if (messageCache.current[messageId].processed) {
              console.log(`[WebSocket] Ignoring duplicate message: ${messageId}`);
              return;
            }
          }
          
          // Add to message cache
          messageCache.current[messageId] = {
            timestamp: Date.now(),
            processed: true,
          };
          
          // Special handling for pong messages
          if (message.type === 'pong') {
            return;
          }
          
          // Process the message - handle both legacy and new payload formats
          const data = message.payload || message.data || message;
          
          // Dispatch to handlers for this event type
          const matchingHandlers = eventHandlers.current.filter(
            (sub) => sub.eventType === message.type || sub.eventType === '*'
          );
          
          matchingHandlers.forEach((subscription) => {
            try {
              subscription.handler(data);
            } catch (err) {
              console.error(
                `[WebSocket] Error in handler for ${message.type}:`,
                err
              );
            }
          });
        } catch (err) {
          console.error('[WebSocket] Error processing message:', err, event.data);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Setup error:', error);
      
      // Schedule reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        console.info('[WebSocket] Attempting to reconnect after setup error...');
        setupWebSocket();
      }, reconnectDelay);
      
      if (showNotifications) {
        notify.error('Connection Error', 'Failed to establish real-time connection');
      }
    }
  }, [reconnectDelay, pingInterval, showNotifications]);
  
  /**
   * Subscribe to a specific event type
   */
  const subscribe = useCallback((eventType: string, handler: WebSocketEventHandler) => {
    const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Add to event handlers
    const subscription: WebSocketEventSubscription = {
      eventType,
      handler,
      id,
    };
    
    eventHandlers.current = [...eventHandlers.current, subscription];
    console.info(`[WebSocket] Subscribed to ${eventType} events (${id})`);
    
    // Return an unsubscribe function
    return () => {
      eventHandlers.current = eventHandlers.current.filter((sub) => sub.id !== id);
      console.info(`[WebSocket] Unsubscribed from ${eventType} events (${id})`);
    };
  }, []);
  
  /**
   * Send a message over the WebSocket
   */
  const sendMessage = useCallback((type: string, data: any) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message, socket not open');
      return false;
    }
    
    try {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
        clientId: connectionId.current,
      };
      
      socket.current.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[WebSocket] Error sending message:', err);
      return false;
    }
  }, []);
  
  /**
   * Clean up message cache by removing expired messages
   */
  const cleanupMessageCache = useCallback(() => {
    const now = Date.now();
    const expiredIds = Object.keys(messageCache.current).filter(
      (id) => now - messageCache.current[id].timestamp > messageExpirationTime
    );
    
    expiredIds.forEach((id) => {
      delete messageCache.current[id];
    });
    
    if (expiredIds.length > 0) {
      console.info(`[WebSocket] Cleaned up ${expiredIds.length} expired messages`);
    }
  }, [messageExpirationTime]);
  
  /**
   * Force reconnect the WebSocket
   */
  const reconnect = useCallback(() => {
    console.info('[WebSocket] Manual reconnect triggered');
    setupWebSocket();
  }, [setupWebSocket]);
  
  // Setup WebSocket on mount and clean up on unmount
  useEffect(() => {
    setupWebSocket();
    
    // Setup message cache cleanup interval
    const cacheCleanupInterval = setInterval(cleanupMessageCache, messageExpirationTime / 2);
    
    return () => {
      // Clean up WebSocket
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
      
      // Clean up timeouts and intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      clearInterval(cacheCleanupInterval);
    };
  }, [setupWebSocket, messageExpirationTime, cleanupMessageCache]);
  
  return {
    isConnected,
    readyState,
    subscribe,
    sendMessage,
    reconnect,
  };
}

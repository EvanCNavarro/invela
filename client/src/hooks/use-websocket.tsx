/**
 * WebSocket Hook
 * 
 * This hook provides a type-safe and convenient way to interact with WebSockets
 * in React components. It manages connection, reconnection, and event handling.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { WebSocketEvent, WebSocketEventMap, PayloadFromEventType } from '@/lib/websocket-types';

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
  autoConnect?: boolean;
}

type SubscriptionCallback<T extends keyof WebSocketEventMap> = 
  (payload: PayloadFromEventType<T>) => void;

type SubscriptionMap = {
  [K in keyof WebSocketEventMap]?: Set<SubscriptionCallback<K>>;
};

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionId: string | null;
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => void;
  subscribe: <T extends keyof WebSocketEventMap>(eventType: T, callback: SubscriptionCallback<T>) => () => void;
  unsubscribe: <T extends keyof WebSocketEventMap>(eventType: T, callback: SubscriptionCallback<T>) => void;
}

/**
 * Hook for WebSocket communication with type-safety
 * 
 * @param url The WebSocket URL to connect to
 * @param options Configuration options
 * @returns WebSocket control methods and state
 */
export function useWebSocket(url: string, options: WebSocketOptions = {}): UseWebSocketReturn {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    debug = false,
    autoConnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<SubscriptionMap>({});
  
  // Logging helper with conditional output
  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`%c[${new Date().toISOString()}] [INFO] ${message}`, 'color: #2196f3', data || '');
      }
    },
    [debug]
  );
  
  const logError = useCallback(
    (message: string, error?: any) => {
      console.error(`%c[${new Date().toISOString()}] [ERROR] ${message}`, 'color: #f44336', error || '');
    },
    []
  );

  // Create a new WebSocket connection
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      log('WebSocket already connected');
      return;
    }

    if (isConnecting) {
      log('WebSocket connection already in progress');
      return;
    }

    setIsConnecting(true);
    log(`Connecting to WebSocket at ${url}`);

    try {
      // Validate URL before creating WebSocket connection
      if (!url) {
        logError(`Invalid WebSocket URL: empty URL`);
        setIsConnecting(false);
        return;
      }

      console.log(`[WebSocket] Creating connection to: ${url}`);
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        log('WebSocket connection established');

        // Generate and store a connection ID
        const newConnectionId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
        setConnectionId(newConnectionId);

        // Send an initial ping with connection ID to establish the connection
        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString(),
          connectionId: newConnectionId
        }));
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        log(`WebSocket connection closed: ${event.code} - ${event.reason}`);

        // Handle reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          setTimeout(connect, reconnectInterval);
        } else {
          logError('Maximum reconnection attempts reached');
          toast({
            title: 'Connection lost',
            description: 'Unable to reconnect to server. Please refresh the page.',
            variant: 'destructive',
          });
        }
      };

      socket.onerror = (error) => {
        logError('WebSocket error:', error);
        toast({
          title: 'Connection error',
          description: 'There was a problem with the connection. Attempting to reconnect...',
          variant: 'destructive',
        });
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketEvent;
          log('Received message:', message);

          // Special handling for pong messages
          if (message.type === 'pong') {
            return;
          }

          // Find callbacks for this event type
          const callbacks = subscriptionsRef.current[message.type as keyof WebSocketEventMap];
          if (callbacks && callbacks.size > 0) {
            // Use payload from message.payload, falling back to message.data for compatibility
            const payload = message.payload || message.data;
            if (payload) {
              callbacks.forEach(callback => {
                try {
                  callback(payload as any);
                } catch (error) {
                  logError(`Error in subscription callback for ${message.type}:`, error);
                }
              });
            } else {
              log(`Message of type ${message.type} has no payload or data`);
            }
          }
        } catch (error) {
          logError('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      setIsConnecting(false);
      logError('Error creating WebSocket connection:', error);
    }
  }, [url, isConnecting, log, logError, maxReconnectAttempts, reconnectInterval]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      log('Disconnecting WebSocket');
      socketRef.current.close();
      socketRef.current = null;
      setConnectionId(null);
    }
  }, [log]);

  // Send a message through WebSocket
  const send = useCallback(
    (message: any) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
        socketRef.current.send(formattedMessage);
        log('Sent message:', message);
      } else {
        logError('Cannot send message, WebSocket is not connected');
      }
    },
    [log, logError]
  );

  // Subscribe to a specific event type
  const subscribe = useCallback(<T extends keyof WebSocketEventMap>(
    eventType: T,
    callback: SubscriptionCallback<T>
  ) => {
    log(`Subscribing to event type: ${String(eventType)}`);
    
    if (!subscriptionsRef.current[eventType]) {
      subscriptionsRef.current[eventType] = new Set();
    }
    
    (subscriptionsRef.current[eventType] as Set<SubscriptionCallback<T>>).add(callback);
    
    // Return unsubscribe function
    return () => {
      if (subscriptionsRef.current[eventType]) {
        (subscriptionsRef.current[eventType] as Set<SubscriptionCallback<T>>).delete(callback);
      }
    };
  }, [log]);

  // Explicitly unsubscribe from an event type
  const unsubscribe = useCallback(<T extends keyof WebSocketEventMap>(
    eventType: T,
    callback: SubscriptionCallback<T>
  ) => {
    if (subscriptionsRef.current[eventType]) {
      (subscriptionsRef.current[eventType] as Set<SubscriptionCallback<T>>).delete(callback);
      log(`Unsubscribed from event type: ${String(eventType)}`);
    }
  }, [log]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Start ping interval
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        send({
          type: 'ping',
          timestamp: new Date().toISOString(),
          connectionId
        });
      }
    }, 30000); // Send ping every 30 seconds

    // Cleanup on component unmount
    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [autoConnect, connect, disconnect, send, connectionId]);

  return {
    isConnected,
    isConnecting,
    connectionId,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe
  };
}

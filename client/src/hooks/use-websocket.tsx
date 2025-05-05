/**
 * WebSocket Hook with Fallback Mechanism
 * 
 * This hook provides a type-safe and resilient way to interact with WebSockets
 * in React components. It includes sophisticated error handling, reconnection,
 * and a fallback mechanism when WebSockets are not available.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { WebSocketEvent, WebSocketEventMap, PayloadFromEventType } from '@/lib/websocket-types';

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
  autoConnect?: boolean;
  onMaxReconnectAttemptsReached?: () => void;
}

type SubscriptionCallback<T extends keyof WebSocketEventMap> = 
  (payload: PayloadFromEventType<T>) => void;

// Map for storing subscriptions
type SubscriptionMap = {
  [K in keyof WebSocketEventMap]?: Set<any>;
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
 * Hook for WebSocket communication with fallback mechanism
 */
export function useWebSocket(url: string, options: WebSocketOptions = {}): UseWebSocketReturn {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    debug = false,
    autoConnect = true,
    onMaxReconnectAttemptsReached
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [inFallbackMode, setInFallbackMode] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<SubscriptionMap>({});
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Logging helpers
  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[WebSocket] ${message}`, data || '');
      }
    },
    [debug]
  );
  
  const logError = useCallback(
    (message: string, error?: any) => {
      console.error(`[WebSocket] [ERROR] ${message}`, error || '');
    },
    []
  );
  
  // Setup the WebSocket connection with handlers
  const setupWebSocket = useCallback((wsUrl: string) => {
    try {
      // Close any existing connection
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      // Create a new WebSocket with custom protocol
      const socket = new WebSocket(wsUrl, ['app-ws-protocol']);
      socketRef.current = socket;
      
      // Store connection attempt timestamp
      window._ws_last_attempt = Date.now();
      
      // Generate and store a unique connection ID
      const newConnectionId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setConnectionId(newConnectionId);
      
      // Connection timeout - if we don't connect in 10 seconds, consider it failed
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      connectionTimeoutRef.current = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.warn('[WebSocket] Connection timeout - closing socket');
          socket.close(3000, 'Connection timeout');
          setIsConnecting(false);
          
          // Increment 1006 count (abnormal closure)
          window._ws_1006_count = (window._ws_1006_count || 0) + 1;
        }
      }, 10000);
      
      // Connection opened
      socket.onopen = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setIsConnected(true);
        setIsConnecting(false);
        setInFallbackMode(false);
        reconnectAttemptsRef.current = 0;
        
        // Reset error counters on successful connection
        window._ws_1006_count = 0;
        window._ws_backoff_active = false;
        
        log(`Connection established (ID: ${newConnectionId})`);
        
        // Send an initial ping to verify the connection
        try {
          socket.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString(),
            connectionId: newConnectionId
          }));
        } catch (err) {
          logError('Error sending initial ping:', err);
        }
      };
      
      // Connection closed
      socket.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        log(`Connection closed: Code=${event.code}, Reason=${event.reason || 'none'}, Clean=${event.wasClean}`);
        
        // Special handling for Error Code 1006 (Abnormal Closure)
        if (event.code === 1006) {
          window._ws_1006_count = (window._ws_1006_count || 0) + 1;
          
          if ((window._ws_1006_count || 0) >= 10) {
            console.warn(`[WebSocket] Too many consecutive abnormal closures (${window._ws_1006_count}), entering fallback mode`);
            window._ws_backoff_active = true;
            window._ws_last_attempt = Date.now();
            setInFallbackMode(true);
            
            if (onMaxReconnectAttemptsReached) {
              onMaxReconnectAttemptsReached();
            }
            
            return;
          }
        } else {
          // Reset error counter for non-1006 errors
          window._ws_1006_count = 0;
        }
        
        // Only attempt reconnection for abnormal closures
        if (event.code !== 1000 && event.code !== 1001) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            
            // Add progressive delay based on reconnect attempt count
            const delay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1);
            log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms`);
            
            setTimeout(() => {
              if (!inFallbackMode) {
                connect();
              }
            }, delay);
          } else {
            console.warn(`[WebSocket] Maximum reconnection attempts reached (${maxReconnectAttempts}), entering fallback mode`);
            setInFallbackMode(true);
            
            if (onMaxReconnectAttemptsReached) {
              onMaxReconnectAttemptsReached();
            }
          }
        }
      };
      
      // Connection error
      socket.onerror = (error) => {
        logError('Connection error:', error);
      };
      
      // Message received
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketEvent;
          log('Received message:', message);
          
          // Special handling for pong messages
          if (message.type === 'pong') {
            return;
          }
          
          // Find and execute callbacks for this event type
          const callbacks = subscriptionsRef.current[message.type as keyof WebSocketEventMap];
          if (callbacks && callbacks.size > 0) {
            // Support both payload and data properties for backward compatibility
            const payload = message.payload || message.data;
            if (payload) {
              callbacks.forEach(callback => {
                try {
                  callback(payload as any);
                } catch (error) {
                  logError(`Error in subscription callback for ${message.type}:`, error);
                }
              });
            }
          }
        } catch (error) {
          logError('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      logError('Error setting up WebSocket:', error);
      setIsConnecting(false);
    }
  }, [log, logError, maxReconnectAttempts, reconnectInterval, onMaxReconnectAttemptsReached, inFallbackMode]);
  
  // Connect to the WebSocket server
  const connect = useCallback(() => {
    // Do nothing if already connected
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      log('WebSocket already connected');
      return;
    }
    
    // Do nothing if connection is in progress
    if (isConnecting) {
      log('Connection already in progress');
      return;
    }
    
    // Check if we should be in fallback mode
    if (inFallbackMode || (window._ws_1006_count || 0) >= 15) {
      log('In fallback mode, skipping WebSocket connection');
      return;
    }
    
    // Check if we're in backoff mode
    if (window._ws_backoff_active) {
      const lastAttempt = window._ws_last_attempt || 0;
      const cooldownPeriod = 60000; // 1 minute cooldown
      const currentTime = Date.now();
      
      if ((currentTime - lastAttempt) < cooldownPeriod) {
        log(`Connection blocked by backoff (${Math.floor((cooldownPeriod - (currentTime - lastAttempt)) / 1000)}s remaining)`);
        return;
      } else {
        log('Backoff period ended, resetting backoff');
        window._ws_backoff_active = false;
      }
    }
    
    setIsConnecting(true);
    
    // Validate and use the WebSocket URL
    if (!url || (!url.startsWith('ws:') && !url.startsWith('wss:'))) {
      logError(`Invalid WebSocket URL: ${url}`);
      setIsConnecting(false);
      return;
    }
    
    log(`Attempting connection with URL: ${url}`);
    
    // Introduce a delay if we've had several error 1006 codes
    const errorCount = window._ws_1006_count || 0;
    if (errorCount > 5) {
      const forcedDelay = 1000 + Math.min(errorCount * 300, 10000);
      log(`High error count (${errorCount}), delaying connection for ${forcedDelay}ms`);
      
      setTimeout(() => {
        setupWebSocket(url);
      }, forcedDelay);
    } else {
      // Connect immediately if no delay needed
      setupWebSocket(url);
    }
  }, [url, isConnecting, inFallbackMode, log, logError, setupWebSocket]);
  
  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      log('Disconnecting WebSocket');
      socketRef.current.close(1000, 'Closed by client');
      socketRef.current = null;
      setConnectionId(null);
      setIsConnected(false);
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, [log]);
  
  // Send a message through the WebSocket
  const send = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      socketRef.current.send(formattedMessage);
      log('Sent message:', message);
    } else {
      log('Cannot send message, WebSocket is not connected');
    }
  }, [log]);
  
  // Subscribe to WebSocket events
  const subscribe = useCallback(<T extends keyof WebSocketEventMap>(
    eventType: T,
    callback: SubscriptionCallback<T>
  ) => {
    log(`Subscribing to event: ${String(eventType)}`);
    
    if (!subscriptionsRef.current[eventType]) {
      subscriptionsRef.current[eventType] = new Set();
    }
    
    (subscriptionsRef.current[eventType] as Set<any>).add(callback);
    
    // Return unsubscribe function
    return () => {
      if (subscriptionsRef.current[eventType]) {
        (subscriptionsRef.current[eventType] as Set<any>).delete(callback);
      }
    };
  }, [log]);
  
  // Explicitly unsubscribe from events
  const unsubscribe = useCallback(<T extends keyof WebSocketEventMap>(
    eventType: T,
    callback: SubscriptionCallback<T>
  ) => {
    if (subscriptionsRef.current[eventType]) {
      (subscriptionsRef.current[eventType] as Set<any>).delete(callback);
      log(`Unsubscribed from event: ${String(eventType)}`);
    }
  }, [log]);
  
  // Initialize connection and clean up on unmount
  useEffect(() => {
    // Connect automatically if enabled
    if (autoConnect && !inFallbackMode) {
      connect();
    }
    
    // Ping interval to keep the connection alive
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        send({
          type: 'ping',
          timestamp: new Date().toISOString(),
          connectionId
        });
      }
    }, 30000);
    
    // Clean up on unmount
    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [autoConnect, inFallbackMode, connect, disconnect, send, connectionId]);
  
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

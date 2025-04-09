import { useState, useEffect, useCallback, useRef } from 'react';
import webSocketService from '@/services/websocket';

type MessageHandler = (data: any) => void;
type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

/**
 * React hook for WebSocket communication
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    onOpen,
    onClose,
    onError
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const subscribedEvents = useRef<Set<string>>(new Set());
  const unsubscribeFunctions = useRef<Map<string, Map<MessageHandler, () => void>>>(new Map());

  // Track if we've already tried connecting in this component instance
  const hasConnected = useRef(false);

  // Effect to manage WebSocket connection
  useEffect(() => {
    let autoConnectTimer: ReturnType<typeof setTimeout>;
    
    // Only attempt connection if autoConnect is true and we haven't tried connecting yet
    // Add a short delay to avoid connection race conditions during initial load
    if (autoConnect && !hasConnected.current) {
      hasConnected.current = true;
      setStatus('connecting');
      
      // Small delay to let React finish rendering and avoid race conditions
      autoConnectTimer = setTimeout(() => {
        console.log('[WebSocket Hook] Auto-connecting after delay');
        
        // Attempt a connection which will trigger our onOpen event on success
        webSocketService.connect()
          .then(() => {
            setStatus('connected');
            if (onOpen) onOpen();
          })
          .catch((error) => {
            console.error('[WebSocket Hook] Connection error:', error);
            setStatus('error');
            if (onError) onError(error instanceof Event ? error : new Event('error'));
            
            // If initial auto-connect fails, try once more after a pause
            setTimeout(() => {
              console.log('[WebSocket Hook] Retrying connection once after failure');
              webSocketService.connect()
                .then(() => {
                  setStatus('connected');
                  if (onOpen) onOpen();
                })
                .catch((retryError) => {
                  console.error('[WebSocket Hook] Retry connection error:', retryError);
                  setStatus('error');
                  // Give up after one retry to avoid infinite connection loops
                });
            }, 1500); // Wait 1.5s before retry
          });
      }, 500); // Wait 0.5s before initial connection
    }

    return () => {
      // Clean up delayed auto-connect if component unmounts
      clearTimeout(autoConnectTimer);
      
      // Clean up all subscriptions
      subscribedEvents.current.forEach(eventType => {
        const handlersMap = unsubscribeFunctions.current.get(eventType);
        if (handlersMap) {
          handlersMap.forEach(unsubscribe => {
            unsubscribe();
          });
        }
      });
      
      if (!reconnect) {
        webSocketService.disconnect();
      }
    };
  }, [autoConnect, reconnect, onOpen, onClose, onError]);

  // Connect to WebSocket only if not already connected
  const connect = useCallback(() => {
    // Don't try to connect if we're already connected
    if (status === 'connected') {
      return;
    }
    
    // Create an abort timeout to avoid hanging in connecting state
    const abortTimeout = setTimeout(() => {
      if (status === 'connecting') {
        console.warn('[WebSocket Hook] Connect operation timed out after 5s');
        setStatus('error');
        if (onError) onError(new Event('timeout'));
      }
    }, 5000);
    
    setStatus('connecting');
    webSocketService.connect()
      .then(() => {
        clearTimeout(abortTimeout);
        setStatus('connected');
        if (onOpen) onOpen();
      })
      .catch((error) => {
        clearTimeout(abortTimeout);
        console.error('[WebSocket Hook] Connect error:', error);
        setStatus('error');
        if (onError) onError(error instanceof Event ? error : new Event('error'));
      });
  }, [status, onOpen, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setStatus('disconnected');
    if (onClose) onClose();
  }, [onClose]);

  // Subscribe to a specific event type
  const subscribe = useCallback((eventType: string, handler: MessageHandler) => {
    // Track the event type
    subscribedEvents.current.add(eventType);
    
    // Subscribe and get the unsubscribe function
    const unsubscribe = webSocketService.subscribe(eventType, handler);
    
    // Store the unsubscribe function for later cleanup
    if (!unsubscribeFunctions.current.has(eventType)) {
      unsubscribeFunctions.current.set(eventType, new Map());
    }
    unsubscribeFunctions.current.get(eventType)?.set(handler, unsubscribe);
    
    // Return a function to unsubscribe
    return () => {
      unsubscribe();
      unsubscribeFunctions.current.get(eventType)?.delete(handler);
      
      // If no handlers left for this event type, remove from tracking
      if (unsubscribeFunctions.current.get(eventType)?.size === 0) {
        subscribedEvents.current.delete(eventType);
        unsubscribeFunctions.current.delete(eventType);
      }
    };
  }, []);

  // Unsubscribe from a specific event type
  const unsubscribe = useCallback((eventType: string, handler: MessageHandler) => {
    const unsubscribeFunc = unsubscribeFunctions.current.get(eventType)?.get(handler);
    if (unsubscribeFunc) {
      unsubscribeFunc();
      unsubscribeFunctions.current.get(eventType)?.delete(handler);
      
      // If no handlers left for this event type, remove from tracking
      if (unsubscribeFunctions.current.get(eventType)?.size === 0) {
        subscribedEvents.current.delete(eventType);
        unsubscribeFunctions.current.delete(eventType);
      }
    }
  }, []);

  // Send a message to the server
  const send = useCallback((type: string, payload: any) => {
    webSocketService.send(type, payload);
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send
  };
}

export default useWebSocket;
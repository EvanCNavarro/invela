import { useState, useEffect, useCallback, useRef } from 'react';
import { getWebSocketService } from '@/services/websocket';

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
  const wsService = getWebSocketService();
  const subscribedEvents = useRef<Set<string>>(new Set());
  const subscribedHandlers = useRef<Map<string, Set<MessageHandler>>>(new Map());

  // Effect to manage WebSocket connection
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Update status from service
    const statusInterval = setInterval(() => {
      const currentStatus = wsService.getStatus();
      if (currentStatus !== status) {
        setStatus(currentStatus);
        
        // Trigger callbacks on status changes
        if (currentStatus === 'connected' && status !== 'connected' && onOpen) {
          onOpen();
        }
        if (currentStatus === 'disconnected' && status === 'connected' && onClose) {
          onClose();
        }
        if (currentStatus === 'error' && onError) {
          onError(new Event('error'));
        }
      }
    }, 500);

    return () => {
      // Clean up all subscriptions
      subscribedEvents.current.forEach(eventType => {
        const handlers = subscribedHandlers.current.get(eventType);
        if (handlers) {
          handlers.forEach(handler => {
            wsService.unsubscribe(eventType, handler);
          });
        }
      });
      
      clearInterval(statusInterval);
      
      if (!reconnect) {
        wsService.disconnect();
      }
    };
  }, [autoConnect, reconnect, onOpen, onClose, onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    wsService.connect();
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsService.disconnect();
  }, []);

  // Subscribe to a specific event type
  const subscribe = useCallback((eventType: string, handler: MessageHandler) => {
    wsService.subscribe(eventType, handler);
    subscribedEvents.current.add(eventType);
    
    // Track the handler for cleanup
    if (!subscribedHandlers.current.has(eventType)) {
      subscribedHandlers.current.set(eventType, new Set());
    }
    subscribedHandlers.current.get(eventType)?.add(handler);
    
    return () => {
      wsService.unsubscribe(eventType, handler);
      subscribedHandlers.current.get(eventType)?.delete(handler);
    };
  }, []);

  // Unsubscribe from a specific event type
  const unsubscribe = useCallback((eventType: string, handler: MessageHandler) => {
    wsService.unsubscribe(eventType, handler);
    subscribedHandlers.current.get(eventType)?.delete(handler);
    
    // If no handlers left for this event, remove from tracking
    if (subscribedHandlers.current.get(eventType)?.size === 0) {
      subscribedEvents.current.delete(eventType);
    }
  }, []);

  // Send a message to the server
  const send = useCallback((message: any) => {
    wsService.send(message);
  }, []);

  return {
    status,
    isConnected: wsService.isConnected(),
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send
  };
}

export default useWebSocket;
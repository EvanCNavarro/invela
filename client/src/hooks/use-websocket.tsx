/**
 * ========================================
 * WebSocket Hook - Real-time Communication Management
 * ========================================
 * 
 * Advanced WebSocket hook providing real-time communication capabilities
 * throughout the enterprise platform. Manages connection state, message
 * handling, and automatic reconnection with enterprise-grade reliability.
 * 
 * Key Features:
 * - Automatic connection management with reconnection logic
 * - Type-safe message handling and status tracking
 * - Connection state management (connecting, connected, disconnected, error)
 * - Event-driven architecture for real-time updates
 * - Comprehensive error handling and recovery
 * 
 * WebSocket Management:
 * - Auto-connect functionality for seamless user experience
 * - Message subscription and broadcasting capabilities
 * - Connection health monitoring and status reporting
 * - Graceful connection cleanup and resource management
 * - Real-time data synchronization across platform components
 * 
 * @module hooks/use-websocket
 * @version 1.0.0
 * @since 2025-05-23
 */

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
    // Only attempt connection if autoConnect is true and we haven't tried connecting yet
    if (autoConnect && !hasConnected.current) {
      hasConnected.current = true;
      setStatus('connecting');
      
      // Attempt a connection which will trigger our onOpen event on success
      webSocketService.connect()
        .then(() => {
          setStatus('connected');
          if (onOpen) onOpen();
        })
        .catch((error) => {
          setStatus('error');
          if (onError) onError(error);
        });
    }

    return () => {
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
    
    setStatus('connecting');
    webSocketService.connect()
      .then(() => {
        setStatus('connected');
        if (onOpen) onOpen();
      })
      .catch((error) => {
        setStatus('error');
        if (onError) onError(error);
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
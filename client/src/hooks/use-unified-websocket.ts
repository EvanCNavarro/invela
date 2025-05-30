/**
 * ========================================
 * Unified WebSocket Hook
 * ========================================
 * 
 * React hook that provides unified WebSocket functionality across all components.
 * Replaces multiple competing hooks to eliminate race conditions.
 * 
 * Key Features:
 * - Single connection management
 * - Automatic subscription cleanup
 * - Connection status monitoring
 * - Type-safe message handling
 * 
 * @module hooks/use-unified-websocket
 * @version 1.0.0
 * @since 2025-05-30
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedWebSocketService, type MessageHandler, type ConnectionStatus } from '@/services/websocket-unified';

// ========================================
// HOOK INTERFACE
// ========================================

interface UseUnifiedWebSocketReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  subscribe: (messageType: string, handler: MessageHandler) => void;
  unsubscribe: (messageType: string, handler: MessageHandler) => void;
  send: (type: string, data?: any) => boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// ========================================
// UNIFIED WEBSOCKET HOOK
// ========================================

export function useUnifiedWebSocket(): UseUnifiedWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const subscriptionsRef = useRef<Map<string, Map<MessageHandler, () => void>>>(new Map());
  
  // ========================================
  // STATUS MONITORING
  // ========================================
  
  useEffect(() => {
    // Initial status
    setStatus(unifiedWebSocketService.getStatus());
    
    // Monitor status changes by subscribing to connection events
    const statusCheckInterval = setInterval(() => {
      const currentStatus = unifiedWebSocketService.getStatus();
      setStatus(currentStatus);
    }, 1000);
    
    return () => {
      clearInterval(statusCheckInterval);
    };
  }, []);
  
  // ========================================
  // SUBSCRIPTION MANAGEMENT
  // ========================================
  
  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    // Get or create subscription map for this message type
    if (!subscriptionsRef.current.has(messageType)) {
      subscriptionsRef.current.set(messageType, new Map());
    }
    
    const handlersMap = subscriptionsRef.current.get(messageType)!;
    
    // Subscribe to the service and store the unsubscribe function
    const unsubscribeFromService = unifiedWebSocketService.subscribe(messageType, handler);
    handlersMap.set(handler, unsubscribeFromService);
  }, []);
  
  const unsubscribe = useCallback((messageType: string, handler: MessageHandler) => {
    const handlersMap = subscriptionsRef.current.get(messageType);
    if (handlersMap) {
      const unsubscribeFromService = handlersMap.get(handler);
      if (unsubscribeFromService) {
        unsubscribeFromService();
        handlersMap.delete(handler);
        
        // Clean up empty message type maps
        if (handlersMap.size === 0) {
          subscriptionsRef.current.delete(messageType);
        }
      }
    }
  }, []);
  
  // ========================================
  // CONNECTION METHODS
  // ========================================
  
  const connect = useCallback(async () => {
    try {
      await unifiedWebSocketService.connect();
      setStatus(unifiedWebSocketService.getStatus());
    } catch (error) {
      console.error('[useUnifiedWebSocket] Connection failed:', error);
      setStatus('error');
    }
  }, []);
  
  const disconnect = useCallback(() => {
    unifiedWebSocketService.disconnect();
    setStatus('disconnected');
  }, []);
  
  const send = useCallback((type: string, data?: any) => {
    return unifiedWebSocketService.send(type, data);
  }, []);
  
  // ========================================
  // CLEANUP
  // ========================================
  
  useEffect(() => {
    return () => {
      // Clean up all subscriptions when component unmounts
      subscriptionsRef.current.forEach((handlersMap) => {
        handlersMap.forEach((unsubscribeFromService) => {
          unsubscribeFromService();
        });
      });
      subscriptionsRef.current.clear();
    };
  }, []);
  
  // ========================================
  // RETURN INTERFACE
  // ========================================
  
  return {
    status,
    isConnected: status === 'connected',
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect
  };
}
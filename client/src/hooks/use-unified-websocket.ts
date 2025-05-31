/**
 * Unified WebSocket Hook
 * 
 * Provides a centralized interface for WebSocket communication throughout the application.
 * Handles connection management, message subscription, and automatic reconnection.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { userContext } from '@/lib/user-context';

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

type MessageHandler = (data: any) => void;

export function useUnifiedWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('[WebSocket] Connected to unified WebSocket server');
      
      // For now, authenticate with stored user data
      const companyId = userContext.getCompanyId();
      
      if (companyId) {
        const authMessage = {
          type: 'authenticate',
          userId: 536, // Using demo user ID for now
          companyId: companyId,
          timestamp: new Date().toISOString()
        };
        
        wsRef.current?.send(JSON.stringify(authMessage));
      }
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        const handlers = subscriptionsRef.current.get(message.type);
        
        if (handlers) {
          handlers.forEach(handler => handler(message.payload));
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('[WebSocket] Connection closed, attempting to reconnect...');
      setTimeout(connect, 3000);
    };

    wsRef.current.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
    };
  }, []);

  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    if (!subscriptionsRef.current.has(messageType)) {
      subscriptionsRef.current.set(messageType, new Set());
    }
    
    subscriptionsRef.current.get(messageType)?.add(handler);

    // Return unsubscribe function
    return () => {
      subscriptionsRef.current.get(messageType)?.delete(handler);
    };
  }, []);

  const unsubscribe = useCallback((messageType: string, handler: MessageHandler) => {
    subscriptionsRef.current.get(messageType)?.delete(handler);
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    subscribe,
    unsubscribe
  };
}
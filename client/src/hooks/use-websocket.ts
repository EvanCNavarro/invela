/**
 * WebSocket Hook
 * 
 * This hook provides access to the WebSocket connection
 * and handles reconnection logic.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 3000; // 3 seconds

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      // Determine WebSocket URL from current window location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      
      // Create new WebSocket connection
      const ws = new WebSocket(wsUrl);
      
      // Setup event handlers
      ws.onopen = () => {
        console.log('[WebSocket] Connection established');
        setIsConnected(true);
        setSocket(ws);
        reconnectAttemptsRef.current = 0;
        
        // Send a ping every 30 seconds to keep the connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
            console.log('[WebSocket] Sending ping');
          }
        }, 30000);
        
        // Store the interval ID for cleanup
        (ws as any).pingInterval = pingInterval;
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', data);
          setLastMessage(data);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        console.error('%c[WebSocket] Error:', 'color: #F44336', {
          error,
          connectionId: `ws_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          timestamp: new Date().toISOString()
        });
      };
      
      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear ping interval
        if ((ws as any).pingInterval) {
          clearInterval((ws as any).pingInterval);
        }
        
        // Reconnect if not closed cleanly and within max attempts
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          
          // Exponential backoff with jitter
          const delay = Math.min(
            baseReconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current) * (0.9 + Math.random() * 0.2),
            30000 // Cap at 30 seconds
          );
          
          console.log(`[WebSocket] Scheduling reconnection attempt in ${Math.round(delay / 1000)} seconds...`);
          
          // Schedule reconnection
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
      
      return ws;
    } catch (error) {
      console.error('[WebSocket] Error setting up connection:', error);
      return null;
    }
  }, []);
  
  // Send a message through WebSocket
  const sendMessage = useCallback((type: string, payload: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }, [socket]);
  
  // Initial connection
  useEffect(() => {
    const ws = connect();
    
    // Cleanup on unmount
    return () => {
      if (ws) {
        if ((ws as any).pingInterval) {
          clearInterval((ws as any).pingInterval);
        }
        ws.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
  
  return {
    socket,
    isConnected,
    lastMessage,
    sendMessage,
    reconnect: connect
  };
}

export default useWebSocket;
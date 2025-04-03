import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  connected: boolean;
  error: Error | null;
}

const RECONNECT_DELAY = 2000;
const MAX_RETRIES = 3;

// Singleton instance to track global connection state
let globalSocket: WebSocket | null = null;
let connectionPromise: Promise<void> | null = null;
let activeSubscribers = 0;

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempt = useRef(0);
  const queryClient = useQueryClient();
  const mounted = useRef(true);

  const connect = useCallback(() => {
    if (!mounted.current) return;

    // If we already have a connection promise, wait for it
    if (connectionPromise) {
      connectionPromise.then(() => {
        if (mounted.current && globalSocket) {
          setSocket(globalSocket);
          setConnected(globalSocket.readyState === WebSocket.OPEN);
        }
      });
      return;
    }

    // If we already have a global socket that's connected, use it
    if (globalSocket?.readyState === WebSocket.OPEN) {
      setSocket(globalSocket);
      setConnected(true);
      return;
    }

    // Create new connection
    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
      console.log('[WebSocket] Creating new connection:', {
        url: wsUrl,
        activeSubscribers: activeSubscribers + 1,
        timestamp: new Date().toISOString()
      });

      const ws = new WebSocket(wsUrl);
      globalSocket = ws;

      connectionPromise = new Promise((resolve) => {
        ws.onopen = () => {
          if (!mounted.current) {
            ws.close();
            return;
          }
          console.log('[WebSocket] Connected successfully');
          setConnected(true);
          setError(null);
          reconnectAttempt.current = 0;
          resolve();
          connectionPromise = null;

          // Send initial ping
          ws.send(JSON.stringify({ type: 'ping' }));
        };
      });

      ws.onclose = (event) => {
        if (!mounted.current) return;

        console.log('[WebSocket] Connection closed:', {
          code: event.code,
          reason: event.reason,
          activeSubscribers,
          timestamp: new Date().toISOString()
        });

        setConnected(false);
        globalSocket = null;
        connectionPromise = null;

        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempt.current < MAX_RETRIES) {
          setTimeout(() => {
            if (mounted.current) {
              reconnectAttempt.current++;
              connect();
            }
          }, RECONNECT_DELAY);
        }
      };

      ws.onerror = (event) => {
        if (!mounted.current) return;
        console.error('[WebSocket] Connection error:', event);
        setError(new Error('Connection error. Please check your internet connection.'));
      };

      ws.onmessage = (event) => {
        if (!mounted.current) return;

        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', data);

          if (data.type === 'task_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          } else if (data.type === 'file_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/files'] });
          } else if (data.type === 'pong') {
            console.log('[WebSocket] Received pong');
          }
        } catch (err) {
          console.error('[WebSocket] Message parse error:', err);
        }
      };

      setSocket(ws);
      activeSubscribers++;

    } catch (err) {
      console.error('[WebSocket] Setup error:', err);
      setError(err as Error);
      connectionPromise = null;
    }
  }, [queryClient]);

  useEffect(() => {
    mounted.current = true;
    connect();

    return () => {
      mounted.current = false;
      activeSubscribers--;

      console.log('[WebSocket] Component unmounting:', {
        remainingSubscribers: activeSubscribers,
        timestamp: new Date().toISOString()
      });

      // Only close the global socket if no subscribers remain
      if (activeSubscribers === 0 && globalSocket) {
        console.log('[WebSocket] Closing global connection - no active subscribers');
        globalSocket.close();
        globalSocket = null;
      }
    };
  }, [connect]);

  return { socket, connected, error };
}
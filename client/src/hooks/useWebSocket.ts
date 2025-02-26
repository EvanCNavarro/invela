import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  connected: boolean;
  error: Error | null;
}

const RECONNECT_DELAY = 2000;
const MAX_RETRIES = 3;

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempt = useRef(0);
  const queryClient = useQueryClient();
  const mounted = useRef(true);

  const connect = useCallback(() => {
    if (!mounted.current || socket?.readyState === WebSocket.CONNECTING) return;

    // Close existing socket if any
    if (socket) {
      socket.close();
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!mounted.current) {
          ws.close();
          return;
        }
        console.log('[WebSocket] Connected successfully');
        setConnected(true);
        setError(null);
        reconnectAttempt.current = 0;
      };

      ws.onclose = (event) => {
        if (!mounted.current) return;

        setConnected(false);
        console.log(`[WebSocket] Connection closed (${event.code})`);

        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempt.current < MAX_RETRIES) {
          setTimeout(() => {
            if (mounted.current) {
              reconnectAttempt.current++;
              connect();
            }
          }, RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        if (!mounted.current) return;
        setError(new Error('Connection error. Please check your internet connection.'));
      };

      ws.onmessage = (event) => {
        if (!mounted.current) return;

        try {
          const data = JSON.parse(event.data);
          if (data.type === 'task_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          } else if (data.type === 'file_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/files'] });
          }
        } catch (err) {
          console.error('[WebSocket] Message parse error:', err);
        }
      };

      setSocket(ws);
    } catch (err) {
      console.error('[WebSocket] Setup error:', err);
      setError(err as Error);
    }
  }, [socket, queryClient]);

  useEffect(() => {
    mounted.current = true;
    connect();

    return () => {
      mounted.current = false;
      if (socket) {
        socket.close();
      }
    };
  }, [connect]);

  return { socket, connected, error };
}
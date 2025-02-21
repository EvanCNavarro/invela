import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  connected: boolean;
  error: Error | null;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRIES = 5;
const PING_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 10000;

// Add jitter to prevent thundering herd problem
const getBackoffDelay = (attempt: number) => {
  const delay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  return delay + Math.random() * 1000; // Add up to 1 second of jitter
};

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempt = useRef(0);
  const pingTimer = useRef<NodeJS.Timeout>();
  const pongReceived = useRef(true);
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = undefined;
    }

    if (socket) {
      // Only attempt to close if socket is in OPEN or CONNECTING state
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }

    if (mountedRef.current) {
      setSocket(null);
      setConnected(false);
    }
  }, [socket]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    cleanup();

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      let connectionTimeoutId: NodeJS.Timeout;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }

        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
        }

        setConnected(true);
        setError(null);
        reconnectAttempt.current = 0;
        pongReceived.current = true;

        // Start ping interval
        pingTimer.current = setInterval(() => {
          if (!pongReceived.current) {
            cleanup();
            if (mountedRef.current) {
              connect();
            }
            return;
          }

          pongReceived.current = false;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        cleanup();

        if (event.code !== 1000 && event.code !== 1001) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[WebSocket] Connection closed (${event.code})`);
          }
        }

        if (reconnectAttempt.current < MAX_RETRIES) {
          const delay = getBackoffDelay(reconnectAttempt.current);
          setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
          reconnectAttempt.current++;
        } else {
          setError(new Error('Connection lost. Please refresh the page.'));
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;

        if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
          setError(new Error('Connection error. Please check your internet connection.'));
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'pong':
              pongReceived.current = true;
              break;
            case 'task_update':
              queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
              break;
            case 'file_update':
              queryClient.invalidateQueries({ queryKey: ['/api/files'] });
              break;
          }
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[WebSocket] Message parse error:', err);
          }
        }
      };

      setSocket(ws);

      // Set connection timeout
      connectionTimeoutId = setTimeout(() => {
        if (mountedRef.current && !connected) {
          cleanup();
          if (reconnectAttempt.current < MAX_RETRIES) {
            connect();
          }
        }
      }, CONNECTION_TIMEOUT);

    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[WebSocket] Setup error:', err);
      }
      setError(err as Error);
    }
  }, [cleanup, queryClient]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [connect, cleanup]);

  return { socket, connected, error };
}
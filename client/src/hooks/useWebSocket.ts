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
  const cleanupInProgress = useRef(false);
  const queryClient = useQueryClient();

  const cleanup = useCallback(() => {
    if (cleanupInProgress.current) return;
    cleanupInProgress.current = true;

    try {
      if (pingTimer.current) {
        clearInterval(pingTimer.current);
        pingTimer.current = undefined;
      }

      if (socket) {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
        setSocket(null);
      }

      setConnected(false);
    } finally {
      cleanupInProgress.current = false;
    }
  }, [socket]);

  const connect = useCallback(() => {
    if (cleanupInProgress.current) return;

    try {
      cleanup();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      let connectionTimeoutId: NodeJS.Timeout;

      ws.onopen = () => {
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
        }

        setConnected(true);
        setError(null);
        reconnectAttempt.current = 0;
        pongReceived.current = true;

        pingTimer.current = setInterval(() => {
          if (!pongReceived.current) {
            cleanup();
            connect();
            return;
          }

          pongReceived.current = false;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.onclose = (event) => {
        if (cleanupInProgress.current) return;

        cleanup();

        if (event.code !== 1000 && event.code !== 1001) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[WebSocket] Connection closed (${event.code})`);
          }
        }

        if (reconnectAttempt.current < MAX_RETRIES) {
          const delay = getBackoffDelay(reconnectAttempt.current);
          setTimeout(connect, delay);
          reconnectAttempt.current++;
        } else {
          setError(new Error('Connection lost. Please refresh the page.'));
        }
      };

      ws.onerror = () => {
        if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
          setError(new Error('Connection error. Please check your internet connection.'));
        }
      };

      ws.onmessage = (event) => {
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
          // Only log parse errors in development
          if (process.env.NODE_ENV === 'development') {
            console.error('[WebSocket] Message parse error');
          }
        }
      };

      setSocket(ws);

      connectionTimeoutId = setTimeout(() => {
        if (!connected) {
          cleanup();
          if (reconnectAttempt.current < MAX_RETRIES) {
            connect();
          }
        }
      }, CONNECTION_TIMEOUT);

      return () => {
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
        }
      };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[WebSocket] Setup error');
      }
      setError(err as Error);
    }
  }, [cleanup, connected, queryClient]);

  useEffect(() => {
    connect();
    return () => {
      cleanup();
    };
  }, [connect, cleanup]);

  return { socket, connected, error };
}
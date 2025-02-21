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
        // Only attempt to close if the socket is not already closing or closed
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

        // Start ping interval
        pingTimer.current = setInterval(() => {
          if (!pongReceived.current) {
            console.debug('[WebSocket] No pong received, reconnecting...');
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
        // Don't attempt to reconnect if we're cleaning up
        if (cleanupInProgress.current) return;

        console.debug('[WebSocket] Connection closed:', event.code);
        cleanup();

        if (reconnectAttempt.current < MAX_RETRIES) {
          const delay = getBackoffDelay(reconnectAttempt.current);
          console.debug(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempt.current + 1}/${MAX_RETRIES})`);
          setTimeout(connect, delay);
          reconnectAttempt.current++;
        } else {
          setError(new Error('Max reconnection attempts reached'));
        }
      };

      ws.onerror = (event) => {
        console.debug('[WebSocket] Error occurred:', event);
        setError(new Error('WebSocket connection error'));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'pong':
              pongReceived.current = true;
              break;
            case 'connection_established':
              console.debug('[WebSocket] Connection established:', data.data);
              break;
            case 'task_update':
              queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
              break;
            case 'file_update':
              queryClient.invalidateQueries({ queryKey: ['/api/files'] });
              break;
            default:
              console.debug('[WebSocket] Message received:', data);
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      setSocket(ws);

      // Set connection timeout
      connectionTimeoutId = setTimeout(() => {
        if (!connected) {
          console.debug('[WebSocket] Connection timeout');
          cleanup();
          // Only attempt to reconnect if we haven't exceeded max retries
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
      console.error('[WebSocket] Setup error:', err);
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
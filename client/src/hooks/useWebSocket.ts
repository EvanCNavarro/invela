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

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempt = useRef(0);
  const pingTimer = useRef<NodeJS.Timeout>();
  const pongReceived = useRef(true);
  const queryClient = useQueryClient();

  const cleanup = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
    }
    if (socket) {
      socket.close();
    }
    setSocket(null);
    setConnected(false);
  }, [socket]);

  const connect = useCallback(() => {
    try {
      cleanup();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempt.current = 0;

        // Start ping interval
        pingTimer.current = setInterval(() => {
          if (!pongReceived.current) {
            console.debug('[WebSocket] No pong received, reconnecting...');
            cleanup();
            connect();
            return;
          }
          pongReceived.current = false;
          ws.send(JSON.stringify({ type: 'ping' }));
        }, PING_INTERVAL);
      };

      ws.onclose = (event) => {
        console.debug('[WebSocket] Connection closed:', event.code);
        cleanup();

        if (reconnectAttempt.current < MAX_RETRIES) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttempt.current),
            MAX_RETRY_DELAY
          );
          console.debug(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempt.current + 1}/${MAX_RETRIES})`);
          setTimeout(connect, delay);
          reconnectAttempt.current++;
        } else {
          setError(new Error('Max reconnection attempts reached'));
        }
      };

      ws.onerror = () => {
        setError(new Error('WebSocket connection error'));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
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
      const timeout = setTimeout(() => {
        if (!connected) {
          console.debug('[WebSocket] Connection timeout');
          cleanup();
          connect();
        }
      }, CONNECTION_TIMEOUT);

      return () => clearTimeout(timeout);
    } catch (err) {
      console.error('[WebSocket] Setup error:', err);
      setError(err as Error);
    }
  }, [cleanup, connected, queryClient]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return { socket, connected, error };
}
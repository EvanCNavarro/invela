import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  connected: boolean;
  error: Error | null;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRIES = 5;

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempt = useRef(0);
  const pingInterval = useRef<number>();
  const pongTimeout = useRef<number>();
  const connectTimeout = useRef<number>();

  const resetTimers = () => {
    if (pingInterval.current) clearInterval(pingInterval.current);
    if (pongTimeout.current) clearTimeout(pongTimeout.current);
    if (connectTimeout.current) clearTimeout(connectTimeout.current);
  };

  const connect = useCallback(() => {
    try {
      resetTimers();

      // Always use /ws path
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('[WebSocket] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      let pongReceived = false;

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        setConnected(true);
        setError(null);
        reconnectAttempt.current = 0;

        // Setup ping/pong heartbeat
        pingInterval.current = window.setInterval(() => {
          if (!pongReceived) {
            console.log('[WebSocket] No pong received, reconnecting...');
            ws.close();
            return;
          }
          pongReceived = false;
          ws.send(JSON.stringify({ type: 'ping' }));
        }, 30000);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setConnected(false);
        resetTimers();

        // Implement exponential backoff for reconnection
        if (reconnectAttempt.current < MAX_RETRIES) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttempt.current),
            MAX_RETRY_DELAY
          );
          console.log(`[WebSocket] Attempting to reconnect (${reconnectAttempt.current + 1}/${MAX_RETRIES})...`);
          setTimeout(connect, delay);
          reconnectAttempt.current++;
        } else {
          setError(new Error('Max reconnection attempts reached'));
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setError(new Error('WebSocket connection error'));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', data);

          // Handle pong responses
          if (data.type === 'pong') {
            pongReceived = true;
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      setSocket(ws);

      // Set connection timeout
      connectTimeout.current = window.setTimeout(() => {
        if (!connected) {
          console.log('[WebSocket] Connection timeout, closing socket');
          ws.close();
        }
      }, 10000);

    } catch (err) {
      console.error('[WebSocket] Setup error:', err);
      setError(err as Error);
    }
  }, [connected]);

  useEffect(() => {
    connect();
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      resetTimers();
    };
  }, [connect]);

  return { socket, connected, error };
}
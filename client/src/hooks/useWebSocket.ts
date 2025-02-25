/**
 * @file useWebSocket.ts
 * @description Custom React hook for WebSocket communication.
 * Manages WebSocket connection lifecycle and message handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { 
  WebSocketMessage,
  TaskUpdateMessage,
  FileUpdateMessage
} from '@shared/types/websocket';
import { queryKeys } from '@/lib/queryClient';

/**
 * Return type for the useWebSocket hook.
 */
interface UseWebSocketReturn {
  socket: WebSocket | null;
  connected: boolean;
  error: Error | null;
}

// Configuration constants
const RECONNECT_DELAY = 2000; // 2 seconds
const MAX_RETRIES = 3;

/**
 * React hook for WebSocket communication.
 * Handles connection establishment, reconnection, and message processing.
 * 
 * @returns Object containing socket instance, connection status, and error state
 */
export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempt = useRef(0);
  const queryClient = useQueryClient();
  const mounted = useRef(true);

  /**
   * Establishes a WebSocket connection.
   * Handles connection events and message processing.
   */
  const connect = useCallback(() => {
    if (!mounted.current || socket?.readyState === WebSocket.CONNECTING) return;

    // Close existing socket if any
    if (socket) {
      console.log('[WebSocket] Closing existing connection before reconnect');
      socket.close();
    }

    try {
      // Determine WebSocket URL based on current protocol (ws or wss)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log(`[WebSocket] Connecting to ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      // Handle successful connection
      ws.onopen = () => {
        if (!mounted.current) {
          console.log('[WebSocket] Component unmounted during connection, closing socket');
          ws.close();
          return;
        }
        console.log('[WebSocket] Connected successfully');
        setConnected(true);
        setError(null);
        reconnectAttempt.current = 0;
      };

      // Handle connection close
      ws.onclose = (event) => {
        if (!mounted.current) return;

        setConnected(false);
        console.log(`[WebSocket] Connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`);

        // Attempt reconnection for non-normal closures
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempt.current < MAX_RETRIES) {
          console.log(`[WebSocket] Attempting reconnect ${reconnectAttempt.current + 1}/${MAX_RETRIES} in ${RECONNECT_DELAY}ms`);
          setTimeout(() => {
            if (mounted.current) {
              reconnectAttempt.current++;
              connect();
            }
          }, RECONNECT_DELAY);
        } else if (reconnectAttempt.current >= MAX_RETRIES) {
          console.log('[WebSocket] Max reconnection attempts reached');
        }
      };

      // Handle connection errors
      ws.onerror = (event) => {
        if (!mounted.current) return;
        console.error('[WebSocket] Connection error:', event);
        setError(new Error('Connection error. Please check your internet connection.'));
      };

      // Handle incoming messages
      ws.onmessage = (event) => {
        if (!mounted.current) return;

        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          console.log(`[WebSocket] Received message: ${data.type}`);
          
          switch (data.type) {
            case 'task_update':
              const taskUpdate = data as TaskUpdateMessage;
              console.log('[WebSocket] Task update:', {
                id: taskUpdate.data.id,
                status: taskUpdate.data.status,
                progress: taskUpdate.data.progress
              });
              
              // Invalidate relevant queries
              queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
              queryClient.invalidateQueries({ 
                queryKey: queryKeys.task(taskUpdate.data.id)
              });
              console.log('[WebSocket] Invalidated task queries');
              break;
              
            case 'file_update':
              const fileUpdate = data as FileUpdateMessage;
              console.log('[WebSocket] File update:', {
                id: fileUpdate.data.id,
                fileName: fileUpdate.data.file_name,
                status: fileUpdate.data.status
              });
              
              // Invalidate relevant queries
              queryClient.invalidateQueries({ queryKey: queryKeys.files() });
              queryClient.invalidateQueries({ 
                queryKey: queryKeys.file(fileUpdate.data.id)
              });
              console.log('[WebSocket] Invalidated file queries');
              break;
              
            case 'ping':
              // Send pong response
              console.log('[WebSocket] Received ping, sending pong');
              ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
              break;
              
            case 'error':
              console.error('[WebSocket] Server error:', data.error?.message);
              break;
              
            case 'connection_established':
              console.log('[WebSocket] Connection established at:', data.data?.timestamp);
              break;
              
            default:
              console.log('[WebSocket] Unhandled message type:', data.type);
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

  // Set up connection on mount and clean up on unmount
  useEffect(() => {
    console.log('[WebSocket] Initializing WebSocket hook');
    mounted.current = true;
    connect();

    return () => {
      console.log('[WebSocket] Cleaning up WebSocket connection');
      mounted.current = false;
      if (socket) {
        socket.close();
      }
    };
  }, [connect]);

  return { socket, connected, error };
}
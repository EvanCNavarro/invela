import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// Define message types that can be received from the server
type WebSocketMessageType = 
  | 'connection_established' 
  | 'task_update' 
  | 'ping' 
  | 'pong'
  | 'task_test_notification'
  | string;

interface WebSocketPayload {
  [key: string]: any;
}

interface WebSocketMessage {
  type: WebSocketMessageType;
  payload?: WebSocketPayload;
}

interface TaskUpdatePayload {
  id: number;
  status: string;
  progress: number;
  metadata?: Record<string, any>;
}

interface WebSocketContextType {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (type: string, payload?: any) => void;
  lastTaskUpdate: TaskUpdatePayload | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  lastMessage: null,
  sendMessage: () => {},
  lastTaskUpdate: null
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [lastTaskUpdate, setLastTaskUpdate] = useState<TaskUpdatePayload | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const toast = useToast();
  
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // Create a WebSocket connection with the proper protocol based on the current URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log('[WebSocket] Connecting to:', wsUrl);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log('[WebSocket] Connection established');
          setConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            console.log('[WebSocket] Received message:', message);
            
            // Store the last message
            setLastMessage(message);
            
            // Handle specific message types
            if (message.type === 'task_update' && message.payload) {
              // Update the last task update state
              setLastTaskUpdate(message.payload as TaskUpdatePayload);
              
              // Show a toast notification for important updates
              if (message.payload.metadata?.testNotification) {
                // Show task update notification
                console.log(`[WebSocket] Task update notification: Task #${message.payload.id} - Progress: ${message.payload.progress}%, Status: ${message.payload.status}`);
              }
            } else if (message.type === 'task_test_notification') {
              // Log test notifications
              console.log(`[WebSocket] Test notification received: ${message.payload?.message || 'Received test notification'}`);
            }
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        socket.onclose = (event) => {
          console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
          setConnected(false);
          
          // Attempt to reconnect after a delay
          setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };

        socket.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
        };

        // Set up a ping interval to keep the connection alive
        const pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        // Clean up on unmount
        return () => {
          clearInterval(pingInterval);
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        };
      } catch (error) {
        console.error('[WebSocket] Setup error:', error);
        return () => {}; // Return empty cleanup function
      }
    };

    const cleanup = connectWebSocket();
    return cleanup;
  }, [toast]);

  const sendMessage = (type: string, payload?: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WebSocket] Cannot send message - socket not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ connected, lastMessage, sendMessage, lastTaskUpdate }}>
      {children}
    </WebSocketContext.Provider>
  );
};
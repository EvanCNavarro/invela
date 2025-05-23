/**
 * ========================================
 * WebSocket Context Provider
 * ========================================
 * 
 * React context providing WebSocket connectivity and real-time communication
 * capabilities throughout the enterprise risk assessment platform. Manages
 * connection state, message handling, and automatic reconnection functionality.
 * 
 * @module contexts/WebSocketContext
 * @version 1.0.0
 * @since 2025-05-23
 */

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

// Define message types that can be received from the server
type WebSocketMessageType = 
  | 'connection_established' 
  | 'task_update' 
  | 'ping' 
  | 'pong'
  | 'task_test_notification'
  | 'form_submitted'
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

interface FormSubmissionPayload {
  taskId: number;
  formType: string;
  status: string;
  companyId: number;
  details?: string;
  fileId?: number;
  fileName?: string;
  unlockedTabs?: string[];
  unlockedTasks?: number[];
  timestamp: string;
}

interface WebSocketContextType {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (type: string, payload?: any) => void;
  lastTaskUpdate: TaskUpdatePayload | null;
  lastFormSubmission: FormSubmissionPayload | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  lastMessage: null,
  sendMessage: () => {},
  lastTaskUpdate: null,
  lastFormSubmission: null
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [lastTaskUpdate, setLastTaskUpdate] = useState<TaskUpdatePayload | null>(null);
  const [lastFormSubmission, setLastFormSubmission] = useState<FormSubmissionPayload | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // Create a WebSocket connection with the proper protocol based on the current URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log('[WebSocket] Connecting to:', wsUrl);
        
        // Safely create WebSocket connection with error handling
        let socket: WebSocket;
        try {
          socket = new WebSocket(wsUrl);
          socketRef.current = socket;
        } catch (connectionError) {
          console.error('[WebSocket] Failed to establish connection:', connectionError);
          // Don't attempt to connect again if there's a connection error
          // This prevents the DOMException from repeatedly occurring
          return () => {};
        }

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
            } else if (message.type === 'form_submitted' && message.payload) {
              // Handle form submission events
              console.log(`[WebSocket] Form submission event received:`, message.payload);
              setLastFormSubmission(message.payload as FormSubmissionPayload);
              
              // Show form submission notification
              console.log(`[WebSocket] Form submission notification: Task #${message.payload.taskId} - Form type: ${message.payload.formType}, Status: ${message.payload.status}`);
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
          
          // Only attempt to reconnect for appropriate close codes
          // 1000 = Normal closure (don't reconnect)
          // 1001 = Going away (client navigated away)
          // 1006 = Abnormal closure (should attempt reconnection)
          if (event.code !== 1000 && event.code !== 1001) {
            console.log(`[WebSocket] Scheduling reconnection attempt in 3 seconds...`);
            setTimeout(() => {
              connectWebSocket();
            }, 3000);
          } else {
            console.log(`[WebSocket] Not reconnecting due to clean closure code: ${event.code}`);
          }
        };

        socket.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
          console.error('%c[WebSocket] Error:', 'color: #F44336', {
            error,
            connectionId: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`,
            timestamp: new Date().toISOString(),
          });
          
          // Don't immediately try to reconnect on error
          // The onclose handler will be called after an error and handle reconnection
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
  }, []);

  const sendMessage = (type: string, payload?: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WebSocket] Cannot send message - socket not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ connected, lastMessage, sendMessage, lastTaskUpdate, lastFormSubmission }}>
      {children}
    </WebSocketContext.Provider>
  );
};
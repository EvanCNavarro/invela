import { useState, useEffect, useCallback, useRef } from 'react';

type MessageType = 'text' | 'connection_established' | 'ping' | 'pong';

export interface WebSocketMessage {
  type: MessageType;
  data?: any;
  sender?: string;
  timestamp?: string;
  content?: string;
}

export const useWebSocket = () => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      setError(null);
      console.log('WebSocket connected');
    };

    socket.onclose = (event) => {
      setConnected(false);
      console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
      
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          console.log('Attempting to reconnect WebSocket...');
          // The component will unmount and remount, which will trigger a new connection attempt
          setError('Disconnected. Attempting to reconnect...');
        }
      }, 5000);
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Error connecting to chat server. Please try again later.');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle different message types
        if (message.type === 'connection_established') {
          console.log('Connection established with server');
        } else if (message.type === 'ping') {
          // Respond to pings automatically
          socket.send(JSON.stringify({ type: 'pong' }));
        } else if (message.type === 'text') {
          // Add the message to our state
          setMessages((prevMessages) => [...prevMessages, {
            ...message,
            timestamp: message.timestamp || new Date().toISOString()
          }]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    // Clean up on unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  // Function to send a chat message
  const sendMessage = useCallback((content: string, sender: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to chat server');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'text',
        content,
        sender,
        timestamp: new Date().toISOString()
      };

      socketRef.current.send(JSON.stringify(message));
      
      // Add the message to our local state immediately
      setMessages((prevMessages) => [...prevMessages, message]);
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return false;
    }
  }, []);

  return {
    messages,
    connected,
    error,
    sendMessage
  };
};
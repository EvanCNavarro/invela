import { useState, useEffect, useCallback, useRef } from 'react';
import { wsService } from '@/lib/websocket';

type MessageType = 'text' | 'connection_established' | 'ping' | 'pong';

export interface WebSocketMessage {
  type: MessageType;
  data?: any;
  sender?: string;
  timestamp?: string;
  content?: string;
}

/**
 * IMPORTANT: This hook is deprecated. Use the wsService from @/lib/websocket.ts instead. 
 * This separate implementation causes duplicate WebSocket connections.
 * 
 * This exists for backward compatibility only and will be removed in the future.
 */
export const useWebSocket = () => {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use the singleton WebSocket service instead of creating a new connection
  useEffect(() => {
    // Mark as using WebSocket services
    let unsubscribeFunc: (() => void) | null = null;
    
    setConnected(true);
    // Using a proper logger would be overkill for a deprecated hook
    // Just leave a small debug message to indicate usage
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Deprecated] Using shared WebSocket connection (compatibility mode)');
    }
    
    // Subscribe to text messages through the shared service
    const subscribeToMessages = async () => {
      try {
        unsubscribeFunc = await wsService.subscribe('text', (data) => {
          setMessages((prevMessages) => [...prevMessages, {
            type: 'text',
            ...data,
            timestamp: data.timestamp || new Date().toISOString()
          }]);
        });
      } catch (err) {
        // Keep simple error handling in deprecated hook
        setError('Failed to connect to chat server');
      }
    };
    
    subscribeToMessages();
    
    // Clean up subscription on unmount
    return () => {
      if (unsubscribeFunc) {
        unsubscribeFunc();
      }
    };
  }, []);

  // Send messages through the shared service - returns a promise for better error handling
  const sendMessage = useCallback(async (content: string, sender: string) => {
    try {
      const message: WebSocketMessage = {
        type: 'text',
        content,
        sender,
        timestamp: new Date().toISOString()
      };

      // Use await to properly handle any errors from the send operation
      await wsService.send('text', message);
      
      // Add the message to our local state immediately
      setMessages((prevMessages) => [...prevMessages, message]);
      return true;
    } catch (err) {
      // Still set error state but avoid console logging in deprecated hook
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
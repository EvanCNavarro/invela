import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';

interface WebSocketContextType {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (eventType: string, handler: (data: any) => void) => () => void;
  unsubscribe: (eventType: string, handler: (data: any) => void) => void;
  send: (type: string, payload: any) => void;
}

const defaultContext: WebSocketContextType = {
  status: 'disconnected',
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  subscribe: () => () => {},
  unsubscribe: () => {},
  send: () => {}, // Actually takes two args, but TS is happier with this declaration
};

const WebSocketContext = createContext<WebSocketContextType>(defaultContext);

export const useWebSocketContext = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
  showNotifications?: boolean;
}

export function WebSocketProvider({ 
  children, 
  showNotifications = true 
}: WebSocketProviderProps) {
  const [connectionLost, setConnectionLost] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [suppressNotifications, setSuppressNotifications] = useState(false);
  const { user } = useAuth(); // Access auth context to connect only when logged in
  
  // Initialize WebSocket hook with delayed auto-connect
  const websocket = useWebSocket({
    autoConnect: false, // We'll handle connection manually
    reconnect: true,
    onOpen: () => {
      console.log("[WebSocket] Connection established");
      setConnectionAttempts(0);
      
      // Show reconnection toast if we previously lost connection
      if (connectionLost && showNotifications && !suppressNotifications) {
        toast({
          title: "Connection Restored",
          description: "You're back online and will receive real-time updates.",
          variant: "default",
        });
        setConnectionLost(false);
      }
    },
    onClose: () => {
      console.log("[WebSocket] Connection closed");
      setConnectionLost(true);
    },
    onError: (error) => {
      console.error("[WebSocket] Connection error:", error);
      setConnectionLost(true);
      setConnectionAttempts(prev => prev + 1);
      
      // Only show notifications for first 2 attempts to avoid spamming the user
      if (showNotifications && connectionAttempts < 2 && !suppressNotifications) {
        toast({
          title: "Connection Issue",
          description: "There was a problem with real-time updates. Reconnecting...",
          variant: "destructive",
        });
      }
      
      // If we've tried too many times, suppress future notifications
      if (connectionAttempts >= 3) {
        setSuppressNotifications(true);
      }
    }
  });

  // Connect/Disconnect based on authentication state with debounce
  useEffect(() => {
    let connectTimer: ReturnType<typeof setTimeout>;
    
    if (user) {
      // Delay connection to avoid race conditions with session initialization
      connectTimer = setTimeout(() => {
        // Only attempt connection if we have a valid user and we're not already connected
        if (user && websocket.status !== 'connected') {
          console.log("[WebSocket Provider] Initiating connection after delay");
          websocket.connect();
        }
      }, 1000);
    } else {
      // Immediate disconnect if user logs out
      websocket.disconnect();
    }
    
    // Clean up timers on unmount
    return () => {
      clearTimeout(connectTimer);
    };
  }, [user, websocket]);

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export default WebSocketProvider;
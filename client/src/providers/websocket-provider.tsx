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
  send: (message: any) => void;
}

const defaultContext: WebSocketContextType = {
  status: 'disconnected',
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  subscribe: () => () => {},
  unsubscribe: () => {},
  send: () => {}
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
  const { user } = useAuth(); // Access auth context to connect only when logged in
  
  // Initialize WebSocket hook
  const websocket = useWebSocket({
    autoConnect: !!user, // Only connect if user is authenticated
    onOpen: () => {
      console.log("[WebSocket] Connection established");
      
      // Show reconnection toast if we previously lost connection
      if (connectionLost && showNotifications) {
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
      
      if (showNotifications) {
        toast({
          title: "Connection Lost",
          description: "Unable to connect to the server. Retrying...",
          variant: "destructive",
        });
      }
    }
  });

  // Connect/Disconnect based on authentication state
  useEffect(() => {
    if (user) {
      websocket.connect();
    } else {
      websocket.disconnect();
    }
  }, [user]);

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export default WebSocketProvider;
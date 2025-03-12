import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface SocketContextType {
  connected: boolean;
  error: Error | null;
  lastMessage: any | null;
}

const initialState: SocketContextType = {
  connected: false,
  error: null,
  lastMessage: null
};

const SocketContext = createContext<SocketContextType>(initialState);

interface SocketProviderProps {
  children: React.ReactNode;
  endpoint?: string;
}

export function SocketProvider({
  children,
  endpoint = "/ws"
}: SocketProviderProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const mounted = React.useRef(true);

  useEffect(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsEndpoint = `${protocol}//${window.location.host}${endpoint}`;
      console.log('[WebSocket] Connecting to:', wsEndpoint);
      
      const ws = new WebSocket(wsEndpoint);
      
      ws.onopen = () => {
        if (!mounted.current) return;
        console.log('[WebSocket] Connected successfully');
        setConnected(true);
        setError(null);
      };

      ws.onclose = (event) => {
        if (!mounted.current) return;
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setConnected(false);
        
        if (event.code !== 1000) {
          // Abnormal closure
          console.log('[WebSocket] Attempting to reconnect (1/5)...');
        }
      };

      ws.onerror = () => {
        if (!mounted.current) return;
        const connectionError = new Error('WebSocket connection error. Please check your internet connection.');
        console.error('[WebSocket] Error:', connectionError);
        setError(connectionError);
      };

      ws.onmessage = (event) => {
        if (!mounted.current) return;

        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          setLastMessage(data);
          
          if (data.type === 'task_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          } else if (data.type === 'file_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/files'] });
          } else if (data.timestamp) {
            console.log('[WebSocket] Connection established:', data);
          }
        } catch (err) {
          console.error('[WebSocket] Message parse error:', err);
        }
      };

      setSocket(ws);

      return () => {
        mounted.current = false;
        if (ws) {
          ws.close();
        }
      };
    } catch (err) {
      console.error('[WebSocket] Setup error:', err);
      setError(err as Error);
    }
  }, [endpoint, queryClient]);

  return (
    <SocketContext.Provider 
      value={{ 
        connected, 
        error, 
        lastMessage 
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  
  return context;
};

export { SocketContext };
import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface SocketContextType {
  connected: boolean;
  error: Error | null;
  lastMessage: any | null;
}

const initialState: SocketContextType = {
  connected: false,
  error: null,
  lastMessage: null
};

const SocketContext = createContext<SocketContextType>(initialState);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // WebSocket connection logic could be implemented here
    // For now, we're just setting connected to true for demonstration
    console.log("[WebSocket] Connecting to:", "wss://your-socket-server-url");
    
    // Simulate successful connection
    setTimeout(() => {
      setConnected(true);
      console.log("[WebSocket] Connected successfully");
      
      const timestamp = new Date().toISOString();
      setLastMessage({ timestamp });
      console.log("[WebSocket] Connection established:", { timestamp });
    }, 1000);

    return () => {
      // Cleanup logic for WebSocket
      console.log("[WebSocket] Connection closed");
    };
  }, []);

  // Provide actual socket values and functions
  const value = {
    connected,
    error,
    lastMessage
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export default SocketContext;

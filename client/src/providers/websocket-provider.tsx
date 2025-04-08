import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket, UseWebSocketReturn } from '@/hooks/use-websocket';

// Create a context for the WebSocket
const WebSocketContext = createContext<UseWebSocketReturn | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

/**
 * Provider component that makes WebSocket functions available throughout the app
 * @param {WebSocketProviderProps} props - The component props
 * @returns {JSX.Element} The provider component
 */
export function WebSocketProvider({
  children,
  autoConnect = true,
}: WebSocketProviderProps): JSX.Element {
  // Use the WebSocket hook to manage the connection
  const webSocket = useWebSocket(autoConnect);
  
  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Custom hook to use the WebSocket context
 * @returns {UseWebSocketReturn} The WebSocket context value
 * @throws {Error} If used outside of a WebSocketProvider
 */
export function useWebSocketContext(): UseWebSocketReturn {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
}
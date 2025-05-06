/**
 * WebSocket Connection Utility
 * 
 * This module provides a standardized way to connect to the WebSocket server
 * that's compatible with the server-side implementation and avoids conflicts with
 * Vite's Hot Module Replacement (HMR) WebSocket.
 */

import { useEffect, useState } from 'react';

/**
 * Connect to the WebSocket server using the correct protocol and path
 * to avoid conflicts with Vite's HMR WebSocket
 */
export function connectToWebSocketServer() {
  // Determine the correct protocol (wss for HTTPS, ws for HTTP)
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  
  // Create the WebSocket URL with the correct path (/ws)
  // This ensures we don't conflict with Vite's HMR WebSocket
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  // Create a new WebSocket connection
  const socket = new WebSocket(wsUrl);
  
  console.info(`[WebSocket] Connecting to WebSocket: ${wsUrl}`);
  
  return socket;
}

/**
 * Hook for using WebSocket connection in components
 * @returns WebSocket connection and connection status
 */
export function useWebSocketConnection() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Create a new WebSocket connection
    const newSocket = connectToWebSocketServer();
    
    // Set up event listeners
    newSocket.onopen = () => {
      console.info('[WebSocket] WebSocket connection established');
      setIsConnected(true);
    };
    
    newSocket.onclose = (event) => {
      console.info('[WebSocket] WebSocket connection closed:', event.code, event.reason);
      setIsConnected(false);
    };
    
    newSocket.onerror = (error) => {
      console.error('[WebSocket] WebSocket error:', error);
      setIsConnected(false);
    };
    
    // Save the socket reference
    setSocket(newSocket);
    
    // Clean up on component unmount
    return () => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, []);
  
  return { socket, isConnected };
}

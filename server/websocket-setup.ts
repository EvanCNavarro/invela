/**
 * WebSocket Server Setup
 * 
 * This file handles the setup of the WebSocket server for the application.
 * It provides WebSocket functionality for real-time updates, particularly
 * for form submission status updates and notifications.
 */

import http from 'http';
import { WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server with an HTTP server
 * 
 * @param server HTTP server to attach the WebSocket server to
 * @returns WebSocket server instance or null if initialization fails
 */
export function initializeWebSocketServer(server: http.Server): WebSocketServer | null {
  try {
    // Create WebSocket server with a distinct path so it doesn't conflict with Vite's HMR
    console.log('[WebSocket] Initializing WebSocket server on path /ws');
    
    wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });
    
    // Set up error handling on the server level
    wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });
    
    console.log('[WebSocket] Server initialized successfully');
    return wss;
  } catch (error) {
    console.error('[WebSocket] Failed to initialize WebSocket server:', error);
    return null;
  }
}

/**
 * Get the WebSocket server instance
 * This allows other parts of the application to access the WebSocket server
 * 
 * @returns WebSocket server instance or null if not initialized
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

export default {
  initializeWebSocketServer,
  getWebSocketServer
};
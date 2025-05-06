/**
 * WebSocket Server Configuration
 * 
 * This module sets up a WebSocket server for real-time communication
 * that doesn't conflict with Vite's HMR WebSocket.
 */

import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { logger } from './utils/logger';
import { initWebSocketServer } from './utils/unified-websocket';

/**
 * Initialize the WebSocket server on a specific path
 * to avoid conflicts with Vite's HMR WebSocket
 */
export function setupWebSocketServer(httpServer: Server): WebSocketServer {
  logger.info('[WebSocket] Setting up WebSocket server on path /ws');
  
  // Initialize the WebSocket server on the /ws path
  // This ensures it doesn't conflict with Vite's HMR WebSocket
  const wss = initWebSocketServer(httpServer, '/ws');
  
  logger.info('[WebSocket] WebSocket server initialized successfully');
  
  return wss;
}

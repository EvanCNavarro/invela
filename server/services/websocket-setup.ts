/**
 * WebSocket Setup
 * 
 * This module initializes the WebSocket server and attaches it to the HTTP server.
 */

import { Server } from 'http';
import * as WebSocketService from './websocket';

/**
 * Set up WebSocket server
 * @param server HTTP server instance
 */
export function setupWebSocket(server: Server): void {
  try {
    // Initialize WebSocket server on the /ws path
    WebSocketService.initializeWebSocketServer(server);
  } catch (error) {
    console.error('[WebSocket] Error setting up WebSocket server:', error);
  }
}

export default setupWebSocket;
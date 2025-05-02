/**
 * WebSocket Setup
 * 
 * This module initializes the WebSocket server and attaches it to the HTTP server.
 * It makes sure that the WebSocket server doesn't conflict with Vite's HMR websocket.
 */

import { Server } from 'http';
import { WebSocketServer } from 'ws';
import * as WebSocketService from './websocket';
import { logger } from '../utils/logger';
import { configureTaskWebSocketRoutes } from '../routes/task-websocket';
import { setWebSocketServer } from '../utils/task-broadcast';
import { registerWebSocketServer } from '../utils/task-update';

// Logger is already initialized in the imported module

/**
 * Set up WebSocket server with proper filtering for Vite HMR
 * @param server HTTP server instance
 */
export function setupWebSocket(server: Server): void {
  try {
    logger.info('Setting up WebSocket server...');
    
    // Initialize WebSocket server on the explicit /ws path
    // This won't interfere with Vite HMR which has its own path
    const wss = new WebSocketServer({ 
      server,
      path: '/ws',
      // Add a verification handler to avoid conflicts with Vite HMR
      verifyClient: (info, callback) => {
        // Skip Vite HMR websocket connections
        if (info.req.headers['sec-websocket-protocol'] === 'vite-hmr') {
          logger.info('Ignoring Vite HMR WebSocket connection attempt');
          return callback(false);
        }
        
        // Allow all other websocket connections
        return callback(true);
      }
    });
    
    // Initialize the WebSocket service with our custom server
    WebSocketService.initializeWebSocketServer(wss);
    
    // Set up WebSocket reference for task broadcasting service
    setWebSocketServer(wss);
    
    // Register our new task-update utility with the WebSocket server
    registerWebSocketServer(wss);
    
    // Configure task-specific WebSocket routes for progress calculation and reconciliation
    configureTaskWebSocketRoutes(server, wss);
    
    logger.info('WebSocket server initialized successfully with task routes');
  } catch (error) {
    logger.error('Error setting up WebSocket server:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

export default setupWebSocket;
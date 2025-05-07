/**
 * WebSocket Server Configuration
 * 
 * This module sets up the unified WebSocket server for real-time communication.
 * It uses the centralized unified-websocket module for all WebSocket functionality
 * and simply provides a wrapper function to initialize it.
 */

import { Server } from 'http';
import { logger } from './utils/logger';
import { initializeWebSocketServer } from './utils/unified-websocket';

/**
 * Initialize the WebSocket server on the specified path
 * This ensures it doesn't conflict with Vite's HMR WebSocket
 * 
 * @param httpServer The HTTP server to attach WebSocket to
 */
export function setupWebSocketServer(httpServer: Server): void {
  logger.info('[WebSocket] Setting up unified WebSocket server on path /ws');
  
  try {
    // Initialize the WebSocket server using the unified module
    initializeWebSocketServer(httpServer, '/ws');
    
    logger.info('[WebSocket] Unified WebSocket server initialized successfully');
  } catch (setupError) {
    logger.error('[WebSocket] Failed to initialize unified WebSocket server', {
      error: setupError instanceof Error ? setupError.message : String(setupError),
      stack: setupError instanceof Error ? setupError.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

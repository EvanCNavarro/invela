/**
 * WebSocket Server Configuration
 * 
 * This module sets up a WebSocket server for real-time communication
 * that doesn't conflict with Vite's HMR WebSocket. It also provides
 * additional handling for connection errors and reconnection.
 */

import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { logger } from './utils/logger';
import { initWebSocketServer } from './utils/unified-websocket';

// Track WebSocket server instance for monitoring and recovery
let webSocketServerInstance: WebSocketServer | null = null;

/**
 * Initialize the WebSocket server on a specific path
 * to avoid conflicts with Vite's HMR WebSocket
 */
export function setupWebSocketServer(httpServer: Server): WebSocketServer {
  // If we already have an instance, return it (singleton pattern)
  if (webSocketServerInstance) {
    logger.info('[WebSocket] Using existing WebSocket server instance');
    return webSocketServerInstance;
  }
  
  logger.info('[WebSocket] Setting up WebSocket server on path /ws');
  
  try {
    // Initialize the WebSocket server on the /ws path
    // This ensures it doesn't conflict with Vite's HMR WebSocket
    webSocketServerInstance = initWebSocketServer(httpServer, '/ws');
    
    // Enhanced error handling for the WebSocket server
    webSocketServerInstance.on('error', (error) => {
      logger.error(`[WebSocket] Server error: ${error.message}`, {
        error,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    // Set up a heartbeat interval to check server health
    const heartbeatInterval = setInterval(() => {
      if (!webSocketServerInstance) {
        logger.warn('[WebSocket] Server instance missing during heartbeat check');
        clearInterval(heartbeatInterval);
        return;
      }
      
      try {
        // Count active connections
        const clientCount = webSocketServerInstance.clients.size;
        
        // Log status every minute with reduced verbosity
        const timestamp = new Date();
        if (timestamp.getSeconds() === 0) {
          logger.info(`[WebSocket] Server heartbeat: ${clientCount} clients connected`);
        }
      } catch (heartbeatError) {
        logger.error('[WebSocket] Error during heartbeat check', {
          error: heartbeatError instanceof Error ? heartbeatError.message : String(heartbeatError)
        });
      }
    }, 10000); // Check every 10 seconds
    
    logger.info('[WebSocket] WebSocket server initialized successfully');
    
    return webSocketServerInstance;
  } catch (setupError) {
    logger.error('[WebSocket] Failed to initialize WebSocket server', {
      error: setupError instanceof Error ? setupError.message : String(setupError),
      stack: setupError instanceof Error ? setupError.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Create a minimal fallback WebSocketServer instance
    // This ensures the application doesn't crash if WebSocket init fails
    const fallbackServer = new WebSocketServer({
      noServer: true,
      path: '/ws'
    });
    
    // Store the fallback server for potential future recovery
    webSocketServerInstance = fallbackServer;
    
    return fallbackServer;
  }
}

/**
 * Get the current WebSocket server instance
 * This is useful for modules that need to access the WSS instance
 * but don't have direct access to the initialization code
 */
export function getWebSocketServerInstance(): WebSocketServer | null {
  return webSocketServerInstance;
}

/**
 * Reset the WebSocket server instance
 * Useful for test environments or server recovery scenarios
 */
export function resetWebSocketServerInstance(): void {
  if (webSocketServerInstance) {
    try {
      webSocketServerInstance.close();
    } catch (closeError) {
      logger.error('[WebSocket] Error closing WebSocket server', {
        error: closeError instanceof Error ? closeError.message : String(closeError)
      });
    }
  }
  
  webSocketServerInstance = null;
  logger.info('[WebSocket] WebSocket server instance reset');
}

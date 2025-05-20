/**
 * WebSocket Server Configuration
 * 
 * This module sets up a unified WebSocket server for real-time communication.
 * It uses the centralized unified-websocket module for all WebSocket functionality.
 * 
 * IMPORTANT: We only create a single WebSocket server instance to avoid conflicts.
 */

import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { logger } from './utils/logger';
import { initializeWebSocketServer as initializeUnifiedWebSocketServer, getWebSocketServer } from './utils/unified-websocket';
// Import the enhanced WebSocket service
import WebSocketService, { setGlobalWebSocketService } from './services/websocket-service';

/**
 * Initialize the WebSocket server on the specified path
 * This ensures it doesn't conflict with Vite's HMR WebSocket
 * 
 * @param httpServer The HTTP server to attach WebSocket to
 * @returns The initialized WebSocket server instance
 */
export function setupWebSocketServer(httpServer: Server): WebSocketServer {
  logger.info('[WebSocket] Setting up unified WebSocket server on path /ws');
  
  /**
   * Environment-aware WebSocket initialization
   * 
   * In production mode, we only allow WebSocket initialization on port 8080
   * to ensure compatibility with Replit Autoscale deployment requirements.
   */
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check server port for production mode constraints
  if (isProduction) {
    const address = httpServer.address();
    const currentPort = typeof address === 'object' && address ? address.port : null;
    
    // In production, only initialize WebSocket on port 8080
    if (currentPort !== 8080) {
      logger.warn('[WebSocket] Production mode detected - WebSocket initialization skipped on port ' + 
                 currentPort + ' (only allowed on port 8080)');
      
      // Return a non-operational WebSocket server to maintain API compatibility
      return new WebSocketServer({ noServer: true });
    }
    
    logger.info('[WebSocket] Production mode - Initializing WebSocket on required port 8080');
  }
  
  try {
    // Initialize the WebSocket server using the unified module
    // We create only ONE WebSocket server instance to avoid conflicts
    initializeUnifiedWebSocketServer(httpServer, '/ws');
    
    // Get the initialized instance
    const unifiedWss = getWebSocketServer();
    
    if (!unifiedWss) {
      throw new Error('Unified WebSocket server failed to initialize properly');
    }
    
    logger.info('[WebSocket] Unified WebSocket server initialized successfully');
    
    // IMPORTANT: We use the existing unified WebSocket server with our WebSocketService
    // instead of creating a new one on the same path
    try {
      // Create a WebSocketService instance using the EXISTING unified WebSocket server
      // This prevents duplicate socket upgrade handling
      const wsService = new WebSocketService(unifiedWss);
      
      // Set the global instance for static method access
      setGlobalWebSocketService(wsService);
      logger.info('[WebSocket] Form submission WebSocket service initialized successfully');
    } catch (wsError) {
      logger.warn('[WebSocket] Failed to initialize form submission WebSocket service, but unified server is working', {
        error: wsError instanceof Error ? wsError.message : String(wsError)
      });
    }
    
    // Return the unified WebSocket server instance
    return unifiedWss;
  } catch (setupError) {
    logger.error('[WebSocket] Failed to initialize unified WebSocket server', {
      error: setupError instanceof Error ? setupError.message : String(setupError),
      stack: setupError instanceof Error ? setupError.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Create a fallback WebSocket server as a last resort
    logger.warn('[WebSocket] Creating fallback WebSocket server');
    const fallbackWss = new WebSocketServer({ 
      server: httpServer, 
      path: '/ws',
      clientTracking: true,
      // Skip Vite HMR WebSocket connections
      verifyClient: (info: any) => {
        try {
          const protocol = info.req.headers['sec-websocket-protocol'];
          return protocol !== 'vite-hmr';
        } catch (e) {
          // If we can't check the protocol, allow the connection
          return true;
        }
      }
    });
    
    // Also initialize WebSocketService with the fallback server
    try {
      const wsService = new WebSocketService(fallbackWss);
      setGlobalWebSocketService(wsService);
    } catch (error) {
      logger.warn('[WebSocket] Failed to initialize WebSocket service with fallback server');
    }
    
    // Return the fallback WebSocket server
    return fallbackWss;
  }
}

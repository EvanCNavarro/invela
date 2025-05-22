/**
 * WebSocket Server Configuration
 * 
 * This module sets up the unified WebSocket server for real-time communication.
 * It uses the centralized unified-websocket module for all WebSocket functionality
 * and also initializes the improved WebSocket server for form status updates.
 */

import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { logger } from './utils/logger';
import { initializeWebSocketServer as initializeUnifiedWebSocketServer, getWebSocketServer } from './utils/unified-websocket';
// Import the enhanced WebSocket service
import * as WebSocketService from './services/websocket-service';

/**
 * Initialize the WebSocket server on the specified path
 * This ensures it doesn't conflict with Vite's HMR WebSocket
 * 
 * @param httpServer The HTTP server to attach WebSocket to
 * @returns The initialized WebSocket server instance
 */
export function setupWebSocketServer(httpServer: Server): WebSocketServer {
  logger.info('[WebSocket] Setting up unified WebSocket server on path /ws');
  
  try {
    // Initialize the WebSocket server using the unified module
    initializeUnifiedWebSocketServer(httpServer, '/ws');
    
    // Get the initialized instance
    const unifiedWss = getWebSocketServer();
    
    if (!unifiedWss) {
      throw new Error('Unified WebSocket server failed to initialize properly');
    }
    
    logger.info('[WebSocket] Unified WebSocket server initialized successfully');
    
    // Also initialize the improved form submission WebSocket server with the same HTTP server
    // Use the unified WebSocket server for enhanced real-time updates
    // This maintains consistency with the application's homogeneous WebSocket architecture
    try {
      // The unified WebSocket server is already initialized above and handles all form submissions
      // This comment serves as documentation that form submission broadcasting is handled
      // through the unified system via broadcast() and broadcastTaskUpdate() functions
      logger.info('[WebSocket] Unified WebSocket server handles form submission broadcasting');
      logger.info('[WebSocket] Skipping redundant WebSocket server initialization for deployment compatibility');
    } catch (wsError) {
      logger.warn('[WebSocket] Failed to initialize form submission WebSocket server, but unified server is working', {
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
      clientTracking: true
    });
    
    // Return the fallback WebSocket server
    return fallbackWss;
  }
}

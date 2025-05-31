/**
 * Unified WebSocket Server
 * 
 * This module provides a central WebSocket server that can be used by multiple
 * components throughout the application. It ensures that only a single WebSocket
 * server instance is created, and that all components can access it.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from './logger';

let wssInstance: WebSocketServer | null = null;
let serverDetails = { clients: 0, path: '', id: '', timestamp: '' };

/**
 * Initialize the unified WebSocket server with an HTTP server
 * 
 * @param httpServer The HTTP server to attach the WebSocket server to
 * @param options Optional configuration options
 * @returns The initialized WebSocket server
 */
export function initializeWebSocketServer(httpServer: Server, options: { 
  path?: string;
  debug?: boolean;
} = {}) {
  if (wssInstance) {
    logger.info('[UnifiedWebSocket] WebSocket server already initialized');
    return wssInstance;
  }
  
  const path = options.path || '/ws';
  const debug = options.debug || false;
  const serverId = Math.random().toString(36).substring(2, 8);
  
  wssInstance = new WebSocketServer({ 
    server: httpServer, 
    path,
    clientTracking: true
  });
  
  // Update server details
  serverDetails = { 
    clients: 0, 
    path, 
    id: serverId,
    timestamp: new Date().toISOString()
  };
  
  // Set up event handlers
  wssInstance.on('connection', (ws: WebSocket, req: any) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Assign client ID
    (ws as any).clientId = clientId;
    serverDetails.clients = wssInstance?.clients.size || 0;
    
    if (debug) {
      logger.info(`[UnifiedWebSocket] Client connected: ${clientId}`);
    }
    
    // Handle connection establishment
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        payload: {
          message: 'Connection established',
          clientId,
          timestamp: new Date().toISOString()
        },
        data: {
          message: 'Connection established',
          clientId,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (err) {
      logger.error('[UnifiedWebSocket] Error sending connection confirmation', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
    
    // Handle client disconnection
    ws.on('close', () => {
      if (debug) {
        logger.info(`[UnifiedWebSocket] Client disconnected: ${clientId}`);
      }
      serverDetails.clients = wssInstance?.clients.size || 0;
    });
    
    // Handle client errors
    ws.on('error', (error) => {
      logger.error('[UnifiedWebSocket] Client error', {
        error: error instanceof Error ? error.message : String(error),
        clientId
      });
    });
  });
  
  logger.info('Unified WebSocket server initialized successfully with details:', serverDetails);
  
  return wssInstance;
}

/**
 * Get the WebSocket server instance
 * 
 * @returns The WebSocket server instance, or null if not initialized
 */
export async function getWebSocketServer(): Promise<WebSocketServer | null> {
  // If not initialized yet, wait a bit to see if it initializes
  if (!wssInstance) {
    logger.warn('[UnifiedWebSocket] WebSocket server not initialized, waiting...');
    
    // Wait up to 5 seconds for the server to initialize
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (wssInstance) break;
    }
    
    if (!wssInstance) {
      logger.error('[UnifiedWebSocket] WebSocket server not available after waiting');
      return null;
    }
  }
  
  return wssInstance;
}

/**
 * Get information about the WebSocket server
 * 
 * @returns Object with server details
 */
export function getWebSocketServerInfo() {
  return {
    ...serverDetails,
    clients: wssInstance?.clients.size || 0,
    active: !!wssInstance,
    timestamp: new Date().toISOString()
  };
}

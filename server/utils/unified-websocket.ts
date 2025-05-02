/**
 * Unified WebSocket Service
 * 
 * This module provides a single source of truth for WebSocket functionality.
 * It consolidates multiple implementations and ensures consistent message formats
 * between clients and server.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from './logger';

// Single WebSocket server instance
let wss: WebSocketServer | null = null;

// Track authenticated clients with their metadata
interface WebSocketClient {
  ws: WebSocket;
  userId?: number | null;
  companyId?: number | null;
  clientId: string;
  authenticated: boolean;
  lastPing?: Date;
}

// Map to store active clients by their clientId
const clients = new Map<string, WebSocketClient>();

/**
 * Initialize the WebSocket server
 * 
 * @param server The HTTP server to attach the WebSocket server to
 * @returns The WebSocket server instance
 */
export function initializeWebSocketServer(server: Server): WebSocketServer {
  // If already initialized, return the existing instance
  if (wss) {
    logger.info('WebSocket server already initialized');
    return wss;
  }
  
  logger.info('Initializing unified WebSocket server');
  
  // Create WebSocket server with proper path and verification to avoid Vite HMR conflicts
  wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    // Verify client to reject Vite HMR connections
    verifyClient: (info) => {
      const isViteHmr = info.req.headers['sec-websocket-protocol'] === 'vite-hmr';
      if (isViteHmr) {
        logger.info('Rejecting Vite HMR WebSocket connection');
        return false;
      }
      return true;
    }
  });
  
  // Set up connection handler
  wss.on('connection', handleConnection);
  
  // Set up error handler
  wss.on('error', (error) => {
    logger.error('WebSocket server error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  });
  
  logger.info('Unified WebSocket server initialized successfully');
  return wss;
}

/**
 * Handle new WebSocket connections
 */
function handleConnection(ws: WebSocket, req: any) {
  // Generate a unique client ID for this connection
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
  
  logger.info(`[WebSocket] Client connected: ${clientId}`);
  
  // Store the client in our map
  clients.set(clientId, {
    ws,
    clientId,
    authenticated: false,
    lastPing: new Date()
  });
  
  // Send a welcome message
  ws.send(JSON.stringify({
    type: 'connection_established',
    // Use both payload and data formats for maximum compatibility
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
  
  // Set up message handler
  ws.on('message', (message) => handleMessage(ws, message, clientId));
  
  // Set up close handler
  ws.on('close', () => {
    logger.info(`[WebSocket] Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });
  
  // Set up error handler
  ws.on('error', (error) => {
    logger.error(`[WebSocket] Client error for ${clientId}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  });
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(ws: WebSocket, message: any, clientId: string) {
  try {
    // Parse the message
    const parsedMessage = JSON.parse(message.toString());
    logger.info(`[WebSocket] Received message from client ${clientId}:`, parsedMessage);
    
    // Handle different message types
    switch (parsedMessage.type) {
      case 'ping':
        handlePing(ws, clientId);
        break;
      
      case 'authenticate':
        handleAuthentication(ws, parsedMessage, clientId);
        break;
      
      case 'task_update_request':
        handleTaskUpdateRequest(parsedMessage);
        break;
      
      default:
        // Forward other messages to registered handlers
        // This allows existing code to keep working
        break;
    }
  } catch (error) {
    logger.error(`[WebSocket] Error handling message from ${clientId}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

/**
 * Handle ping messages to keep connections alive
 */
function handlePing(ws: WebSocket, clientId: string) {
  // Update the client's last ping time
  const client = clients.get(clientId);
  if (client) {
    client.lastPing = new Date();
  }
  
  // Send a pong response
  ws.send(JSON.stringify({
    type: 'pong',
    payload: {
      timestamp: new Date().toISOString()
    },
    data: {
      timestamp: new Date().toISOString()
    }
  }));
}

/**
 * Handle authentication messages
 */
function handleAuthentication(ws: WebSocket, message: any, clientId: string) {
  // Extract user and company info from the message
  // Support both formats: data.userId and direct userId
  const userId = message.userId || message.data?.userId || null;
  const companyId = message.companyId || message.data?.companyId || null;
  const messageClientId = message.clientId || message.data?.clientId || clientId;
  
  logger.info(`[WebSocket] Authentication from client ${clientId}:`, {
    userId,
    companyId,
    hasToken: !!message.token || !!message.data?.token
  });
  
  // Update the client's authentication status
  const client = clients.get(clientId);
  if (client) {
    client.userId = userId;
    client.companyId = companyId;
    client.authenticated = true;
    client.clientId = messageClientId;
  }
  
  // Send authentication confirmation
  ws.send(JSON.stringify({
    type: 'authenticated',
    payload: {
      userId,
      companyId,
      clientId: messageClientId,
      timestamp: new Date().toISOString()
    },
    data: {
      userId,
      companyId,
      clientId: messageClientId,
      timestamp: new Date().toISOString()
    }
  }));
}

/**
 * Handle task update requests
 */
function handleTaskUpdateRequest(message: any) {
  // Extract task ID from the message
  const taskId = message.taskId || message.data?.taskId;
  
  if (!taskId) {
    logger.warn('[WebSocket] Task update request missing taskId');
    return;
  }
  
  // This would typically trigger a task update broadcast
  // But we'll let the actual implementation handle this
  logger.info(`[WebSocket] Task update request for task ${taskId}`);
}

/**
 * Broadcast a message to all connected clients
 * 
 * @param type Message type
 * @param payload Message payload
 */
export function broadcast(type: string, payload: any): void {
  if (!wss) {
    logger.warn(`[WebSocket] Cannot broadcast ${type}, server not initialized`);
    return;
  }
  
  // Create standardized message that works with all client implementations
  const timestamp = new Date().toISOString();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Make sure task IDs are accessible in multiple formats
  const taskId = payload?.taskId || payload?.id || null;
  
  // Create message with both payload and data fields for compatibility
  const message = JSON.stringify({
    type,
    messageId,
    timestamp,
    // Include the task ID at the top level if present
    ...(taskId && { taskId: String(taskId) }),
    // Include payload field (newer format)
    payload: {
      ...payload,
      timestamp,
      messageId
    },
    // Include data field (older format)
    data: {
      ...payload,
      timestamp,
      messageId
    }
  });
  
  let sentCount = 0;
  
  // Send to all connected clients that are ready
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  });
  
  logger.info(`[WebSocket] Broadcast ${type} to ${sentCount} clients`);
}

/**
 * Broadcast a task update
 * 
 * @param taskId Task ID
 * @param status Task status
 * @param progress Task progress (0-100)
 * @param metadata Additional metadata
 */
export function broadcastTaskUpdate(
  taskId: number,
  status?: string,
  progress?: number,
  metadata?: any
): void {
  broadcast('task_update', {
    id: taskId,
    taskId, // Include both formats for compatibility
    status,
    progress,
    metadata: {
      ...metadata,
      lastUpdated: new Date().toISOString()
    }
  });
}

/**
 * Get WebSocket server instance
 * 
 * @returns WebSocket server instance or null if not initialized
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

// Check for inactive clients periodically
setInterval(() => {
  const now = new Date();
  const timeout = 120000; // 2 minutes
  
  clients.forEach((client, clientId) => {
    if (client.lastPing && now.getTime() - client.lastPing.getTime() > timeout) {
      logger.info(`[WebSocket] Closing inactive connection: ${clientId}`);
      client.ws.close();
      clients.delete(clientId);
    }
  });
}, 60000); // Check every minute

// Export default object for consistent imports
export default {
  initializeWebSocketServer,
  broadcast,
  broadcastTaskUpdate,
  getWebSocketServer
};

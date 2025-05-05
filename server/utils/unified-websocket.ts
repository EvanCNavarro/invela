/**
 * Unified WebSocket Server Module
 * 
 * This module provides a centralized way to manage WebSocket connections and broadcasts
 * across the application, ensuring consistent messaging format and error handling.
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

// Single WebSocket server instance for the entire application
let wss: WebSocketServer | null = null;

// Client registry with metadata for each connection
interface ClientData {
  ws: WebSocket;
  id: string;
  userId?: number;
  companyId?: number;
  connectedAt: Date;
  lastActivity: Date;
  ip: string;
  userAgent?: string;
}

// Map to track clients with their metadata
let clients = new Map<string, ClientData>();

// Server metadata
let serverDetails = {
  path: '/ws',
  id: '',
  startTime: new Date(),
  messageCount: 0,
  errors: 0,
};

/**
 * Initialize the WebSocket server
 * 
 * @param server HTTP server to attach the WebSocket server to
 * @param path WebSocket endpoint path (default: '/ws')
 * @returns The WebSocket server instance
 */
export function initWebSocketServer(server: http.Server, path: string = '/ws') {
  // Only initialize once
  if (wss) {
    console.log('[WebSocket] WebSocket server already initialized');
    return wss;
  }
  
  // Create WebSocket server on the specified path
  wss = new WebSocketServer({ 
    server, 
    path,
    clientTracking: true,
    // Skip Vite HMR websocket connections
    verifyClient: (info: { req: { headers: Record<string, string | string[] | undefined> } }) => {
      const protocol = info.req.headers['sec-websocket-protocol'];
      return protocol !== 'vite-hmr';
    }
  });
  
  // Generate a unique ID for the server instance
  serverDetails = {
    path,
    id: `ws-${Math.random().toString(36).substring(2, 8)}`,
    startTime: new Date(),
    messageCount: 0,
    errors: 0,
  };
  
  // Log server initialization
  console.log(`[INFO] Unified WebSocket server initialized successfully with details:`, {
    clients: wss.clients.size,
    path,
    id: serverDetails.id,
    timestamp: new Date().toISOString(),
  });
  
  // Handle new connections
  wss.on('connection', (ws, req) => {
    // Generate a unique client ID
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Store client with metadata
    clients.set(clientId, {
      ws,
      id: clientId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      ip: req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] as string,
    });
    
    console.log(`[WebSocket] Client connected: ${clientId}`);
    
    // Send a welcome message to confirm connection
    sendToClient(ws, 'connection_established', {
      message: 'Connection established',
      clientId,
      timestamp: new Date().toISOString(),
    });
    
    // Listen for messages from this client
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        serverDetails.messageCount++;
        
        // Update last activity timestamp
        const client = clients.get(clientId);
        if (client) {
          client.lastActivity = new Date();
        }
        
        // Handle authentication message
        if (parsedMessage.type === 'authenticate') {
          const { userId, companyId } = parsedMessage.payload || parsedMessage;
          
          // Update client metadata with auth info
          const client = clients.get(clientId);
          if (client) {
            client.userId = userId;
            client.companyId = companyId;
          }
          
          // Send authentication confirmation
          sendToClient(ws, 'authenticated', {
            userId,
            companyId,
            clientId,
            timestamp: new Date().toISOString(),
          });
        }
        
        // Handle ping message for connectivity testing
        if (parsedMessage.type === 'ping') {
          sendToClient(ws, 'pong', {
            timestamp: new Date().toISOString(),
            serverTime: Date.now(),
          });
        }
      } catch (error) {
        serverDetails.errors++;
        console.error(`[WebSocket] Error processing message:`, error);
      }
    });
    
    // Handle disconnections
    ws.on('close', (code, reason) => {
      console.log(`[WebSocket] Client disconnected: ${clientId} - Code: ${code}, Reason: ${reason}`);
      clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      serverDetails.errors++;
      console.error(`[WebSocket] Client error: ${clientId}`, error);
    });
  });
  
  // Handle server errors
  wss.on('error', (error) => {
    serverDetails.errors++;
    console.error(`[WebSocket] Server error:`, error);
  });
  
  return wss;
}

/**
 * Send a message to a specific client
 * 
 * @param ws WebSocket client to send to
 * @param type Message type
 * @param payload Message payload
 * @returns Success status
 */
function sendToClient(ws: WebSocket, type: string, payload: any): boolean {
  if (ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    // Format with both payload and data for backward compatibility
    const message = JSON.stringify({
      type,
      payload,
      data: payload, // For backward compatibility
      timestamp: new Date().toISOString(),
    });
    
    ws.send(message);
    return true;
  } catch (error) {
    console.error(`[WebSocket] Error sending message:`, error);
    return false;
  }
}

/**
 * Broadcast a message to all connected clients
 */
export function broadcast(type: string, payload: any) {
  if (!wss) {
    console.warn('[WARN] [WebSocket] Cannot broadcast, WebSocket server not initialized');
    return false;
  }
  
  const message = JSON.stringify({
    type,
    payload,
    data: payload, // For backward compatibility
    timestamp: new Date().toISOString(),
  });
  
  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  });
  
  if (sent > 0) {
    console.log(`[INFO] [WebSocket] Broadcast ${type} to ${sent} clients`);
  }
  
  return sent > 0;
}

/**
 * Get the active WebSocket server instance
 */
export function getWebSocketServer() {
  return wss;
}

/**
 * Get the number of connected clients
 */
export function getConnectedClientCount() {
  if (!wss) return 0;
  return wss.clients.size;
}

/**
 * Broadcast a task update message to all connected clients
 * 
 * @param taskId The ID of the task that was updated
 * @param progress The new progress value (0-100)
 * @param status The new status ('not_started', 'in_progress', etc.)
 * @param metadata Additional metadata to include in the message
 * @returns Boolean indicating whether the broadcast was successful
 */
export function broadcastTaskUpdate(
  taskId: number,
  progress: number,
  status: string,
  metadata: Record<string, any> = {}
) {
  // Create timestamp once for consistent messaging
  const timestamp = new Date().toISOString();
  
  // Create a standardized message payload structure
  const payload = {
    id: taskId,
    taskId,
    status,
    progress,
    metadata: {
      ...metadata,
      lastUpdate: timestamp
    },
    timestamp
  };
  
  return broadcast('task_update', payload);
}

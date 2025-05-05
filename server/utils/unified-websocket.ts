/**
 * Unified WebSocket Server Module
 * 
 * This module provides a centralized way to manage WebSocket connections and broadcasts
 * across the application, ensuring consistent messaging format and error handling.
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

let wss: WebSocketServer | null = null;
let clients: Map<string, WebSocket> = new Map();

/**
 * Initialize the WebSocket server
 */
export function initWebSocketServer(server: http.Server, path: string = '/ws') {
  if (wss) {
    console.log('[WebSocket] WebSocket server already initialized');
    return wss;
  }
  
  // Create WebSocket server on the specified path with protocol handling
  wss = new WebSocketServer({ 
    server, 
    path,
    clientTracking: true,
    // Add a handler to properly handle our custom protocol
    handleProtocols: (protocols, request) => {
      console.log(`[WebSocket] Client requesting protocols:`, protocols);
      
      // Accept our app-specific protocol if available
      if (Array.isArray(protocols) && protocols.includes('app-ws-protocol')) {
        return 'app-ws-protocol';
      }
      
      // Accept without protocol if no protocol specified or if it's empty
      if (!protocols || (Array.isArray(protocols) && protocols.length === 0)) {
        return false;
      }
      
      // Otherwise, accept the first protocol
      return Array.isArray(protocols) ? protocols[0] : protocols;
    }
  });
  
  // Generate a unique ID for the server instance
  const serverId = `${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[INFO] Unified WebSocket server initialized successfully with details:`, {
    clients: wss.clients.size,
    path,
    id: serverId,
    timestamp: new Date().toISOString(),
  });
  
  // Handle new connections
  wss.on('connection', (ws, req) => {
    // Generate a unique client ID
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    clients.set(clientId, ws);
    
    console.log(`[INFO] [WebSocket] Client connected: ${clientId}`);
    
    // Send a welcome message to confirm connection
    ws.send(JSON.stringify({
      type: 'connection_established',
      payload: {
        message: 'Connection established',
        clientId,
        timestamp: new Date().toISOString(),
      },
      data: {
        message: 'Connection established',
        clientId,
        timestamp: new Date().toISOString(),
      }
    }));
    
    // Listen for messages from this client
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log(`[INFO] [WebSocket] Received message from client ${clientId}:`, parsedMessage);
        
        // Handle authentication message
        if (parsedMessage.type === 'authenticate') {
          const { userId, companyId } = parsedMessage;
          console.log(`[INFO] [WebSocket] Authentication from client ${clientId}:`, {
            userId,
            companyId,
            hasToken: !!req.headers.cookie?.includes('connect.sid')
          });
          
          // Send authentication confirmation
          ws.send(JSON.stringify({
            type: 'authenticated',
            payload: {
              userId,
              companyId,
              clientId,
              timestamp: new Date().toISOString(),
            },
            data: {
              userId,
              companyId,
              clientId,
              timestamp: new Date().toISOString(),
            }
          }));
        }
        
        // Handle ping message
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            payload: {
              timestamp: new Date().toISOString(),
            },
            data: {
              timestamp: new Date().toISOString(),
            }
          }));
        }
      } catch (error) {
        console.error(`[ERROR] [WebSocket] Error processing message:`, error);
      }
    });
    
    // Handle disconnections
    ws.on('close', () => {
      console.log(`[INFO] [WebSocket] Client disconnected: ${clientId}`);
      clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`[ERROR] [WebSocket] Client error: ${clientId}`, error);
    });
  });
  
  // Handle server errors
  wss.on('error', (error) => {
    console.error(`[ERROR] [WebSocket] Server error:`, error);
  });
  
  return wss;
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

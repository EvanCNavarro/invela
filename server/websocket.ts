/**
 * WebSocket Server
 * 
 * This module implements a WebSocket server for real-time communication
 * between the server and clients. It provides broadcast capabilities,
 * connection management, and structured event handling.
 */

import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { logger } from './utils/logger';
import http from 'http';

const wsLogger = logger.child({ module: 'WebSocketServer' });

let wss: WebSocketServer | null = null;
let httpServer: http.Server | null = null;

interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: string;
}

/**
 * Initialize the WebSocket server
 * 
 * @param server HTTP server instance to attach the WebSocket server to
 */
export function initializeWebSocketServer(server: http.Server): WebSocketServer {
  if (wss) {
    wsLogger.info('WebSocket server already initialized');
    return wss;
  }
  
  httpServer = server;
  
  // Create a new WebSocket server (on a distinct path to avoid conflicts with Vite HMR)
  wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Ignore Vite's HMR websocket connections
    verifyClient: (info) => {
      return info.req.headers['sec-websocket-protocol'] !== 'vite-hmr';
    }
  });
  
  wsLogger.info('WebSocket server initialized');
  
  // Set up connection handlers
  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress || 'unknown';
    wsLogger.info(`Client connected from ${ip}`);
    
    // Send a welcome message
    const welcomeEvent: WebSocketEvent = {
      type: 'connection_established',
      payload: {
        message: 'Connected to WebSocket server',
        serverTime: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    
    ws.send(JSON.stringify(welcomeEvent));
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        wsLogger.debug(`Received message from client:`, data);
        
        // Handle specific message types if needed
        if (data.type === 'client_heartbeat') {
          // Respond to heartbeat with a pong
          ws.send(JSON.stringify({
            type: 'server_heartbeat',
            payload: { received: true },
            timestamp: new Date().toISOString(),
          }));
        }
      } catch (err) {
        wsLogger.warn('Failed to parse incoming message', err);
      }
    });
    
    // Handle disconnections
    ws.on('close', () => {
      wsLogger.info(`Client disconnected from ${ip}`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      wsLogger.error(`WebSocket error for client ${ip}:`, error);
    });
  });
  
  return wss;
}

/**
 * Get the WebSocket server instance
 * 
 * @returns The WebSocket server instance or null if not initialized
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

/**
 * Broadcast a message to all connected clients
 * 
 * @param type Event type
 * @param payload Event payload
 * @param excludeClient Optional client to exclude from broadcast
 */
export function broadcastMessage(
  type: string,
  payload: any,
  excludeClient?: WebSocket
): void {
  if (!wss) {
    wsLogger.warn('Attempted to broadcast message but WebSocket server is not initialized');
    return;
  }
  
  const event: WebSocketEvent = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  
  const message = JSON.stringify(event);
  let clientCount = 0;
  
  wss.clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(message);
      clientCount++;
    }
  });
  
  wsLogger.info(`Broadcast message sent to ${clientCount} clients`, { type, clientCount });
}

/**
 * Send a message to a specific client
 * 
 * @param client WebSocket client to send to
 * @param type Event type
 * @param payload Event payload
 */
export function sendToClient(
  client: WebSocket,
  type: string,
  payload: any
): void {
  if (client.readyState !== WebSocket.OPEN) {
    wsLogger.warn(`Attempted to send message to client but connection is not open`);
    return;
  }
  
  const event: WebSocketEvent = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  
  client.send(JSON.stringify(event));
  wsLogger.debug(`Sent message to client`, { type });
}

/**
 * Close the WebSocket server
 */
export function closeWebSocketServer(): void {
  if (wss) {
    wss.close(() => {
      wsLogger.info('WebSocket server closed');
      wss = null;
    });
  }
}

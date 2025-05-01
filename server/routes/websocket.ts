/**
 * WebSocket Server Configuration for Risk Score Notifications
 * 
 * This module sets up a WebSocket server to broadcast risk score updates to clients.
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import getLogger from '../utils/logger';

const logger = getLogger('WebSocket');

// Keep track of connected clients
const clients = new Set<WebSocket>();

// Initialize WebSocket server
export function setupWebSocketServer(httpServer: HttpServer): WebSocketServer {
  logger.info('[WebSocket] Server initialized on path: /ws');
  
  // Create WebSocket server with a specific path to avoid conflict with Vite's HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Handle new WebSocket connections
  wss.on('connection', (ws) => {
    logger.info('[WebSocket] New WebSocket client connected');
    
    // Add new client to the pool
    clients.add(ws);
    
    // Send a welcome message to the client
    ws.send(JSON.stringify({
      type: 'connection_established',
      message: 'Connected to Invela Risk Score WebSocket server',
      timestamp: new Date().toISOString()
    }));
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info('[WebSocket] Received message from client:', data);
        
        // Handle ping messages to keep connection alive
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
        
        // Handle authentication messages
        if (data.type === 'authenticate') {
          logger.info('[WebSocket] Client authenticated');
          ws.send(JSON.stringify({
            type: 'authenticated',
            payload: { success: true, timestamp: new Date().toISOString() }
          }));
        }
      } catch (error) {
        logger.error('[WebSocket] Error parsing message:', error);
      }
    });
    
    // Handle client disconnect
    ws.on('close', (code, reason) => {
      logger.info(`[WebSocket] WebSocket client disconnected with code ${code} and reason: ${reason}`);
      clients.delete(ws);
    });
  });
  
  return wss;
}

/**
 * Broadcast a message to all connected WebSocket clients
 */
export function broadcastMessage(type: string, data: any) {
  const message = JSON.stringify({
    type,
    data, // This will be the payload
    timestamp: new Date().toISOString()
  });
  
  logger.info(`[WebSocket] Broadcasting message of type ${type} to ${clients.size} clients`);
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Send a risk score update to all clients
 */
export function broadcastRiskScoreUpdate(companyId: number, newScore: number) {
  broadcastMessage('risk_score_update', {
    companyId,
    newScore,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Send risk dimension priorities update to all clients
 */
export function broadcastRiskPrioritiesUpdate(priorities: any) {
  // Send a standardized message format
  const message = JSON.stringify({
    type: 'risk_priorities_update',
    payload: {
      priorities,
      updatedAt: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
  
  logger.info(`[WebSocket] Broadcasting risk priorities update to ${clients.size} clients`);
  
  // Use the standardized message format expected by clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Create and export a router for WebSocket-related endpoints
import { Router } from 'express';
const websocketRouter = Router();

// GET endpoint to check WebSocket server status
websocketRouter.get('/api/websocket/status', (req, res) => {
  res.json({
    status: 'active',
    clientCount: clients.size,
    timestamp: new Date().toISOString()
  });
});

// POST endpoint to broadcast a test message
websocketRouter.post('/api/websocket/broadcast', (req, res) => {
  const { type, data } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'Message type is required' });
  }
  
  try {
    broadcastMessage(type, data || {});
    res.json({ success: true, clientCount: clients.size });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default websocketRouter;

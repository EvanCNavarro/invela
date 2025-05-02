/**
 * WebSocket Broadcast Utility
 * 
 * This module provides robust utilities for broadcasting messages to WebSocket clients
 * with proper error handling and logging.
 */

import { WebSocket, WebSocketServer } from 'ws';

// Configure logging
function logInfo(message: string, ...args: any[]): void {
  console.log(`[WebSocket] ${message}`, ...args);
}

function logError(message: string, ...args: any[]): void {
  console.error(`[WebSocket] ${message}`, ...args);
}

/**
 * Broadcast a message to all connected WebSocket clients
 * with proper error handling and payload formatting
 */
export function broadcastMessage(wss: WebSocketServer, type: string, payload: any): void {
  if (!wss) {
    logError('Cannot broadcast: WebSocket server is not initialized');
    return;
  }
  
  const message = JSON.stringify({
    type,
    payload,  // Use consistent 'payload' key for all messages
  });
  
  let clientCount = 0;
  let errorCount = 0;
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        clientCount++;
      } catch (error) {
        errorCount++;
        logError('Error sending message to client:', error);
      }
    }
  });
  
  logInfo(`Broadcast ${type} to ${clientCount} clients (${errorCount} errors)`);
}

/**
 * Check if any clients are currently connected to the WebSocket server
 */
export function hasConnectedClients(wss: WebSocketServer): boolean {
  if (!wss) return false;
  
  let connectedCount = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      connectedCount++;
    }
  });
  
  return connectedCount > 0;
}

/**
 * Set up event handlers for the WebSocket server
 */
export function setupWebSocketServerHandlers(wss: WebSocketServer): void {
  if (!wss) {
    logError('Cannot set up handlers: WebSocket server is not initialized');
    return;
  }
  
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    logInfo(`New client connected from ${clientIp}`);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logInfo(`Received message of type: ${message.type}`);
      } catch (error) {
        logError('Error parsing message:', error);
      }
    });
    
    ws.on('error', (error) => {
      logError('Client connection error:', error);
    });
    
    ws.on('close', (code, reason) => {
      logInfo(`Client disconnected: Code ${code}, Reason: ${reason || 'No reason provided'}`);
    });
    
    // Send welcome message
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        payload: {
          message: 'Connection established',
          timestamp: new Date().toISOString(),
        }
      }));
    } catch (error) {
      logError('Error sending welcome message:', error);
    }
  });
  
  wss.on('error', (error) => {
    logError('WebSocket server error:', error);
  });
  
  wss.on('close', () => {
    logInfo('WebSocket server closed');
  });
  
  logInfo('WebSocket server handlers configured');
}

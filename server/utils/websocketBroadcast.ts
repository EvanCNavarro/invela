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
 * Simple and reliable implementation with heartbeat and basic error handling
 */
export function setupWebSocketServerHandlers(wss: WebSocketServer): void {
  if (!wss) {
    logError('Cannot set up handlers: WebSocket server is not initialized');
    return;
  }
  
  // Set up server-side ping interval to detect dead connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      // @ts-ignore - we're adding isAlive property
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      // @ts-ignore - mark as not alive until we get a response
      ws.isAlive = false;
      
      // Send ping
      try {
        ws.send(JSON.stringify({ type: 'server_ping', timestamp: new Date().toISOString() }));
      } catch (e) {
        // Ignore errors on potentially dead connections
      }
    });
  }, 40000); // 40 second interval
  
  // Handle new connections
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    logInfo(`New client connected from ${clientIp}`);
    
    // Mark as alive initially
    // @ts-ignore - adding isAlive property
    ws.isAlive = true;
    
    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Mark as alive for any message
        // @ts-ignore - using isAlive property
        ws.isAlive = true;
        
        // Don't log ping messages to reduce noise
        if (message.type !== 'ping') {
          logInfo(`Received message of type: ${message.type}`);
        }
        
        // Handle ping messages
        if (message.type === 'ping') {
          try {
            ws.send(JSON.stringify({
              type: 'pong',
              payload: {
                timestamp: new Date().toISOString(),
                echo: message.timestamp
              }
            }));
          } catch (e) {
            // Ignore errors
          }
        }
      } catch (error) {
        logError('Error parsing message:', error);
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logError('WebSocket error:', error);
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
      logInfo(`Client disconnected: Code ${code}, Reason: ${reason || 'No reason provided'}`);
    });
    
    // Send welcome message
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        payload: {
          message: 'Connection established',
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      logError('Error sending welcome message:', error);
    }
  });
  
  // Handle server errors
  wss.on('error', (error) => {
    logError('WebSocket server error:', error);
  });
  
  // Handle server shutdown
  wss.on('close', () => {
    clearInterval(pingInterval);
    logInfo('WebSocket server closed');
  });
  
  logInfo('WebSocket server handlers configured');
}

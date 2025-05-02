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
 * Includes connection tracking, heartbeat monitoring, and ping/pong handling
 */
export function setupWebSocketServerHandlers(wss: WebSocketServer): void {
  if (!wss) {
    logError('Cannot set up handlers: WebSocket server is not initialized');
    return;
  }
  
  // Set up server-side ping interval to detect dead connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      // @ts-ignore - we're adding our own property
      if (ws.isAlive === false) {
        logInfo('Terminating inactive connection');
        return ws.terminate();
      }
      
      // @ts-ignore - we're adding our own property
      ws.isAlive = false;
      try {
        ws.send(JSON.stringify({ type: 'server_ping', timestamp: new Date().toISOString() }));
      } catch (e) {
        // Ignore errors on potentially dead connections
      }
    });
  }, 45000); // 45 second interval, slightly more than client heartbeat
  
  // Clean up interval on server close - will be connected to the other close handler below
  
  // Handle new connections
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    logInfo(`New client connected from ${clientIp}`);
    
    // Initialize connection tracking properties
    // @ts-ignore - we're adding custom properties
    ws.isAlive = true;
    // @ts-ignore - track additional connection info
    ws.connectionInfo = {
      clientIp,
      connectedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messageCount: 0
    };
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Mark connection as alive for any message (implicit pong)
        // @ts-ignore - we're using our own property
        ws.isAlive = true;
        
        // Update connection stats
        // @ts-ignore - updating custom property
        if (ws.connectionInfo) {
          // @ts-ignore - updating custom property
          ws.connectionInfo.lastMessageAt = new Date().toISOString();
          // @ts-ignore - updating custom property
          ws.connectionInfo.messageCount += 1;
        }
        
        // For non-ping messages, log the type
        if (message.type !== 'ping') {
          logInfo(`Received message of type: ${message.type}`);
        }
        
        // Handle ping messages with pong response
        if (message.type === 'ping') {
          try {
            ws.send(JSON.stringify({
              type: 'pong',
              payload: {
                timestamp: new Date().toISOString(),
                echo: message.timestamp // Echo back the client's timestamp if available
              }
            }));
          } catch (pingError) {
            logError('Error sending pong response:', pingError);
          }
        }
        
        // Handle explicit pong responses to server_ping
        if (message.type === 'pong' || message.type === 'server_pong') {
          // @ts-ignore - we're using our own property
          ws.isAlive = true;
        }
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
    // Clean up heartbeat interval
    clearInterval(pingInterval);
    logInfo('WebSocket server closed, heartbeat cleared');
  });
  
  logInfo('WebSocket server handlers configured');
}

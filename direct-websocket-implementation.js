/**
 * Direct WebSocket Implementation
 * 
 * This script adds WebSocket functionality to enable real-time updates for 
 * tab tutorials and other interactive elements. It follows the blueprint
 * guidelines for WebSocket implementation.
 */
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

// Message types for WebSocket communication
const MESSAGE_TYPES = {
  PING: 'ping',
  PONG: 'pong',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  TUTORIAL_PROGRESS: 'tutorial_progress',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  TASK_UPDATED: 'task_updated',
  ERROR: 'error'
};

// Create a new Express app
const app = express();

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Create a WebSocket server attached to the HTTP server with a specific path
const wss = new WebSocketServer({ 
  server, 
  path: '/ws' 
});

// Store connected clients
const clients = new Map();

// Handle WebSocket connection
wss.on('connection', (ws, req) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  
  console.log(`WebSocket client connected: ${clientId}`);
  
  // Store the client connection
  clients.set(clientId, {
    ws,
    userId: null,
    companyId: null,
    authenticated: false,
    lastSeen: Date.now()
  });
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection_established',
    clientId,
    timestamp: new Date().toISOString(),
    message: 'Connection established'
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(clientId, data);
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
      sendError(ws, 'Invalid message format');
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log(`WebSocket client disconnected: ${clientId}`);
    clients.delete(clientId);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
  });
});

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const { ws } = client;
  
  // Update last seen timestamp
  client.lastSeen = Date.now();
  
  switch (data.type) {
    case MESSAGE_TYPES.PING:
      // Respond to ping with pong
      ws.send(JSON.stringify({
        type: MESSAGE_TYPES.PONG,
        timestamp: new Date().toISOString(),
        echo: data
      }));
      break;
      
    case MESSAGE_TYPES.AUTHENTICATE:
      // Authenticate the client
      if (data.userId) {
        client.userId = data.userId;
        client.companyId = data.companyId || null;
        client.authenticated = true;
        
        ws.send(JSON.stringify({
          type: MESSAGE_TYPES.AUTHENTICATED,
          timestamp: new Date().toISOString(),
          message: 'Authentication successful'
        }));
        
        console.log(`WebSocket client authenticated: ${clientId} (User: ${client.userId}, Company: ${client.companyId})`);
      } else {
        // Authentication without userId still succeeds but with limited access
        client.authenticated = true;
        
        ws.send(JSON.stringify({
          type: MESSAGE_TYPES.AUTHENTICATED,
          timestamp: new Date().toISOString(),
          message: 'Authentication successful (anonymous)'
        }));
      }
      break;
      
    case MESSAGE_TYPES.TUTORIAL_PROGRESS:
      // Update tutorial progress
      if (!client.authenticated) {
        sendError(ws, 'Authentication required');
        return;
      }
      
      // Broadcasting is handled by the server when progress is updated
      // This is just for receiving client updates
      console.log(`Tutorial progress update from ${clientId}: ${JSON.stringify(data.progress)}`);
      break;
      
    default:
      console.log(`Received message of type ${data.type} from ${clientId}`);
  }
}

/**
 * Send an error message to a client
 */
function sendError(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ERROR,
      timestamp: new Date().toISOString(),
      message
    }));
  }
}

/**
 * Broadcast a message to all connected clients or filtered by criteria
 * 
 * @param {Object} message - The message to broadcast
 * @param {Function} filter - Optional filter function to select clients
 */
function broadcastMessage(message, filter = null) {
  const timestamp = new Date().toISOString();
  
  clients.forEach((client, clientId) => {
    const { ws, authenticated, userId, companyId } = client;
    
    // Skip if client is not authenticated
    if (!authenticated) return;
    
    // Apply filter if provided
    if (filter && !filter({ clientId, userId, companyId })) return;
    
    // Send message if connection is open
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp
      }));
    }
  });
}

/**
 * Broadcast tutorial progress update
 * 
 * @param {string} tabName - The name of the tab
 * @param {Object} progress - Progress details
 * @param {number} userId - User ID to target (or null for all)
 */
function broadcastTutorialProgress(tabName, progress, userId = null) {
  broadcastMessage(
    {
      type: MESSAGE_TYPES.TUTORIAL_PROGRESS,
      tabName,
      progress
    },
    userId ? (client) => client.userId === userId.toString() : null
  );
}

/**
 * Broadcast tutorial completion
 * 
 * @param {string} tabName - The name of the tab
 * @param {number} userId - User ID to target (or null for all)
 */
function broadcastTutorialCompleted(tabName, userId = null) {
  broadcastMessage(
    {
      type: MESSAGE_TYPES.TUTORIAL_COMPLETED,
      tabName
    },
    userId ? (client) => client.userId === userId.toString() : null
  );
}

// Export the WebSocket functions for use in other modules
module.exports = {
  broadcastMessage,
  broadcastTutorialProgress,
  broadcastTutorialCompleted
};
/**
 * WebSocket Server Implementation
 * 
 * This script creates a dedicated WebSocket server for real-time task updates
 * to notify clients about task status changes, progress updates, and form submissions.
 */

// Import required modules
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

// Create a simple Express server for testing
const app = express();
const port = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server on a distinct path to avoid conflicts with Vite's HMR
const wss = new WebSocketServer({ 
  server: server, 
  path: '/ws'
});

// Store connected clients
const clients = new Map();

// Listen for WebSocket connection events
wss.on('connection', (ws) => {
  // Generate a unique client ID
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Add client to the map with authentication status
  clients.set(ws, {
    id: clientId,
    authenticated: false,
    userId: null,
    companyId: null
  });
  
  console.log(`Client connected: ${clientId}`);
  console.log(`Total clients: ${clients.size}`);
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection_established',
    clientId: clientId,
    timestamp: new Date().toISOString(),
    message: 'Connection established'
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received message from ${clientId}:`, data);
      
      // Handle authentication
      if (data.type === 'authenticate') {
        handleAuthentication(ws, data);
      }
      
      // Handle ping
      if (data.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString(),
          echo: { type: 'ping' }
        }));
      }
      
      // Handle task update requests
      if (data.type === 'update_task' && isAuthenticated(ws)) {
        const client = clients.get(ws);
        handleTaskUpdate(data.taskId, data.status, data.progress, client.userId);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    const client = clients.get(ws);
    console.log(`Client disconnected: ${client?.id || 'unknown'}`);
    clients.delete(ws);
    console.log(`Remaining clients: ${clients.size}`);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

/**
 * Handle client authentication
 */
function handleAuthentication(ws, data) {
  const client = clients.get(ws);
  
  if (!client) return;
  
  // Update client info with user and company IDs if provided
  if (data.userId && data.companyId) {
    client.userId = data.userId;
    client.companyId = data.companyId;
    client.authenticated = true;
    
    console.log(`Client authenticated: ${client.id} (User: ${client.userId}, Company: ${client.companyId})`);
    
    // Send authentication confirmation
    ws.send(JSON.stringify({
      type: 'authenticated',
      timestamp: new Date().toISOString(),
      message: 'Authentication successful'
    }));
  } else {
    // Basic authentication without user details
    client.authenticated = true;
    
    console.log(`Client authenticated without user details: ${client.id}`);
    
    // Send authentication confirmation
    ws.send(JSON.stringify({
      type: 'authenticated',
      timestamp: new Date().toISOString(),
      message: 'Authentication successful'
    }));
  }
}

/**
 * Check if a client is authenticated
 */
function isAuthenticated(ws) {
  const client = clients.get(ws);
  return client && client.authenticated;
}

/**
 * Broadcast a message to all authenticated clients
 */
function broadcast(message, filter = null) {
  let recipientCount = 0;
  
  clients.forEach((client, ws) => {
    // Skip clients that are not authenticated
    if (!client.authenticated) return;
    
    // Apply filter if provided
    if (filter && !filter(client)) return;
    
    // Send message to client
    if (ws.readyState === WebSocketServer.OPEN) {
      ws.send(JSON.stringify(message));
      recipientCount++;
    }
  });
  
  console.log(`Broadcast message of type '${message.type}' sent to ${recipientCount} clients (total: ${clients.size})`);
  return recipientCount;
}

/**
 * Handle task update and broadcast to clients
 */
function handleTaskUpdate(taskId, status, progress, userId) {
  // Validate inputs
  if (!taskId || !status) {
    console.error('Invalid task update parameters:', { taskId, status, progress });
    return;
  }
  
  // Create task update message
  const message = {
    type: 'task_update',
    payload: {
      taskId: taskId,
      status: status,
      progress: progress || 0,
      metadata: {
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
  };
  
  // Broadcast to all authenticated clients
  broadcast(message);
  
  console.log(`Task update broadcasted: Task #${taskId} - Status: ${status}, Progress: ${progress}%`);
}

/**
 * Handle form submission completion and broadcast to clients
 */
function broadcastFormSubmissionCompleted(taskId, formType, company) {
  // Create form submission completion message
  const message = {
    type: 'form_submission_completed',
    payload: {
      taskId: taskId,
      formType: formType,
      timestamp: new Date().toISOString(),
      companyId: company?.id,
      companyName: company?.name,
      unlockedTabs: company?.availableTabs || []
    }
  };
  
  // Filter to only send to clients of the same company
  const companyFilter = (client) => {
    return !client.companyId || client.companyId === company?.id;
  };
  
  // Broadcast to matching clients
  broadcast(message, companyFilter);
  
  console.log(`Form submission completion broadcasted: Task #${taskId} - Type: ${formType}`);
}

/**
 * Handle company tabs update and broadcast to clients
 */
function broadcastCompanyTabsUpdated(companyId, availableTabs) {
  // Create company tabs update message
  const message = {
    type: 'company_tabs_updated',
    payload: {
      companyId: companyId,
      availableTabs: availableTabs,
      timestamp: new Date().toISOString()
    }
  };
  
  // Filter to only send to clients of the specified company
  const companyFilter = (client) => {
    return !client.companyId || client.companyId === companyId;
  };
  
  // Broadcast to matching clients
  broadcast(message, companyFilter);
  
  console.log(`Company tabs update broadcasted: Company #${companyId} - Tabs: ${availableTabs.join(', ')}`);
}

// Expose the HTTP server, WebSocket server, and broadcast functions
module.exports = {
  httpServer: server,
  wss: wss,
  broadcast: broadcast,
  broadcastTaskUpdate: handleTaskUpdate,
  broadcastFormSubmissionCompleted: broadcastFormSubmissionCompleted,
  broadcastCompanyTabsUpdated: broadcastCompanyTabsUpdated
};

// Start the server if this script is run directly
if (require.main === module) {
  // Add a basic route for testing
  app.get('/', (req, res) => {
    res.send('WebSocket Server is running. Connect to /ws for real-time updates.');
  });
  
  // Start the server
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    console.log(`WebSocket server available at ws://0.0.0.0:${port}/ws`);
  });
}
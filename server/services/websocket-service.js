/**
 * WebSocket Service
 * 
 * This module creates and manages a WebSocket server for real-time 
 * communication between the server and clients. It handles client 
 * connections, authentication, and message broadcasting.
 * 
 * Usage:
 * ```
 * const { setupWebSocketServer, broadcastTaskUpdate } = require('./services/websocket-service');
 * 
 * // In your main server file
 * const server = http.createServer(app);
 * setupWebSocketServer(server);
 * 
 * // To broadcast a task update
 * broadcastTaskUpdate(taskId, status, progress);
 * ```
 */

const { WebSocketServer } = require('ws');

// Store references to WebSocket objects
let wss = null;
const clients = new Map();

/**
 * Set up WebSocket server for realtime updates
 *
 * @param {http.Server} httpServer - The HTTP server to attach the WebSocket server to
 * @returns {WebSocketServer} The WebSocket server
 */
function setupWebSocketServer(httpServer) {
  if (wss) {
    console.log('[WebSocket] WebSocket server already initialized');
    return wss;
  }
  
  // Create WebSocket server on a distinct path to avoid conflicts with Vite's HMR
  wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });
  
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
    
    console.log(`[WebSocket] Client connected: ${clientId}`);
    console.log(`[WebSocket] Total clients: ${clients.size}`);
    
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
        console.log(`[WebSocket] Received message from client ${clientId}:`, data);
        
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
        console.error('[WebSocket] Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
      const client = clients.get(ws);
      console.log(`[WebSocket] Client disconnected: ${client?.id || 'unknown'}`, { code, reason: reason.toString() });
      clients.delete(ws);
      console.log(`[WebSocket] Remaining clients: ${clients.size}`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('[WebSocket] WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  console.log('[WebSocket] WebSocket server initialized');
  return wss;
}

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
    
    console.log(`[WebSocket] Client authenticated: ${client.id} (User: ${client.userId}, Company: ${client.companyId})`);
    
    // Send authentication confirmation
    ws.send(JSON.stringify({
      type: 'authenticated',
      timestamp: new Date().toISOString(),
      message: 'Authentication successful'
    }));
  } else {
    // Basic authentication without user details
    client.authenticated = true;
    
    console.log(`[WebSocket] Client authenticated without user details: ${client.id}`);
    
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
 * 
 * @param {Object} message - The message to broadcast
 * @param {Function} filter - Optional filter function to determine which clients receive the message
 * @returns {number} The number of clients that received the message
 */
function broadcast(message, filter = null) {
  if (!wss) {
    console.warn('[WebSocket] WebSocket server not initialized, message not broadcast');
    return 0;
  }
  
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
  
  console.log(`[WebSocket] Broadcast message of type '${message.type}' sent to ${recipientCount} clients (total: ${clients.size})`);
  return recipientCount;
}

/**
 * Broadcast a task update to all connected clients
 * 
 * @param {number|string} taskId - The ID of the task that was updated
 * @param {string} status - The new status of the task
 * @param {number} progress - The new progress value (0-100)
 * @param {Object} metadata - Additional metadata about the task update
 * @returns {number} The number of clients that received the update
 */
function broadcastTaskUpdate(taskId, status, progress = null, metadata = {}) {
  // Create task update message
  const message = {
    type: 'task_update',
    payload: {
      id: taskId,
      status: status,
      progress: progress || 0,
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
  };
  
  // Broadcast to all authenticated clients
  return broadcast(message);
}

/**
 * Broadcast a form submission completion notification
 * 
 * @param {number|string} taskId - The ID of the task that was submitted
 * @param {string} formType - The type of form that was submitted (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param {Object} result - The result of the form submission
 * @returns {number} The number of clients that received the notification
 */
function broadcastFormSubmission(taskId, formType, result) {
  // Create form submission message
  const message = {
    type: 'form_submission_completed',
    payload: {
      taskId: taskId,
      formType: formType,
      success: result.success,
      fileId: result.fileId,
      fileName: result.fileName,
      unlockedTabs: result.unlockedTabs || [],
      timestamp: new Date().toISOString()
    }
  };
  
  // If the submission includes a company ID, filter to only send to clients of that company
  let filter = null;
  if (result.companyId) {
    filter = (client) => !client.companyId || client.companyId === result.companyId;
  }
  
  // Broadcast to clients
  return broadcast(message, filter);
}

/**
 * Broadcast a company tabs update notification
 * 
 * @param {number|string} companyId - The ID of the company whose tabs were updated
 * @param {string[]} availableTabs - The updated list of available tabs
 * @returns {number} The number of clients that received the notification
 */
function broadcastCompanyTabsUpdate(companyId, availableTabs) {
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
  const companyFilter = (client) => !client.companyId || client.companyId === companyId;
  
  // Broadcast to matching clients
  return broadcast(message, companyFilter);
}

/**
 * Get the current WebSocket server instance
 * 
 * @returns {WebSocketServer|null} The WebSocket server instance, or null if not initialized
 */
function getWebSocketServer() {
  return wss;
}

/**
 * Get the count of connected clients
 * 
 * @returns {number} The number of connected clients
 */
function getClientCount() {
  return clients.size;
}

/**
 * Get information about connected clients
 * 
 * @returns {Array} Array of client information objects
 */
function getClientInfo() {
  return Array.from(clients.values()).map(client => ({
    id: client.id,
    authenticated: client.authenticated,
    userId: client.userId,
    companyId: client.companyId
  }));
}

// Export functions for use in other modules
module.exports = {
  setupWebSocketServer,
  getWebSocketServer,
  broadcast,
  broadcastTaskUpdate,
  broadcastFormSubmission,
  broadcastCompanyTabsUpdate,
  getClientCount,
  getClientInfo
};
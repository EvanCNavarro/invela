/**
 * Direct JavaScript WebSocket Implementation
 * 
 * This file provides a direct JavaScript implementation of WebSocket functionality
 * that can be used in both CommonJS and ESM contexts. It's designed to be a reliable
 * fallback mechanism if the TypeScript WebSocket implementations fail.
 * 
 * Usage:
 * const { setupWebSocketServer, broadcastTask } = require('./direct-websocket-implementation');
 * 
 * // In your Express/HTTP server setup:
 * const httpServer = http.createServer(app);
 * const wss = setupWebSocketServer(httpServer);
 * 
 * // To broadcast a task update:
 * broadcastTask(763, 'ready_for_submission', 100);
 */

const { WebSocketServer } = require('ws');
const path = require('path');
const randomBytes = require('crypto').randomBytes;

// Global WebSocket server instance
let wss = null;

/**
 * Generate a unique message ID for tracking
 * @returns {string} A unique message ID
 */
function generateMessageId() {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `msg_${timestamp}_${random}`;
}

/**
 * Set up the WebSocket server on the specified HTTP server
 * 
 * @param {import('http').Server} httpServer - The HTTP server to attach to
 * @param {string} wsPath - The WebSocket path (default: '/ws')
 * @returns {import('ws').WebSocketServer} The WebSocket server instance
 */
function setupWebSocketServer(httpServer, wsPath = '/ws') {
  // Create WebSocket server with proper path to avoid conflict with Vite HMR
  wss = new WebSocketServer({ 
    server: httpServer, 
    path: wsPath,
    clientTracking: true 
  });
  
  console.log(`[WebSocket] Server initialized on path: ${wsPath}`);
  
  // Set up connection handler
  wss.on('connection', (ws) => {
    console.log('[WebSocket] New client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    }));
    
    // Set up message handler
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        // Handle authentication message to attach user info to the connection
        if (data.type === 'authenticate') {
          ws.userId = data.userId;
          ws.companyId = data.companyId;
          console.log(`[WebSocket] Client authenticated: user=${data.userId}, company=${data.companyId}`);
        }
      } catch (e) {
        console.error('[WebSocket] Error parsing message:', e);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  });
  
  return wss;
}

/**
 * Broadcast a message to all connected clients
 * 
 * @param {string} type - The message type
 * @param {any} payload - The message payload
 * @returns {Object} Result with success status and client count
 */
function broadcast(type, payload) {
  if (!wss) {
    console.error('[WebSocket] Cannot broadcast: Server not initialized');
    return { success: false, error: 'Server not initialized' };
  }
  
  const messageId = generateMessageId();
  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
    messageId
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
        successCount++;
      } catch (e) {
        console.error('[WebSocket] Error sending to client:', e);
        errorCount++;
      }
    }
  });
  
  console.log(`[WebSocket] Broadcast ${type} to ${successCount} clients (${errorCount} errors)`, { messageId });
  
  return { 
    success: successCount > 0, 
    clients: successCount,
    errors: errorCount,
    messageId 
  };
}

/**
 * Broadcast a task update
 * 
 * @param {number} taskId - The task ID
 * @param {string} status - The task status
 * @param {number} progress - The task progress (0-100)
 * @param {Object} metadata - Optional metadata
 * @returns {Object} Result with success status and client count
 */
function broadcastTask(taskId, status, progress, metadata = {}) {
  return broadcast('task_update', {
    id: taskId,
    status,
    progress,
    metadata: {
      ...metadata,
      lastUpdated: new Date().toISOString()
    }
  });
}

/**
 * Broadcast a form submission update
 * 
 * @param {number} taskId - The task ID
 * @param {string} formType - The form type (kyb, ky3p, etc.)
 * @param {string} status - The submission status
 * @returns {Object} Result with success status and client count
 */
function broadcastFormSubmission(taskId, formType, status) {
  return broadcast('form_submission', {
    taskId,
    formType,
    status,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast company tabs update
 * 
 * @param {number} companyId - The company ID
 * @param {string[]} tabs - The available tabs
 * @returns {Object} Result with success status and client count
 */
function broadcastCompanyTabs(companyId, tabs) {
  return broadcast('company_tabs_update', {
    companyId,
    availableTabs: tabs,
    timestamp: new Date().toISOString()
  });
}

/**
 * Check if the WebSocket server is initialized
 * 
 * @returns {boolean} Whether the server is initialized
 */
function isServerInitialized() {
  return !!wss;
}

/**
 * Get the number of connected clients
 * 
 * @returns {number} The number of connected clients
 */
function getConnectedClientCount() {
  return wss ? wss.clients.size : 0;
}

// Export the API
module.exports = {
  setupWebSocketServer,
  broadcast,
  broadcastTask,
  broadcastFormSubmission,
  broadcastCompanyTabs,
  isServerInitialized,
  getConnectedClientCount
};
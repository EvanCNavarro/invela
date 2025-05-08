/**
 * Direct WebSocket Server Handler Implementation
 * 
 * This is a standalone implementation of WebSocket server functionality
 * that can be used directly in your Express application to ensure
 * proper WebSocket handling for form submissions.
 * 
 * Usage:
 * 1. Import the setupWebSocketServer function in your server/routes.ts file
 * 2. Create a WebSocket server with your HTTP server
 * 3. Use broadcastFormSubmission to notify clients of form submission events
 */

const WebSocket = require('ws');
const crypto = require('crypto');

// Store WebSocket server instance
let wss = null;

// Generate a unique message ID for tracking
function generateMessageId() {
  return `msg_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
}

/**
 * Set up the WebSocket server on the HTTP server
 * 
 * @param {import('http').Server} httpServer - The HTTP server to attach to
 * @param {string} wsPath - The WebSocket path (default: '/ws')
 * @returns {import('ws').WebSocketServer} The WebSocket server instance
 */
function setupWebSocketServer(httpServer, wsPath = '/ws') {
  if (wss) {
    console.log('[WebSocket] Server already initialized');
    return wss;
  }
  
  // Create a new WebSocket server
  wss = new WebSocket.Server({ 
    server: httpServer, 
    path: wsPath,
    // Skip Vite's HMR WebSocket requests
    verifyClient: (info) => {
      const protocol = info.req.headers['sec-websocket-protocol'] || '';
      return protocol !== 'vite-hmr';
    }
  });
  
  // Set up event handlers
  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Connected to WebSocket server'
    }));
    
    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        // Handle ping messages with pong response
        if (message.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString(),
            echo: message
          }));
        }
      } catch (error) {
        console.error('[WebSocket] Error handling message:', error);
      }
    });
    
    // Handle connection close
    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
    });
  });
  
  console.log(`[WebSocket] Server initialized on path: ${wsPath}`);
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
  
  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
    messageId: generateMessageId()
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        console.error('[WebSocket] Error sending to client:', error);
        errorCount++;
      }
    }
  });
  
  console.log(`[WebSocket] Broadcast ${type} to ${successCount} clients (${errorCount} errors)`, { 
    messageId: extractMessageId(message) 
  });
  
  return { 
    success: true, 
    clientCount: successCount,
    errorCount,
    messageId: extractMessageId(message)
  };
}

// Helper to extract messageId from stringified message
function extractMessageId(message) {
  try {
    return JSON.parse(message).messageId;
  } catch (e) {
    return null;
  }
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
    payload: {
      id: taskId,
      status,
      progress,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      diagnosticId: `broadcast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    },
    data: {
      id: taskId,
      status,
      progress,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      diagnosticId: `broadcast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    },
    taskId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast a form submission update
 * 
 * @param {Object} options - Options for the broadcast
 * @param {number} options.taskId - The task ID
 * @param {string} options.formType - The form type (kyb, ky3p, etc.)
 * @param {string} options.status - The submission status
 * @param {number} options.companyId - The company ID
 * @param {Object} options.metadata - Additional metadata
 * @returns {Object} Result with success status and client count
 */
function broadcastFormSubmission(options) {
  const { taskId, formType, status, companyId, metadata = {} } = options;
  
  // Generate a unique tracking ID for this broadcast
  const broadcastId = `form-submission-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  return broadcast('form_submission', {
    taskId,
    formType,
    status,
    companyId,
    timestamp: new Date().toISOString(),
    broadcastId,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      broadcastId
    }
  });
}

/**
 * Broadcast a form submission error
 * 
 * @param {Object} options - Options for the broadcast
 * @param {number} options.taskId - The task ID
 * @param {string} options.formType - The form type (kyb, ky3p, etc.)
 * @param {string} options.error - The error message
 * @param {number} options.companyId - The company ID
 * @param {Object} options.metadata - Additional metadata
 * @returns {Object} Result with success status and client count
 */
function sendFormSubmissionError(options) {
  const { taskId, formType, error, companyId, metadata = {}, message } = options;
  
  return broadcast('form_submission_error', {
    taskId,
    formType,
    error,
    message: message || `Error submitting ${formType} form: ${error}`,
    companyId,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      broadcastId: `form-error-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    }
  });
}

/**
 * Broadcast a form submission in progress update
 * 
 * @param {Object} options - Options for the broadcast
 * @param {number} options.taskId - The task ID
 * @param {string} options.formType - The form type (kyb, ky3p, etc.)
 * @param {number} options.progress - The progress percentage (0-100)
 * @param {number} options.companyId - The company ID
 * @param {string} options.message - A message describing the current status
 * @param {Object} options.metadata - Additional metadata
 * @returns {Object} Result with success status and client count
 */
function sendFormSubmissionInProgress(options) {
  const { taskId, formType, progress, companyId, message, metadata = {} } = options;
  
  return broadcast('form_submission_progress', {
    taskId,
    formType,
    progress,
    message: message || `${formType.toUpperCase()} form submission in progress (${progress}%)`,
    companyId,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      broadcastId: `form-progress-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    }
  });
}

/**
 * Broadcast company tabs update
 * 
 * @param {number} companyId - The company ID
 * @param {string[]} tabs - The available tabs
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Result with success status and client count
 */
function broadcastCompanyTabs(companyId, tabs, metadata = {}) {
  return broadcast('company_tabs_updated', {
    companyId,
    availableTabs: tabs,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
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
  if (!wss) return 0;
  
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      count++;
    }
  });
  
  return count;
}

// Export the functions for direct use
module.exports = {
  setupWebSocketServer,
  broadcast,
  broadcastTask,
  broadcastFormSubmission,
  sendFormSubmissionError,
  sendFormSubmissionInProgress,
  broadcastCompanyTabs,
  isServerInitialized,
  getConnectedClientCount
};
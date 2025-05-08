/**
 * WebSocket Service for Real-time Task Updates
 * 
 * This service provides WebSocket functionality for broadcasting task updates,
 * form submission events, and other real-time notifications to connected clients.
 * 
 * Key Features:
 * - Client authentication and session management
 * - Task status and progress updates
 * - Form submission notifications
 * - Company tabs unlocking notifications
 */

const { WebSocketServer } = require('ws');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Store authenticated clients with their user/company info
const clients = new Map();
// Track message IDs to prevent duplicates
let messageCounter = 0;

/**
 * Initialize WebSocket server
 * 
 * @param {Object} server HTTP server instance to attach WebSocket server to
 * @returns {WebSocketServer} Initialized WebSocket server
 */
function initializeWebSocketServer(server) {
  console.log(`${colors.blue}[WebSocket] Initializing WebSocket server${colors.reset}`);
  
  // Create WebSocket server with a distinct path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });
  
  // Set up connection handler
  wss.on('connection', (ws, req) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    
    console.log(`${colors.green}[WebSocket] Client connected ${clientId}${colors.reset}`);
    
    // Store client connection
    clients.set(ws, {
      id: clientId,
      authenticated: false,
      userId: null,
      companyId: null
    });
    
    // Send connection established message
    sendMessage(ws, {
      type: 'connection_established',
      clientId,
      message: 'Connection established'
    });
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`${colors.cyan}[WebSocket] Received message from client ${clientId}${colors.reset}`, data);
        
        // Handle different message types
        if (data.type === 'authenticate') {
          handleAuthentication(ws, data);
        } else if (data.type === 'ping') {
          handlePing(ws, data);
        } else {
          console.log(`${colors.yellow}[WebSocket] Unhandled message type: ${data.type}${colors.reset}`);
        }
      } catch (error) {
        console.error(`${colors.red}[WebSocket] Error processing message:${colors.reset}`, error);
      }
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
      const clientInfo = clients.get(ws);
      console.log(`${colors.yellow}[WebSocket] Client disconnected ${clientInfo?.id || 'unknown'}${colors.reset}`, {
        code,
        reason: reason.toString(),
        remainingClients: clients.size - 1
      });
      
      // Remove client from registry
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`${colors.red}[WebSocket] Connection error:${colors.reset}`, error);
    });
  });
  
  console.log(`${colors.green}[WebSocket] Server initialized successfully${colors.reset}`);
  return wss;
}

/**
 * Handle client authentication
 * 
 * @param {WebSocket} ws WebSocket connection
 * @param {Object} data Authentication data with userId and companyId
 */
function handleAuthentication(ws, data) {
  const clientInfo = clients.get(ws);
  
  if (!clientInfo) {
    console.error(`${colors.red}[WebSocket] Client not found for authentication${colors.reset}`);
    return;
  }
  
  const { userId, companyId } = data;
  
  // Update client information
  clients.set(ws, {
    ...clientInfo,
    authenticated: true,
    userId,
    companyId,
    connectionId: data.clientId || data.connectionId
  });
  
  console.log(`${colors.green}[WebSocket] Client ${clientInfo.id} authenticated${colors.reset}`, {
    userId,
    companyId
  });
  
  // Send authentication confirmation
  sendMessage(ws, {
    type: 'authenticated',
    message: 'Authentication successful'
  });
}

/**
 * Handle ping messages to keep connections alive
 * 
 * @param {WebSocket} ws WebSocket connection
 * @param {Object} data Ping data
 */
function handlePing(ws, data) {
  sendMessage(ws, {
    type: 'pong',
    echo: {
      type: 'ping'
    }
  });
}

/**
 * Send a message to a WebSocket client
 * 
 * @param {WebSocket} ws WebSocket connection
 * @param {Object} message Message to send
 */
function sendMessage(ws, message) {
  if (ws.readyState === ws.OPEN) {
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(messageWithTimestamp));
  }
}

/**
 * Broadcast a message to all authenticated clients
 * 
 * @param {Object} message Message to broadcast
 * @param {Function} filter Optional filter function to target specific clients
 * @returns {Object} Result with success count and error count
 */
function broadcast(message, filter = null) {
  let successCount = 0;
  let errorCount = 0;
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;
  
  // Add timestamp and message ID if not present
  const messageWithMeta = {
    ...message,
    timestamp: message.timestamp || new Date().toISOString(),
    messageId
  };
  
  // Broadcast to all authenticated clients that match the filter
  for (const [ws, clientInfo] of clients.entries()) {
    // Skip unauthenticated clients
    if (!clientInfo.authenticated) {
      continue;
    }
    
    // Apply filter if provided
    if (filter && !filter(clientInfo)) {
      continue;
    }
    
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(messageWithMeta));
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`${colors.red}[WebSocket] Error broadcasting to client ${clientInfo.id}:${colors.reset}`, error);
      errorCount++;
    }
  }
  
  console.log(`${colors.blue}[WebSocket] Broadcast ${message.type} to ${successCount} clients (${errorCount} errors)${colors.reset}`, { messageId });
  
  return {
    messageId,
    successCount,
    errorCount
  };
}

/**
 * Broadcast a task update to all authenticated clients
 * 
 * @param {Object} task Task update data with id, status, and progress
 * @returns {Object} Broadcast result
 */
function broadcastTaskUpdate(task) {
  const { id: taskId, status, progress, metadata = {} } = task;
  
  // Prepare task update message
  const message = {
    type: 'task_update',
    payload: {
      payload: {
        id: taskId,
        status,
        progress,
        metadata,
        timestamp: new Date().toISOString()
      },
      data: {
        id: taskId,
        status,
        progress,
        metadata,
        timestamp: new Date().toISOString()
      },
      taskId,
      timestamp: new Date().toISOString()
    },
    data: {
      payload: {
        id: taskId,
        status,
        progress,
        metadata,
        timestamp: new Date().toISOString()
      },
      data: {
        id: taskId,
        status,
        progress,
        metadata,
        timestamp: new Date().toISOString()
      },
      taskId,
      timestamp: new Date().toISOString()
    }
  };
  
  // Log task update
  console.debug(`${colors.blue}Broadcasting task update with object format${colors.reset}`, { taskId, status });
  console.log(`${colors.green}[WebSocket] Broadcast task_update:${colors.reset}`, { taskId, status, progress });
  
  // Broadcast to all clients
  return broadcast(message);
}

/**
 * Broadcast form submission completion event
 * 
 * @param {number} taskId Task ID that was submitted
 * @param {string} formType Type of form (kyb, ky3p, open_banking)
 * @param {number} companyId Company ID associated with the task
 * @returns {Object} Broadcast result
 */
function broadcastFormSubmissionCompleted(taskId, formType, companyId) {
  const message = {
    type: 'form_submission_completed',
    taskId,
    formType,
    companyId,
    timestamp: new Date().toISOString(),
    submissionDate: new Date().toISOString()
  };
  
  console.log(`${colors.green}[WebSocket] Broadcasting form submission completed:${colors.reset}`, {
    taskId,
    formType,
    companyId
  });
  
  // Broadcast to clients with matching companyId
  return broadcast(message, (client) => client.companyId === companyId);
}

/**
 * Broadcast company tabs update
 * 
 * @param {number} companyId Company ID
 * @param {string[]} availableTabs Updated list of available tabs
 * @returns {Object} Broadcast result
 */
function broadcastCompanyTabsUpdate(companyId, availableTabs) {
  const message = {
    type: 'company_tabs_updated',
    companyId,
    availableTabs,
    timestamp: new Date().toISOString()
  };
  
  console.log(`${colors.green}[WebSocket] Broadcasting company tabs update:${colors.reset}`, {
    companyId,
    tabCount: availableTabs.length
  });
  
  // Broadcast to clients with matching companyId
  return broadcast(message, (client) => client.companyId === companyId);
}

// Export WebSocket functionality
module.exports = {
  initializeWebSocketServer,
  broadcastTaskUpdate,
  broadcastFormSubmissionCompleted,
  broadcastCompanyTabsUpdate,
  broadcast
};
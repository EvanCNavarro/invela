/**
 * Integrate Direct WebSocket Implementation
 * 
 * This script demonstrates how to use the direct JavaScript WebSocket implementation
 * as a fallback mechanism when the TypeScript WebSocket system fails.
 * 
 * Usage: 
 * 1. Run with Node.js: node integrate-direct-websocket.js
 * 2. Or import in your application: const directWs = require('./integrate-direct-websocket');
 */

const directWebSocket = require('./direct-websocket-implementation');
const fs = require('fs');
const path = require('path');

/**
 * Initialize the direct WebSocket implementation with the given HTTP server
 * 
 * @param {import('http').Server} httpServer - The HTTP server to attach to
 * @returns {Object} The direct WebSocket implementation API
 */
function initializeDirectWebSocket(httpServer) {
  if (!httpServer) {
    console.error('[DirectWebSocket] Cannot initialize: HTTP server not provided');
    return null;
  }
  
  try {
    const wss = directWebSocket.setupWebSocketServer(httpServer);
    console.log('[DirectWebSocket] Successfully initialized direct WebSocket implementation');
    
    // Log successful initialization
    log('Direct WebSocket implementation initialized successfully');
    
    return directWebSocket;
  } catch (error) {
    console.error('[DirectWebSocket] Error initializing direct WebSocket implementation:', error);
    
    // Log error
    log(`Error initializing direct WebSocket implementation: ${error.message}`);
    
    return null;
  }
}

/**
 * Log a message to the console and optionally to a file
 * 
 * @param {string} message - The message to log
 * @param {boolean} console - Whether to log to console
 * @param {boolean} file - Whether to log to file
 */
function log(message, console = true, file = true) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  
  if (console) {
    console.log(formattedMessage);
  }
  
  if (file) {
    try {
      fs.appendFileSync(
        path.join(process.cwd(), 'direct-websocket.log'),
        formattedMessage + '\n'
      );
    } catch (error) {
      // Silent failure for file logging
    }
  }
}

/**
 * Broadcast a task update using both the TypeScript and direct WebSocket implementations
 * 
 * @param {number} taskId - The task ID
 * @param {string} status - The task status
 * @param {number} progress - The task progress (0-100)
 * @param {Object} metadata - Optional metadata
 */
function broadcastTaskRedundant(taskId, status, progress, metadata = {}) {
  // First try TypeScript WebSocket implementation
  let typescriptSuccess = false;
  
  try {
    // Try to import the TypeScript WebSocket implementation
    const { broadcastTaskUpdate } = require('./dist/server/services/websocket');
    
    broadcastTaskUpdate({
      id: taskId,
      status,
      progress,
      metadata: {
        ...metadata,
        lastUpdated: new Date().toISOString()
      }
    });
    
    typescriptSuccess = true;
    log(`TypeScript WebSocket broadcast for task ${taskId} successful`);
  } catch (error) {
    log(`TypeScript WebSocket broadcast for task ${taskId} failed: ${error.message}`);
  }
  
  // Then try direct WebSocket implementation
  let directSuccess = false;
  
  try {
    const result = directWebSocket.broadcastTask(taskId, status, progress, metadata);
    directSuccess = result.success;
    
    log(`Direct WebSocket broadcast for task ${taskId}: ${result.success ? 'successful' : 'failed'} (${result.clients} clients)`);
  } catch (error) {
    log(`Direct WebSocket broadcast for task ${taskId} failed: ${error.message}`);
  }
  
  return {
    success: typescriptSuccess || directSuccess,
    typescriptSuccess,
    directSuccess
  };
}

/**
 * Check if the WebSocket system is working properly
 * 
 * @returns {boolean} Whether the WebSocket system is working
 */
function checkWebSocketSystem() {
  try {
    // Try TypeScript WebSocket system
    const { getWebSocketServer } = require('./dist/server/services/websocket');
    const typescriptWss = getWebSocketServer();
    
    const typescriptWorking = !!typescriptWss;
    const directWorking = directWebSocket.isServerInitialized();
    
    log(`WebSocket system check: TypeScript=${typescriptWorking}, Direct=${directWorking}`);
    
    return typescriptWorking || directWorking;
  } catch (error) {
    log(`WebSocket system check failed: ${error.message}`);
    return directWebSocket.isServerInitialized();
  }
}

// Default exports
module.exports = {
  initializeDirectWebSocket,
  broadcastTaskRedundant,
  checkWebSocketSystem,
  directWebSocket
};

// If this script is run directly
if (require.main === module) {
  log('Direct WebSocket integration script running...');
  log('This script should be imported into your application, not run directly.');
  log('See example usage in the script comments.');
}
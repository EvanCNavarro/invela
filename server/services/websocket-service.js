/**
 * Enhanced WebSocket Service
 * 
 * This module provides a centralized service for all WebSocket communications,
 * with improved error handling, reconnection logic, and standardized message formats.
 */

const WebSocket = require('ws');
const logger = require('../utils/logger').logger;
const { broadcast } = require('./websocket');
const { broadcast: unifiedBroadcast } = require('../utils/unified-websocket');

// Store WebSocket server instance
let wss = null;

/**
 * Initialize the WebSocket server
 * @param {Object} httpServer - HTTP server to attach WebSocket to
 * @returns {Object} - WebSocket server instance
 */
function initializeWebSocketServer(httpServer) {
  try {
    if (wss) {
      logger.info('[WebSocketService] WebSocket server already initialized');
      return wss;
    }

    // Create WebSocket server on a distinct path to avoid conflicts with Vite HMR
    wss = new WebSocket.Server({ 
      server: httpServer, 
      path: '/ws',
      clientTracking: true 
    });

    logger.info('[WebSocketService] WebSocket server initialized successfully');

    // Setup connection handler
    wss.on('connection', (ws, req) => {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      ws.id = clientId;
      
      logger.info(`[WebSocketService] Client connected: ${clientId}`);
      
      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Connection established'
      }));

      // Handle messages from client
      ws.on('message', (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          logger.debug(`[WebSocketService] Received message from client ${clientId}:`, parsedMessage);
          
          // Handle authentication
          if (parsedMessage.type === 'authenticate') {
            // For now just confirm authentication
            ws.send(JSON.stringify({
              type: 'authenticated',
              timestamp: new Date().toISOString(),
              message: 'Authentication successful'
            }));
          }
          
          // Handle ping (keep-alive)
          if (parsedMessage.type === 'ping') {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
              echo: parsedMessage
            }));
          }
        } catch (error) {
          logger.error(`[WebSocketService] Error processing message:`, error);
        }
      });
      
      // Handle disconnection
      ws.on('close', (code, reason) => {
        logger.info(`[WebSocketService] Client disconnected: ${clientId}`, { code, reason });
      });
      
      // Handle errors
      ws.on('error', (error) => {
        logger.error(`[WebSocketService] WebSocket error for client ${clientId}:`, error);
      });
    });
    
    // Handle server errors
    wss.on('error', (error) => {
      logger.error(`[WebSocketService] WebSocket server error:`, error);
    });
    
    return wss;
  } catch (error) {
    logger.error(`[WebSocketService] Failed to initialize WebSocket server:`, error);
    return null;
  }
}

/**
 * Broadcast a message to all connected clients
 * @param {string} type - Message type
 * @param {Object} data - Message data
 * @returns {Object} Result with success status and count of recipients
 */
function broadcastMessage(type, data) {
  try {
    if (!wss || !wss.clients) {
      logger.warn(`[WebSocketService] WebSocket server not initialized for broadcast`);
      // Fall back to unified broadcast system
      return fallbackBroadcast(type, data);
    }
    
    const timestamp = new Date().toISOString();
    const message = JSON.stringify({
      type,
      timestamp,
      ...data
    });
    
    let recipients = 0;
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        recipients++;
      }
    });
    
    logger.info(`[WebSocketService] Broadcast ${type} message to ${recipients} clients`);
    
    return {
      success: true,
      recipients,
      totalClients: wss.clients.size
    };
  } catch (error) {
    logger.error(`[WebSocketService] Error broadcasting message:`, error);
    // Fall back to unified broadcast system
    return fallbackBroadcast(type, data);
  }
}

/**
 * Fall back to unified broadcast system
 * @param {string} type - Message type
 * @param {Object} data - Message data
 * @returns {Object} Result with success status
 */
function fallbackBroadcast(type, data) {
  try {
    logger.warn(`[WebSocketService] Falling back to unified broadcast for ${type}`);
    unifiedBroadcast(type, data);
    return {
      success: true,
      fallback: true
    };
  } catch (error) {
    try {
      logger.error(`[WebSocketService] Unified broadcast failed, trying legacy:`, error);
      broadcast(type, data);
      return {
        success: true,
        fallback: 'legacy'
      };
    } catch (legacyError) {
      logger.error(`[WebSocketService] All broadcast methods failed:`, legacyError);
      return {
        success: false,
        error: legacyError.message
      };
    }
  }
}

/**
 * Broadcast a form submission completed event
 * @param {number} taskId - Task ID
 * @param {string} formType - Form type (kyb, ky3p, open_banking)
 * @param {number} companyId - Company ID
 * @returns {Object} Result with success status
 */
function broadcastFormSubmissionCompleted(taskId, formType, companyId) {
  return broadcastMessage('form_submission_completed', {
    taskId,
    formType,
    status: 'submitted',
    companyId,
    submissionDate: new Date().toISOString()
  });
}

/**
 * Broadcast a task update event
 * @param {Object} task - Task object with id, status, progress, and metadata
 * @returns {Object} Result with success status
 */
function broadcastTaskUpdate(task) {
  return broadcastMessage('task_updated', task);
}

/**
 * Broadcast company tabs update
 * @param {number} companyId - Company ID
 * @param {Array} tabs - Array of available tab names
 * @returns {Object} Result with success status
 */
function broadcastCompanyTabsUpdate(companyId, tabs) {
  return broadcastMessage('company_tabs_updated', {
    companyId,
    availableTabs: tabs
  });
}

module.exports = {
  initializeWebSocketServer,
  broadcastMessage,
  broadcastFormSubmissionCompleted,
  broadcastTaskUpdate,
  broadcastCompanyTabsUpdate
};
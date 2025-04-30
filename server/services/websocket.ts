/**
 * WebSocket Service
 * 
 * This module provides functions for managing WebSocket connections
 * and broadcasting messages to connected clients.
 */

import { WebSocketServer } from 'ws';
import http from 'http';
import getLogger from '../utils/logger';

const logger = getLogger('WebSocket');
let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server
 * @param server HTTP server to attach the WebSocket server to
 * @param path Path for the WebSocket server (e.g., '/ws')
 */
export function initWebSocketServer(server: http.Server, path: string = '/ws'): WebSocketServer {
  // Create WebSocket server
  wss = new WebSocketServer({ 
    server, 
    path
  });

  logger.info(`Server initialized on path: ${path}`);
  
  // Set up connection handler
  wss.on('connection', (ws) => {
    logger.info('New WebSocket client connected');
    
    // Send a welcome message
    sendToClient(ws, {
      type: 'connection_established',
      payload: {
        timestamp: new Date().toISOString()
      }
    });
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info('Received message from client:', data);
      } catch (error) {
        logger.error('Error parsing client message:', error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', (code, reason) => {
      logger.info(`WebSocket client disconnected with code ${code} and reason: ${reason}`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket client error:', error);
    });
  });
  
  return wss;
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

/**
 * Send a message to a specific WebSocket client
 */
export function sendToClient(client: any, message: any): boolean {
  try {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error sending message to client:', error);
    return false;
  }
}

/**
 * Broadcast a message to all connected WebSocket clients
 */
export function broadcastMessage(type: string, payload: any): { clientCount: number } {
  if (!wss) {
    logger.error('Cannot broadcast: WebSocket server not initialized');
    return { clientCount: 0 };
  }
  
  let clientCount = 0;
  
  // Add timestamp if not provided
  if (!payload.timestamp) {
    payload.timestamp = new Date().toISOString();
  }
  
  const message = {
    type,
    payload
  };
  
  const messageStr = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
      clientCount++;
    }
  });
  
  // Log details about the broadcast
  const dataKeys = Object.keys(payload);
  logger.info(`Broadcast "${type}" sent to ${clientCount} clients`, {
    type,
    dataKeys,
    timestamp: payload.timestamp,
    clientCount
  });
  
  return { clientCount };
}

/**
 * Alias for broadcastMessage for backward compatibility
 * 
 * @deprecated Use broadcastMessage() instead
 */
export function broadcast(type: string, payload: any): { clientCount: number } {
  return broadcastMessage(type, payload);
}

/**
 * Broadcast a form submission status update
 */
export function broadcastFormSubmission(
  taskId: number, 
  formType: string, 
  status: 'success' | 'error' | 'in_progress',
  companyId: number = 0,
  payload: Record<string, any> = {}
): { clientCount: number } {
  return broadcastMessage('form_submission', {
    taskId,
    formType,
    status,
    companyId,
    ...payload,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast a submission status update to all connected WebSocket clients
 * 
 * @deprecated Use broadcastMessage('submission_status', payload) instead
 */
export function broadcastSubmissionStatus(
  taskId: number,
  formType: string,
  status: 'submitted' | 'pending' | 'in_progress' | 'failed',
  metadata: Record<string, any> = {}
): { clientCount: number } {
  return broadcastMessage('submission_status', {
    taskId,
    formType,
    status,
    metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast a document count update to all connected WebSocket clients
 * 
 * @deprecated Use broadcastMessage('document_count_update', payload) instead
 */
export function broadcastDocumentCountUpdate(
  companyId: number,
  counts: Record<string, number>
): { clientCount: number } {
  return broadcastMessage('document_count_update', {
    companyId,
    counts,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast a company tabs update to all connected WebSocket clients
 * 
 * @deprecated Use broadcastMessage('company_tabs_update', payload) instead
 */
export function broadcastCompanyTabsUpdate(
  companyId: number,
  availableTabs: string[]
): { clientCount: number } {
  return broadcastMessage('company_tabs_update', {
    companyId,
    availableTabs,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast a field update to all connected WebSocket clients
 * 
 * @deprecated Use broadcastMessage('field_update', payload) instead
 */
export function broadcastFieldUpdate(
  taskId: number,
  formType: string,
  fieldId: string,
  value: any,
  metadata: Record<string, any> = {}
): { clientCount: number } {
  return broadcastMessage('field_update', {
    taskId,
    formType,
    fieldId,
    value,
    metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * Close all WebSocket connections and shut down the server
 */
export function closeWebSocketServer(): void {
  if (!wss) {
    return;
  }
  
  logger.info('Closing WebSocket server');
  
  wss.clients.forEach((client) => {
    client.terminate();
  });
  
  wss.close();
  wss = null;
}

/**
 * Broadcast a task update to all connected WebSocket clients
 * 
 * @deprecated Use broadcastMessage('task_update', payload) instead
 */
export function broadcastTaskUpdate(
  taskDataOrId: { 
    id: number; 
    status?: string; 
    progress?: number; 
    metadata?: Record<string, any>;
  } | number,
  progress?: number,
  status?: string,
  metadata?: Record<string, any>
): { clientCount: number } {
  // Handle both object-based and parameter-based calling styles
  if (typeof taskDataOrId === 'object') {
    // Object-based call: broadcastTaskUpdate({ id: 123, status: 'completed' })
    return broadcastMessage('task_update', taskDataOrId);
  } else {
    // Parameter-based call: broadcastTaskUpdate(123, 100, 'completed')
    return broadcastMessage('task_update', {
      id: taskDataOrId,
      progress,
      status,
      metadata: metadata || {}
    });
  }
}

export default {
  initWebSocketServer,
  getWebSocketServer,
  broadcastMessage,
  broadcast,
  broadcastTaskUpdate,
  broadcastFormSubmission,
  broadcastSubmissionStatus,
  broadcastDocumentCountUpdate,
  broadcastCompanyTabsUpdate,
  broadcastFieldUpdate,
  closeWebSocketServer
};
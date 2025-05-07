/**
 * WebSocket Server Module
 * 
 * This module handles real-time WebSocket communication for the application,
 * enabling immediate UI updates when changes occur on the server.
 */

import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { Logger } from './services/logger';

const logger = new Logger('WebSocket');
let wsServer: WebSocketServer | null = null;
const clients = new Set();

/**
 * Task update payload interface
 */
export interface TaskUpdatePayload {
  id: number;
  status: string;
  progress: number;
  metadata?: Record<string, any>;
}

/**
 * Form submission payload interface
 */
export interface FormSubmissionPayload {
  taskId: number;
  formType: string;
  status: string;
  companyId: number;
  unlockedTabs?: string[];
  unlockedTasks?: number[];
  submissionDate?: string;
  fileName?: string;
  fileId?: number;
}

/**
 * WebSocket Service Class
 * 
 * Provides an interface for broadcasting messages via WebSocket
 */
export class WebSocketService {
  /**
   * Broadcast a task update to all connected clients
   * 
   * @param taskData The updated task data
   */
  static broadcastTaskUpdate(taskData: TaskUpdatePayload): void {
    if (!wsServer) {
      logger.warn('WebSocket server not initialized, cannot broadcast task update');
      return;
    }

    const message = JSON.stringify({
      type: 'task_updated',
      payload: {
        ...taskData,
        timestamp: new Date().toISOString()
      }
    });

    let clientCount = 0;
    
    wsServer.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
        clientCount++;
      }
    });

    // Log only key properties to avoid large logs
    const logData = {
      type: 'task_updated',
      dataKeys: Object.keys(taskData),
      timestamp: new Date().toISOString(),
      clientCount
    };
    
    logger.info('Broadcast "task_updated" sent to ' + clientCount + ' clients', logData);
  }

  /**
   * Broadcast form submission event to all connected clients
   * 
   * @param submissionData The form submission data
   */
  static broadcastFormSubmission(submissionData: FormSubmissionPayload): void {
    if (!wsServer) {
      logger.warn('WebSocket server not initialized, cannot broadcast form submission');
      return;
    }

    const message = JSON.stringify({
      type: 'form_submitted',
      payload: {
        ...submissionData,
        timestamp: new Date().toISOString()
      }
    });

    let clientCount = 0;
    
    wsServer.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
        clientCount++;
      }
    });

    // Log additional details
    if (submissionData.unlockedTabs && submissionData.unlockedTabs.length > 0) {
      logger.info(`Form submission unlocked tabs: ${submissionData.unlockedTabs.join(', ')}`);
    }
    
    if (submissionData.unlockedTasks && submissionData.unlockedTasks.length > 0) {
      logger.info(`Form submission unlocked tasks: ${submissionData.unlockedTasks.join(', ')}`);
    }

    // Log only key properties to avoid large logs
    const logData = {
      type: 'form_submitted',
      dataKeys: Object.keys(submissionData),
      timestamp: new Date().toISOString(),
      clientCount
    };
    
    logger.info('Broadcast "form_submitted" sent to ' + clientCount + ' clients', logData);
  }

  /**
   * Broadcast company tabs update to all connected clients
   * 
   * @param companyId Company ID to update
   */
  static broadcastCompanyTabs(companyId: number): void {
    if (!wsServer) {
      logger.warn('WebSocket server not initialized, cannot broadcast company tabs update');
      return;
    }

    const message = JSON.stringify({
      type: 'company_tabs_updated',
      payload: {
        companyId,
        timestamp: new Date().toISOString()
      }
    });

    let clientCount = 0;
    
    wsServer.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
        clientCount++;
      }
    });

    logger.info(`Broadcast "company_tabs_updated" sent to ${clientCount} clients for company ${companyId}`);
  }
}

/**
 * Initialize the WebSocket server
 * 
 * @param httpServer The HTTP server to attach the WebSocket server to
 */
export function initializeWebSocketServer(httpServer: Server): void {
  // Initialize the WebSocket server
  wsServer = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  logger.info('Server initialized on path: /ws');

  wsServer.on('connection', (socket) => {
    logger.info(`New client connected to the pool (${clients.size + 1}/${wsServer?.clients.size || 0})`);
    clients.add(socket);

    // Setup event handlers
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
      }
    });

    // Clean up on connection close
    socket.on('close', (code, reason) => {
      clients.delete(socket);
      logger.info(`WebSocket client disconnected with code ${code} and reason: ${reason}`);
    });

    // Send a connection established message to the client
    socket.send(JSON.stringify({
      type: 'connection_established',
      payload: {
        timestamp: new Date().toISOString()
      }
    }));
  });
}

// Export the original functions for backward compatibility
export function broadcastTaskUpdate(taskData: TaskUpdatePayload): void {
  WebSocketService.broadcastTaskUpdate(taskData);
}

export function broadcastCompanyTabs(companyId: number): void {
  WebSocketService.broadcastCompanyTabs(companyId);
}

/**
 * Broadcast a form submission event to all connected clients
 * 
 * @param submissionData The form submission data to broadcast
 */
export function broadcastFormSubmission(submissionData: FormSubmissionPayload): void {
  WebSocketService.broadcastFormSubmission(submissionData);
}

/**
 * Import and re-export the broadcastFormSubmission function as part of WebSocketService
 * to provide backwards compatibility with the broadcastFormSubmissionCompleted function name
 */
import { broadcastFormSubmission as unifiedBroadcastFormSubmission } from './utils/unified-websocket';

// Add the broadcastFormSubmissionCompleted method to the WebSocketService class for backwards compatibility
WebSocketService.broadcastFormSubmissionCompleted = (
  formType: string,
  taskId: number, 
  companyId: number,
  options = {}
) => {
  // Call the form submission function with a modified type to indicate completion
  return unifiedBroadcastFormSubmission({
    taskId,
    formType,
    companyId,
    status: 'completed',
    ...options,
  });
};

// Also export as a standalone function for backward compatibility
export function broadcastFormSubmissionCompleted(
  formType: string,
  taskId: number, 
  companyId: number,
  options = {}
): void {
  WebSocketService.broadcastFormSubmissionCompleted(formType, taskId, companyId, options);
}
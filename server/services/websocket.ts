/**
 * WebSocket Service
 * 
 * This module provides functionality for broadcasting updates via WebSocket.
 * It handles formatting and sending messages to connected clients.
 */

import getLogger from '../utils/logger';
import { WebSocketServer, WebSocket } from 'ws';

const logger = getLogger('WebSocketService');

// Store for active WebSocket connections
let wss: WebSocketServer | null = null;
let clients: WebSocket[] = [];

/**
 * Get the WebSocket server instance
 * 
 * @returns The WebSocket server instance or null if not initialized
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

// Initialize WebSocket server
export function initializeWebSocketServer(server: any): WebSocketServer {
  if (wss) {
    logger.info('WebSocket server already initialized');
    return wss;
  }
  
  logger.info('Initializing WebSocket server');
  
  // Create WebSocket server on a distinct path to avoid conflicts with Vite HMR
  wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    // Verify the connection is not Vite HMR
    verifyClient: (info) => {
      const isViteHmr = info.req.headers['sec-websocket-protocol'] === 'vite-hmr';
      if (isViteHmr) {
        logger.info('Rejecting Vite HMR WebSocket connection');
        return false;
      }
      return true;
    }
  });
  
  // Store connected clients
  wss.on('connection', (ws: WebSocket, req) => {
    logger.info('New WebSocket connection established', {
      path: req.url,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin
      }
    });
    
    clients.push(ws);
    
    // Send initial connection established message
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        payload: {
          timestamp: new Date().toISOString(),
          connectionId: Math.random().toString(36).substring(2, 15)
        }
      }));
    } catch (error) {
      logger.error('Error sending initial connection message', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
      clients = clients.filter(client => client !== ws);
    });
    
    ws.on('error', (error) => {
      logger.error('WebSocket connection error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
    
    // Handle ping-pong for connection health checks
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (error) {
        // Ignore parse errors for non-JSON messages
      }
    });
  });
  
  logger.info('WebSocket server initialized successfully');
  return wss;
}

/**
 * Broadcast a message to all connected clients
 * 
 * @param type The type of message to broadcast
 * @param payload The payload to send with the message
 */
export async function broadcast(type: string, payload: any): Promise<void> {
  try {
    if (!wss) {
      logger.warn('WebSocket server not initialized, skipping broadcast');
      return;
    }
    
    // Create the message in the expected format
    const message = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    
    // Count active clients
    const activeClientCount = clients.length;
    
    if (activeClientCount === 0) {
      logger.info('No active WebSocket clients, skipping broadcast', {
        messageType: type
      });
      return;
    }
    
    logger.info(`Broadcasting ${type} message to ${activeClientCount} clients`);
    
    // Broadcast to all connected clients
    const messageString = JSON.stringify(message);
    
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    }
    
    logger.info(`Successfully broadcasted ${type} message`);
  } catch (error) {
    logger.error(`Error broadcasting ${type} message`, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Broadcast a task update to all connected clients
 * 
 * @param taskIdOrTask Either a task ID number or an object containing task properties
 * @param status Optional status string (only used if taskIdOrTask is a number)
 * @param metadata Optional metadata object (only used if taskIdOrTask is a number)
 */
export async function broadcastTaskUpdate(
  taskIdOrTask: number | { id: number; status?: string; progress?: number; metadata?: any },
  status?: string,
  metadata?: any
): Promise<void> {
  try {
    if (typeof taskIdOrTask === 'number') {
      // Handle the signature: broadcastTaskUpdate(taskId, status, metadata)
      logger.debug('Broadcasting task update with numeric ID', {
        taskId: taskIdOrTask,
        status: status || 'unknown'
      });
      
      await broadcast('task_update', {
        id: taskIdOrTask,
        status,
        metadata
      });
    } else {
      // Handle the signature: broadcastTaskUpdate({ id, status, metadata })
      logger.debug('Broadcasting task update with object format', {
        taskId: taskIdOrTask.id,
        status: taskIdOrTask.status || 'unknown'
      });
      
      await broadcast('task_update', {
        id: taskIdOrTask.id,
        status: taskIdOrTask.status,
        progress: taskIdOrTask.progress,
        metadata: taskIdOrTask.metadata
      });
    }
  } catch (error) {
    logger.error('Error broadcasting task update:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: typeof taskIdOrTask === 'number' ? taskIdOrTask : taskIdOrTask.id
    });
  }
}

/**
 * Broadcast a company update to all connected clients
 * 
 * @param companyId The company ID
 * @param data The data to broadcast
 */
export async function broadcastCompanyUpdate(companyId: number, data: any): Promise<void> {
  await broadcast('company_update', {
    id: companyId,
    ...data
  });
}

/**
 * Broadcast a message with any payload
 * 
 * @param type The message type
 * @param payload The message payload
 */
export async function broadcastMessage(type: string, payload: any): Promise<void> {
  await broadcast(type, payload);
}

/**
 * Broadcast company tabs update to all connected clients
 * 
 * @param companyId The company ID
 * @param availableTabs The available tabs for the company
 */
export async function broadcastCompanyTabsUpdate(companyId: number, availableTabs: string[]): Promise<void> {
  await broadcast('company_tabs_update', {
    companyId,
    availableTabs
  });
}

/**
 * Broadcast a WebSocket event by type to all clients
 * 
 * @param eventType The type of event to broadcast
 * @param data The data to associate with the event
 */
export async function broadcastEvent(eventType: string, data: any): Promise<void> {
  await broadcast(eventType, data);
}

/**
 * Broadcast a form submission event to all connected clients
 * 
 * @param formSubmissionData Form submission data containing taskId, formType, status, etc.
 */
export async function broadcastFormSubmission(formSubmissionData: {
  taskId: number;
  formType: string;
  status: 'success' | 'error' | 'in_progress';
  companyId?: number;
  fileId?: number | string;
  fileName?: string;
  unlockedTabs?: string[];
  error?: string;
  message?: string;
  completedActions?: any[];
}): Promise<void> {
  try {
    logger.debug('Broadcasting form submission event', {
      taskId: formSubmissionData.taskId,
      formType: formSubmissionData.formType,
      status: formSubmissionData.status
    });

    // Add timestamps for tracking
    const payload = {
      ...formSubmissionData,
      submissionDate: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
    
    // Broadcast on both channels for maximum compatibility
    await broadcast('form_submission', payload);
    await broadcast('form_submitted', payload);
  } catch (error) {
    logger.error('Error broadcasting form submission:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: formSubmissionData.taskId,
      formType: formSubmissionData.formType
    });
  }
}

export default {
  initializeWebSocketServer,
  getWebSocketServer,
  broadcast,
  broadcastTaskUpdate,
  broadcastCompanyTabsUpdate,
  broadcastCompanyUpdate,
  broadcastMessage,
  broadcastEvent,
  broadcastFormSubmission
};

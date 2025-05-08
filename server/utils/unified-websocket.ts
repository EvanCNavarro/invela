/**
 * Unified WebSocket Utility
 * 
 * This module provides a simplified interface for broadcasting messages
 * via WebSocket. It handles error cases and provides fallback mechanisms.
 */

import { logger } from './logger';
import * as websocketService from '../services/websocket-service';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

// Define valid message types
export type MessageType = 
  | 'task_update'
  | 'form_submission_completed'
  | 'task_status_update'
  | 'company_tabs_updated'
  | 'progress_update'
  | 'notification';

// WebSocket server instance
let wsServer: WebSocketServer | null = null;

/**
 * Initialize the WebSocket server
 * 
 * @param httpServer The HTTP server to attach the WebSocket server to
 * @param path The path for the WebSocket server (default: '/ws')
 * @returns The initialized WebSocket server
 */
export function initializeWebSocketServer(httpServer: Server, path: string = '/ws'): WebSocketServer {
  // Initialize the WebSocket server
  wsServer = new WebSocketServer({ 
    server: httpServer,
    path
  });
  
  logger.info(`WebSocket server initialized on path: ${path}`);
  
  return wsServer;
}

/**
 * Get the WebSocket server instance
 * 
 * @returns The WebSocket server instance or null if not available
 */
export function getWebSocketServer(): WebSocketServer | null {
  try {
    // First try to return our internally stored WebSocket server
    if (wsServer) {
      return wsServer;
    }

    // Fall back to the websocketService implementation if available
    if (typeof (websocketService as any).getServer === 'function') {
      return (websocketService as any).getServer();
    }
    
    return null;
  } catch (error) {
    logger.warn(`[WebSocket] Error getting WebSocket server`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Broadcast a message to all connected WebSocket clients
 * 
 * This function wraps the WebSocket service's broadcast function and adds
 * error handling to prevent crashes if the WebSocket service is unavailable.
 * It also tries multiple broadcast methods to ensure message delivery.
 * 
 * @param type The type of message to broadcast
 * @param data The data to include in the message
 * @returns Whether the broadcast was successful
 */
export function broadcast(
  type: MessageType,
  data: Record<string, any>
): boolean {
  try {
    let success = false;
    
    // First attempt: Try using the websocketService.broadcastMessage method
    if (typeof (websocketService as any).broadcastMessage === 'function') {
      try {
        (websocketService as any).broadcastMessage(type, data);
        success = true;
        logger.debug(`[WebSocket] Broadcast via websocketService.broadcastMessage succeeded`, {
          messageType: type
        });
      } catch (err) {
        logger.warn(`[WebSocket] Broadcast via websocketService.broadcastMessage failed`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    // Second attempt: Try using the websocketService.broadcast method
    if (!success && typeof (websocketService as any).broadcast === 'function') {
      try {
        (websocketService as any).broadcast(type, data);
        success = true;
        logger.debug(`[WebSocket] Broadcast via websocketService.broadcast succeeded`, {
          messageType: type
        });
      } catch (err) {
        logger.warn(`[WebSocket] Broadcast via websocketService.broadcast failed`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    // Final attempt: Try using direct WebSocket API if we have a server instance
    if (!success && wsServer) {
      try {
        const message = JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString()
        });
        
        // Broadcast to all connected clients who are in OPEN state
        wsServer.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
        
        success = true;
        logger.debug(`[WebSocket] Direct broadcast via wsServer succeeded`, {
          messageType: type,
          clientCount: wsServer.clients.size
        });
      } catch (err) {
        logger.warn(`[WebSocket] Direct broadcast via wsServer failed`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    if (!success) {
      // No broadcast method available or all methods failed
      logger.warn(`[WebSocket] Unable to broadcast ${type} message: All broadcast methods failed`, {
        messageType: type,
        fallbackAttempted: true
      });
    }
    
    return success;
  } catch (error) {
    logger.error(`[WebSocket] Error in broadcast function for ${type} message`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      messageType: type,
      dataKeys: Object.keys(data)
    });
    
    return false;
  }
}

/**
 * Broadcast a task update to all connected WebSocket clients
 * 
 * @param taskId The ID of the task being updated
 * @param progress The new progress value (0-100)
 * @param status The new status of the task
 * @param metadata Any additional metadata to include
 * @returns Whether the broadcast was successful
 */
export function broadcastTaskUpdate(
  taskId: number,
  progress: number,
  status: string,
  metadata: Record<string, any> = {}
): boolean {
  return broadcast('task_update', {
    taskId,
    progress,
    status,
    ...metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast a form submission completion to all connected WebSocket clients
 * 
 * @param taskId The ID of the task being completed
 * @param formType The type of form that was submitted
 * @param companyId The ID of the company
 * @param submissionDate The date the form was submitted
 * @returns Whether the broadcast was successful
 */
export function broadcastFormSubmissionCompleted(
  taskId: number,
  formType: string,
  companyId: number,
  submissionDate: string = new Date().toISOString()
): boolean {
  return broadcast('form_submission_completed', {
    taskId,
    formType,
    companyId,
    submissionDate,
    timestamp: new Date().toISOString()
  });
}
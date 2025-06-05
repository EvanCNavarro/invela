/**
 * Task Broadcast Service
 * 
 * This module provides a centralized service for broadcasting task-related
 * updates to connected WebSocket clients, maintaining a clean separation
 * between task progress calculation logic and notification mechanisms.
 * 
 * Enterprise logging standardization applied following OODA methodology.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { TaskStatus } from '../types';
import { logger } from './logger';

// Global reference to the WebSocket server
let wssRef: WebSocketServer | null = null;

// Interface for extended WebSocket with client tracking info
interface ExtendedWebSocket extends WebSocket {
  clientId?: string;
  userId?: number | null;
  companyId?: number | null;
}

/**
 * Set the WebSocket server reference for broadcasting
 * 
 * @param wss WebSocket server instance
 */
export function setWebSocketServer(wss: WebSocketServer): void {
  const broadcastLogger = logger.child({ module: 'TaskBroadcast' });
  
  if (!wss) {
    broadcastLogger.warn('Attempt to set null WebSocket server reference');
    return;
  }
  
  wssRef = wss;
  broadcastLogger.info('WebSocket server reference established');
  
  // Verify that the WebSocket server is active and has clients property
  // Some WebSocket servers might not expose clients until a connection is made
  try {
    if (wss.clients) {
      broadcastLogger.info('WebSocket server initialized', { 
        connectedClients: wss.clients.size,
        status: 'active' 
      });
    } else {
      // Create a dummy Set to prevent errors later
      Object.defineProperty(wss, 'clients', {
        value: new Set<WebSocket>(),
        writable: false,
        configurable: true
      });
      broadcastLogger.info('Added clients property to WebSocket server for compatibility');
    }
  } catch (error) {
    broadcastLogger.error('Error accessing WebSocket server clients', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Broadcast task update to connected clients
 * 
 * @param taskId Task ID that was updated
 * @param data Update data (status, progress, etc.)
 */
export function broadcastTaskUpdate(taskId: number, data: Record<string, any>): void {
  const broadcastLogger = logger.child({ module: 'TaskBroadcast' });
  
  if (!wssRef) {
    broadcastLogger.debug('No WebSocket server available, skipping broadcast', { taskId });
    return;
  }
  
  // Count active clients
  let activeClientCount = 0;
  
  // Broadcast to all connected clients
  wssRef.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      activeClientCount++;
      
      // Send update
      try {
        client.send(JSON.stringify({
          type: 'task_update',
          taskId,
          ...data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        broadcastLogger.error('Error sending task update', { 
          taskId, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
  });
  
  // Log broadcast stats
  broadcastLogger.info('Task update broadcast completed', {
    taskId,
    activeClients: activeClientCount,
    updatedFields: Object.keys(data)
  });
}

/**
 * Broadcast company-specific task update to relevant clients
 * 
 * @param companyId Company ID the task belongs to
 * @param taskId Task ID that was updated
 * @param data Update data (status, progress, etc.)
 */
export function broadcastCompanyTaskUpdate(
  companyId: number,
  taskId: number,
  data: Record<string, any>
): void {
  const broadcastLogger = logger.child({ module: 'TaskBroadcast' });
  
  if (!wssRef) {
    broadcastLogger.debug('No WebSocket server available, skipping company broadcast', { companyId, taskId });
    return;
  }
  
  // Count targeted clients
  let targetedClientCount = 0;
  let totalClientCount = 0;
  
  // Broadcast to connected clients for this company
  wssRef.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      totalClientCount++;
      
      // Check if this client belongs to the target company
      const extClient = client as ExtendedWebSocket;
      if (!extClient.companyId || extClient.companyId === companyId) {
        targetedClientCount++;
        
        // Send update
        try {
          client.send(JSON.stringify({
            type: 'task_update',
            taskId,
            companyId,
            ...data,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          broadcastLogger.error('Error sending company task update', { 
            companyId, 
            taskId, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    }
  });
  
  // Log broadcast stats
  if (targetedClientCount > 0) {
    broadcastLogger.info('Company task update broadcast completed', {
      companyId,
      taskId,
      targetedClients: targetedClientCount,
      totalClients: totalClientCount,
      updatedFields: Object.keys(data)
    });
  } else {
    broadcastLogger.debug('No clients connected for company, skipping broadcast', { companyId });
  }
}

/**
 * Broadcast task status change
 * 
 * @param taskId Task ID
 * @param status New task status
 * @param previousStatus Previous task status
 */
export function broadcastTaskStatusChange(
  taskId: number,
  status: TaskStatus,
  previousStatus: TaskStatus | null = null
): void {
  broadcastTaskUpdate(taskId, { 
    status,
    previousStatus,
    updateType: 'status_change'
  });
}

/**
 * Broadcast task progress update
 * 
 * @param taskId Task ID
 * @param progress New progress value (0-100)
 * @param previousProgress Previous progress value
 */
export function broadcastTaskProgressUpdate(
  taskId: number,
  progress: number,
  previousProgress: number | null = null
): void {
  broadcastTaskUpdate(taskId, { 
    progress,
    previousProgress,
    updateType: 'progress_update'
  });
}

/**
 * Broadcast task completion notification
 * 
 * @param taskId Task ID that was completed
 * @param companyId Company ID the task belongs to
 */
export function broadcastTaskCompletion(taskId: number, companyId?: number): void {
  // First broadcast generic task update
  broadcastTaskUpdate(taskId, { 
    status: 'completed',
    progress: 100,
    updateType: 'task_completed',
    completedAt: new Date().toISOString()
  });
  
  // If company ID provided, also send targeted company update
  if (companyId) {
    broadcastCompanyTaskUpdate(companyId, taskId, {
      status: 'completed',
      progress: 100,
      updateType: 'task_completed',
      completedAt: new Date().toISOString()
    });
  }
}

/**
 * Broadcast task submission notification
 * 
 * @param taskId Task ID that was submitted
 * @param companyId Company ID the task belongs to
 */
export function broadcastTaskSubmission(taskId: number, companyId?: number): void {
  // First broadcast generic task update
  broadcastTaskUpdate(taskId, { 
    status: 'submitted',
    updateType: 'task_submitted',
    submittedAt: new Date().toISOString()
  });
  
  // If company ID provided, also send targeted company update
  if (companyId) {
    broadcastCompanyTaskUpdate(companyId, taskId, {
      status: 'submitted',
      updateType: 'task_submitted',
      submittedAt: new Date().toISOString()
    });
  }
}

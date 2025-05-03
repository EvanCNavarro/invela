/**
 * Task Broadcast Service
 * 
 * This module provides a centralized service for broadcasting task-related
 * updates to connected WebSocket clients, maintaining a clean separation
 * between task progress calculation logic and notification mechanisms.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { TaskStatus } from '../types';

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
  wssRef = wss;
  console.log('[TaskBroadcast] WebSocket server reference set up');
  
  // Verify that the WebSocket server is active
  if (wss && wss.clients) {
    console.log(`[TaskBroadcast] WebSocket server active with ${wss.clients.size} connected clients`);
  } else {
    console.warn('[TaskBroadcast] WebSocket server reference set, but clients property is missing');
  }
}

/**
 * Broadcast task update to connected clients
 * 
 * @param taskId Task ID that was updated
 * @param data Update data (status, progress, etc.)
 */
export function broadcastTaskUpdate(taskId: number, data: Record<string, any>): void {
  if (!wssRef) {
    console.log('[TaskBroadcast] No WebSocket server available, skipping broadcast');
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
        console.error('[TaskBroadcast] Error sending task update:', error);
      }
    }
  });
  
  // Log broadcast stats
  console.log(`[TaskBroadcast] Task update broadcast to ${activeClientCount} clients:`, {
    taskId,
    updatedFields: Object.keys(data),
    timestamp: new Date().toISOString()
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
  if (!wssRef) {
    console.log('[TaskBroadcast] No WebSocket server available, skipping broadcast');
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
          console.error('[TaskBroadcast] Error sending company task update:', error);
        }
      }
    }
  });
  
  // Log broadcast stats
  if (targetedClientCount > 0) {
    console.log(`[TaskBroadcast] Company task update broadcast to ${targetedClientCount}/${totalClientCount} clients:`, {
      companyId,
      taskId,
      updatedFields: Object.keys(data),
      timestamp: new Date().toISOString()
    });
  } else {
    console.log(`[TaskBroadcast] No clients for company ${companyId} connected, skipping broadcast`);
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

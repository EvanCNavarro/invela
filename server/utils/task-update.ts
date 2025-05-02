/**
 * Task Update Utility
 * 
 * This module provides atomic task update functionality with WebSocket broadcasting,
 * ensuring that database updates and client notifications are properly synchronized.
 * 
 * By centralizing task update logic, we eliminate race conditions and inconsistencies
 * between what's stored in the database and what's displayed in the UI.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { TaskStatus, normalizeTaskStatus } from './status-constants';
import { calculateTaskProgress } from './unified-progress-calculation';
import { WebSocketServer, WebSocket } from 'ws';

// WebSocket client management
let wss: WebSocketServer | null = null;
const clients = new Map<string, WebSocket>();

/**
 * Register WebSocket server for task updates
 * 
 * @param websocketServer WebSocket server instance
 */
export function registerWebSocketServer(websocketServer: WebSocketServer) {
  wss = websocketServer;
  
  wss.on('connection', (ws: WebSocket) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    clients.set(clientId, ws);
    
    logger.info(`[TaskWebSocket] Client connected: ${clientId}`);
    
    // Send connected message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      userId: null,
      companyId: null,
      timestamp: new Date().toISOString()
    }));
    
    // Handle messages
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info(`[TaskWebSocket] Received message from client ${clientId}:`, data);
        
        // Handle authentication message
        if (data.type === 'authenticate') {
          ws.send(JSON.stringify({
            type: 'authenticated',
            userId: data.userId,
            companyId: data.companyId,
            clientId,
            data: {
              userId: data.userId,
              companyId: data.companyId,
              clientId,
              status: 'authenticated',
              timestamp: new Date().toISOString()
            },
            payload: {
              userId: data.userId,
              companyId: data.companyId,
              clientId,
              status: 'authenticated',
              timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          }));
        }
        
        // Handle ping-pong for connection keep-alive
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        logger.error('[TaskWebSocket] Error processing message:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      clients.delete(clientId);
      logger.info(`[TaskWebSocket] Client disconnected: ${clientId}`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logger.error(`[TaskWebSocket] Client error for ${clientId}:`, {
        error: error.message,
        stack: error.stack
      });
    });
  });
  
  logger.info('[TaskWebSocket] WebSocket server registered');
}

/**
 * Broadcast a message to all connected WebSocket clients
 * 
 * @param messageType Type of message
 * @param payload Message payload
 */
export function broadcastWebSocketMessage(messageType: string, payload: any) {
  if (!wss) {
    logger.warn(`[TaskWebSocket] No WebSocket server registered, skipping broadcast`, { messageType });
    return;
  }
  
  const activeClients = Array.from(clients.values()).filter(
    (client) => client.readyState === WebSocket.OPEN
  );
  
  if (activeClients.length === 0) {
    logger.info(`No active WebSocket clients, skipping broadcast`, { messageType });
    return;
  }
  
  const message = JSON.stringify({
    type: messageType,
    payload,
    data: payload, // Add data field for backward compatibility
    timestamp: new Date().toISOString()
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  // Send message to all connected clients
  activeClients.forEach((client) => {
    try {
      client.send(message);
      successCount++;
    } catch (error) {
      errorCount++;
      logger.error('[TaskWebSocket] Error sending message to client:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  logger.info(`[TaskWebSocket] Broadcast ${messageType} to ${successCount} clients (${errorCount} failed)`);
}

/**
 * Update a task's progress and status
 * 
 * This function handles:
 * 1. Calculating the current progress
 * 2. Determining the appropriate status
 * 3. Updating the database
 * 4. Broadcasting the update to clients
 * 
 * @param taskId Task ID to update
 * @param options Update options
 * @returns Updated task data
 */
export async function updateTaskProgress(
  taskId: number,
  options: {
    recalculate?: boolean;
    forceStatus?: TaskStatus;
    debug?: boolean;
    broadcast?: boolean;
  } = {}
) {
  const {
    recalculate = true,
    forceStatus,
    debug = false,
    broadcast = true
  } = options;
  
  const transactionId = `txid-${Date.now()}`;
  const logContext = { taskId, transactionId };
  
  try {
    // Step 1: Get task information
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Step 2: Calculate task progress
    let progress = task.progress;
    let status = normalizeTaskStatus(task.status);
    
    if (recalculate) {
      const result = await calculateTaskProgress(taskId, task.task_type, { debug, transactionId });
      progress = result.progress;
      status = result.status;
      
      if (debug) {
        logger.debug(`[TaskUpdate] Calculated progress for task ${taskId}:`, {
          ...logContext,
          taskType: task.task_type,
          progress,
          status,
          calculationDetails: result.calculationDetails
        });
      }
    }
    
    // Override status if specified
    if (forceStatus) {
      status = forceStatus;
      logger.info(`[TaskUpdate] Forcing status for task ${taskId} to ${status}`, logContext);
    }
    
    // Step 3: Update the database if needed
    if (progress !== task.progress || status !== task.status) {
      await db.update(tasks)
        .set({
          progress,
          status,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      logger.info(`[TaskUpdate] Updated task ${taskId}:`, {
        ...logContext,
        taskType: task.task_type,
        previousProgress: task.progress,
        newProgress: progress,
        previousStatus: task.status,
        newStatus: status
      });
      
      // Step 4: Broadcast the update if requested
      if (broadcast) {
        logger.debug(`Broadcasting task update with object format`, { taskId, status, progress });
        broadcastWebSocketMessage('task_update', { 
          taskId, 
          status, 
          progress,
          metadata: {
            lastUpdated: new Date().toISOString(),
            previousProgress: task.progress,
            calculatedProgress: progress,
            taskType: task.task_type
          }
        });
      }
    } else {
      logger.info(`[TaskUpdate] No changes for task ${taskId}`, {
        ...logContext,
        progress,
        status
      });
    }
    
    // Return updated task data
    return {
      id: taskId,
      progress,
      status,
      task_type: task.task_type,
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`[TaskUpdate] Error updating task ${taskId}`, {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Update company tabs (tab unlocking)
 * 
 * @param companyId Company ID
 * @param tabs Available tabs
 */
export function broadcastCompanyTabsUpdate(companyId: number, tabs: string[]) {
  broadcastWebSocketMessage('company_tabs_update', {
    companyId,
    availableTabs: tabs,
    tabs // Add tabs field for backward compatibility
  });
}

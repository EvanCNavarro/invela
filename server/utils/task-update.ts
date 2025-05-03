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
import { WebSocketServer } from 'ws';
import { broadcast, broadcastTaskUpdate as unifiedBroadcastTaskUpdate, getWebSocketServer } from './unified-websocket';

/**
 * Register WebSocket server for task updates
 * 
 * @param websocketServer WebSocket server instance
 */
export function registerWebSocketServer(websocketServer: WebSocketServer) {
  // This function now exists only for backward compatibility
  // The unified-websocket module handles all WebSocket communication aspects
  logger.info('[TaskWebSocket] WebSocket server registered with unified implementation');
}

/**
 * Broadcast a message to all connected WebSocket clients
 * 
 * @param messageType Type of message
 * @param payload Message payload
 */
export function broadcastWebSocketMessage(messageType: string, payload: any) {
  // Use unified WebSocket broadcast service
  logger.debug(`[TaskWebSocket] Broadcasting ${messageType} using unified WebSocket service`);
  
  try {
    // Add a short delay to allow the WebSocket server to initialize
    // This helps with race conditions during startup
    setTimeout(() => {
      broadcast(messageType, payload);
    }, 500);
  } catch (error) {
    logger.error(`[TaskWebSocket] Error broadcasting ${messageType}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
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
          status: status as any, // Cast to silence type error
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
        
        // Use the unified broadcast function for more consistent and reliable updates
        // Add a small delay to ensure WebSocket server is initialized
        setTimeout(() => {
          unifiedBroadcastTaskUpdate(taskId, {
            lastUpdated: new Date().toISOString(),
            previousProgress: task.progress,
            calculatedProgress: progress,
            taskType: task.task_type
          });
        }, 250);
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

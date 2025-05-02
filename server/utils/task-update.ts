/**
 * Task Update Module
 * 
 * This module handles atomic updates to task progress and status,
 * ensuring all updates are properly recorded in the database and
 * broadcasts are sent via WebSocket.
 */

import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { TaskStatus } from './status-constants';
import { calculateTaskProgress } from './unified-progress-calculation';
import { logger } from './logger';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';

/**
 * Update a task's progress and status atomically
 * 
 * @param taskId Task ID
 * @param taskType Task type
 * @param options Update options
 * @returns Update result with the new progress and status
 */
export async function updateTaskProgressAndStatus(
  taskId: number,
  taskType: string,
  options: {
    debug?: boolean;
    broadcastUpdates?: boolean;
    source?: string;
    transactionId?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<{
  success: boolean;
  progress: number;
  status: TaskStatus;
  details: any;
}> {
  const {
    debug = false,
    broadcastUpdates = true,
    source = 'api',
    transactionId = `txid-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    metadata = {}
  } = options;
  
  // Set up logging context
  const logContext = {
    taskId,
    taskType,
    transactionId,
    source,
    timestamp: new Date().toISOString()
  };
  
  logger.info(`[TaskUpdate] Starting atomic update for task ${taskId}`, logContext);
  
  try {
    // Step 1: Calculate current progress and status
    const progressResult = await calculateTaskProgress(taskId, taskType, { debug, transactionId });
    const { progress, status, calculationDetails } = progressResult;
    
    logger.info(`[TaskUpdate] Calculated progress for task ${taskId}: ${progress}%, status: ${status}`, {
      ...logContext,
      progress,
      status,
      details: calculationDetails
    });
    
    // Step 2: Get current task to check if update is needed
    const [existingTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!existingTask) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Check if update is needed - compare numeric progress values to avoid string/number issues
    const needsUpdate = 
      Number(existingTask.progress) !== progress ||
      existingTask.status !== status;
    
    if (needsUpdate) {
      // Step 3: Update the task in the database
      const timestamp = new Date();
      
      const [updatedTask] = await db.update(tasks)
        .set({
          progress,
          status,
          updated_at: timestamp,
          // Only update status_changed_at if status is changing
          ...(existingTask.status !== status ? { status_changed_at: timestamp } : {}),
          // Merge existing metadata with new metadata
          metadata: {
            ...existingTask.metadata,
            ...metadata,
            lastProgressUpdate: timestamp.toISOString(),
            progressUpdateSource: source,
            progressUpdateTransactionId: transactionId
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      logger.info(`[TaskUpdate] Updated task ${taskId} in database`, {
        ...logContext,
        oldProgress: existingTask.progress,
        newProgress: progress,
        oldStatus: existingTask.status,
        newStatus: status
      });
      
      // Step 4: Broadcast update if requested
      if (broadcastUpdates) {
        await broadcastTaskUpdate(taskId, progress, status, transactionId);
      }
      
      return {
        success: true,
        progress,
        status,
        details: {
          taskId,
          taskType,
          oldProgress: existingTask.progress,
          newProgress: progress,
          oldStatus: existingTask.status,
          newStatus: status,
          timestamp: timestamp.toISOString(),
          transactionId
        }
      };
    } else {
      // No update needed
      logger.info(`[TaskUpdate] No update needed for task ${taskId}`, {
        ...logContext,
        currentProgress: existingTask.progress,
        calculatedProgress: progress,
        currentStatus: existingTask.status,
        calculatedStatus: status
      });
      
      return {
        success: true,
        progress: Number(existingTask.progress),
        status: existingTask.status as TaskStatus,
        details: {
          taskId,
          taskType,
          noUpdateNeeded: true,
          currentProgress: existingTask.progress,
          currentStatus: existingTask.status,
          timestamp: new Date().toISOString(),
          transactionId
        }
      };
    }
  } catch (error) {
    logger.error(`[TaskUpdate] Error updating task ${taskId}`, {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      progress: 0,
      status: TaskStatus.NOT_STARTED,
      details: {
        taskId,
        taskType,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        transactionId
      }
    };
  }
}

/**
 * Broadcast a task update via WebSocket
 * 
 * @param taskId Task ID
 * @param progress Progress value (0-100)
 * @param status Task status
 * @param transactionId Unique transaction ID
 */
export async function broadcastTaskUpdate(
  taskId: number,
  progress: number,
  status: TaskStatus,
  transactionId: string
): Promise<void> {
  try {
    // Access the WebSocket server from the global scope
    const wss = (global as any).wss as WebSocketServer | undefined;
    
    if (!wss) {
      logger.warn(`[TaskUpdate] WebSocket server not available for broadcasting`, {
        taskId,
        progress,
        status,
        transactionId
      });
      return;
    }
    
    // Build a standardized message format
    // Using consistent property names across the application
    const message = {
      type: 'task_update',
      payload: {
        id: taskId, // Use 'id' consistently instead of mixing 'id' and 'taskId'
        progress,
        status,
        timestamp: new Date().toISOString(),
        transactionId
      }
    };
    
    let clientCount = 0;
    
    // Broadcast to all clients in OPEN state
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
        clientCount++;
      }
    });
    
    logger.info(`[TaskUpdate] Broadcast sent to ${clientCount} clients`, {
      taskId,
      progress,
      status,
      clientCount,
      transactionId
    });
  } catch (error) {
    logger.error(`[TaskUpdate] Error broadcasting update for task ${taskId}`, {
      taskId,
      progress,
      status,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      transactionId
    });
  }
}

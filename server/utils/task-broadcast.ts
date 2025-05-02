/**
 * Task Broadcast Utility
 * 
 * Provides standardized WebSocket broadcasting of task status updates
 */

import * as WebSocketService from '../services/websocket';
import { logger } from './logger';

// Logger is already initialized in the imported module

/**
 * Broadcast task update via WebSocket
 * @param task The task data to broadcast
 */
export function broadcastTaskUpdate(task: {
  id: number;
  status: string;
  progress: number;
  metadata?: Record<string, any>;
}) {
  try {
    logger.info(`Broadcasting task update for task ${task.id}:`, {
      status: task.status,
      progress: task.progress
    });
    
    // Broadcast the task update via WebSocket
    WebSocketService.broadcast('task_update', {
      ...task,
      taskId: task.id, // Include both id and taskId for backward compatibility
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error broadcasting task update:`, error);
  }
}

/**
 * Broadcast progress update via WebSocket
 * @param taskId The task ID
 * @param progress The updated progress percentage (0-100)
 * @param status The updated task status
 * @param metadata Optional metadata for the task
 */
export function broadcastProgressUpdate(
  taskId: number,
  progress: number,
  status: string,
  metadata: Record<string, any> = {}
) {
  try {
    logger.info(`Broadcasting progress update for task ${taskId}:`, {
      status,
      progress
    });
    
    // Broadcast the progress update via WebSocket
    WebSocketService.broadcast('task_update', {
      id: taskId,
      taskId, // Include both id and taskId for backward compatibility
      status,
      progress,
      metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error broadcasting progress update:`, error);
  }
}
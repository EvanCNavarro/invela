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
/**
 * Task Broadcast Utility
 * 
 * Provides standardized WebSocket broadcasting of task status updates
 */

import { broadcastMessage } from '../services/websocket';
import { Logger } from './logger';

const logger = new Logger('TaskBroadcast');

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
    broadcastMessage('task_updated', {
      ...task,
      taskId: task.id, // Include both id and taskId for backward compatibility
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error broadcasting task update:`, error);
  }
}
import { TaskStatus } from '../types';
import { broadcastTaskUpdate } from '../services/websocket';

/**
 * Determine the appropriate task status based on progress value
 * 
 * @param progress Current progress value (0-100)
 * @param currentStatus Current task status
 * @returns Updated task status
 */
export function determineStatusFromProgress(
  progress: number, 
  currentStatus: TaskStatus
): TaskStatus {
  // Skip status update if task is already completed/submitted
  if ([TaskStatus.SUBMITTED, TaskStatus.COMPLETED, TaskStatus.APPROVED].includes(currentStatus)) {
    return currentStatus;
  }
  
  // Determine appropriate status based on progress
  if (progress === 0) {
    return TaskStatus.NOT_STARTED;
  } else if (progress < 100) {
    return TaskStatus.IN_PROGRESS;
  } else {
    return TaskStatus.READY_FOR_SUBMISSION;
  }
}

/**
 * Standardized function to update task progress and broadcast changes
 * 
 * @param taskId Task ID
 * @param progress New progress value (0-100)
 * @param status Optional status override
 * @param metadata Optional metadata to include
 */
export function broadcastProgressUpdate(
  taskId: number,
  progress: number,
  status?: TaskStatus,
  metadata?: Record<string, any>
) {
  // Validate the progress value
  const validatedProgress = Math.max(0, Math.min(100, progress));
  
  // Log the broadcast action
  console.log('[Progress Utils] Broadcasting task progress update:', {
    taskId,
    progress: validatedProgress,
    status,
    timestamp: new Date().toISOString()
  });
  
  // Broadcast the update to all connected clients
  broadcastTaskUpdate({
    id: taskId,
    status: status || TaskStatus.IN_PROGRESS,
    progress: validatedProgress,
    metadata: metadata || {}
  });
}
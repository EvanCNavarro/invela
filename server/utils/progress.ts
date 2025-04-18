import { TaskStatus } from '../types';
import { broadcastTaskUpdate } from '../services/websocket';

import { hasAllRequiredFields } from './kyb-progress';

/**
 * Determine the appropriate task status based on progress value
 * 
 * @param progress Current progress value (0-100)
 * @param currentStatus Current task status
 * @param formResponses Optional form responses to check for required fields
 * @param metadata Optional task metadata to check for submission date
 * @returns Updated task status
 */
export function determineStatusFromProgress(
  progress: number, 
  currentStatus: TaskStatus,
  formResponses?: Array<{ status: string; hasValue: boolean; required?: boolean; field?: string }>,
  metadata?: Record<string, any>
): TaskStatus {
  // CRITICAL: Always respect submission state
  // If the task has a submissionDate in metadata, it should always be in SUBMITTED status
  if (metadata?.submissionDate) {
    return TaskStatus.SUBMITTED;
  }
  
  // Skip status update if task is already in a terminal state
  if ([TaskStatus.SUBMITTED, TaskStatus.COMPLETED, TaskStatus.APPROVED].includes(currentStatus)) {
    return currentStatus;
  }
  
  // If form responses are provided, check if ANY required fields are empty
  if (formResponses && formResponses.length > 0) {
    const hasCompletedRequiredFields = hasAllRequiredFields(formResponses);
    
    // Always use in_progress if required fields are empty, regardless of % completion
    if (!hasCompletedRequiredFields) {
      return TaskStatus.IN_PROGRESS;
    }
  }
  
  // Standard logic based on progress percentage
  if (progress === 0) {
    return TaskStatus.NOT_STARTED;
  } else if (progress < 100) {
    return TaskStatus.IN_PROGRESS;
  } else if (currentStatus === TaskStatus.SUBMITTED) {
    // Maintain SUBMITTED status if already submitted
    return TaskStatus.SUBMITTED;
  } else if (currentStatus === TaskStatus.READY_FOR_SUBMISSION && metadata?.status === 'submitted') {
    // Allow explicit submission status transition when requested in metadata
    return TaskStatus.SUBMITTED;
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
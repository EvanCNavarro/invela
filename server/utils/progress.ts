import { TaskStatus } from '../types';
import { broadcastMessage } from '../services/websocket';

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
  // Add extra debugging for status transitions
  console.log(`[STATUS DETERMINATION] Calculating status for task with:`, {
    progress,
    currentStatus,
    hasSubmissionDate: !!metadata?.submissionDate,
    hasSubmittedFlag: metadata?.status === 'submitted',
    hasResponses: !!(formResponses && formResponses.length > 0),
    timestamp: new Date().toISOString()
  });
  
  // CRITICAL: Always respect submission state
  // If the task has a submissionDate in metadata, it should always be in SUBMITTED status
  if (metadata?.submissionDate) {
    console.log(`[STATUS DETERMINATION] Task has submissionDate (${metadata.submissionDate}), setting to SUBMITTED`);
    return TaskStatus.SUBMITTED;
  }
  
  // Handle explicit submission request via metadata
  // Check both the legacy 'status' flag and our new 'explicitlySubmitted' flag
  if (metadata?.status === 'submitted' || metadata?.explicitlySubmitted === true) {
    console.log(`[STATUS DETERMINATION] Task has explicit submission flags in metadata, setting to SUBMITTED`);
    console.log(`[STATUS DETERMINATION] Metadata submission flags:`, { 
      status: metadata?.status,
      explicitlySubmitted: metadata?.explicitlySubmitted,
      submittedAt: metadata?.submittedAt 
    });
    return TaskStatus.SUBMITTED;
  }
  
  // Skip status update if task is already in a terminal state
  if ([TaskStatus.SUBMITTED, TaskStatus.COMPLETED, TaskStatus.APPROVED].includes(currentStatus)) {
    console.log(`[STATUS DETERMINATION] Task is in terminal state (${currentStatus}), preserving status`);
    return currentStatus;
  }
  
  // If form responses are provided, check if ANY required fields are empty
  if (formResponses && formResponses.length > 0) {
    const hasCompletedRequiredFields = hasAllRequiredFields(formResponses);
    
    // Always use in_progress if required fields are empty, regardless of % completion
    if (!hasCompletedRequiredFields) {
      console.log(`[STATUS DETERMINATION] Task has incomplete required fields, setting to IN_PROGRESS`);
      return TaskStatus.IN_PROGRESS;
    }
  }
  
  // Standard logic based on progress percentage
  if (progress === 0) {
    console.log(`[STATUS DETERMINATION] Task has 0% progress, setting to NOT_STARTED`);
    return TaskStatus.NOT_STARTED;
  } else if (progress < 100) {
    console.log(`[STATUS DETERMINATION] Task has ${progress}% progress (< 100%), setting to IN_PROGRESS`);
    return TaskStatus.IN_PROGRESS;
  } else if (progress === 100) {
    // When we've reached 100% complete, check if this is a new completion or existing status
    if (currentStatus === TaskStatus.SUBMITTED) {
      console.log(`[STATUS DETERMINATION] Task already in SUBMITTED status, preserving status`);
      return TaskStatus.SUBMITTED;
    } else {
      console.log(`[STATUS DETERMINATION] Task has 100% progress, setting to READY_FOR_SUBMISSION`);
      return TaskStatus.READY_FOR_SUBMISSION;
    }
  } else {
    // Fallback case, should never happen with validated progress
    console.log(`[STATUS DETERMINATION] Unexpected progress value (${progress}), defaulting to IN_PROGRESS`);
    return TaskStatus.IN_PROGRESS;
  }
}

/**
 * Standardized function to update task progress and broadcast changes
 * 
 * @param taskId Task ID
 * @param progress New progress value (0-100)
 * @param status Optional status override
 * @param metadata Optional metadata to include
 * @param options Optional configuration
 */
export function broadcastProgressUpdate(
  taskId: number,
  progress: number,
  status?: TaskStatus,
  metadata?: Record<string, any>,
  options: { forceUpdate?: boolean; ignoreSkipCheck?: boolean } = {}
) {
  // Check if reconciliation is disabled for this task (e.g. during clearing operations)
  // This helps to prevent WebSocket spam during bulk operations like clearing all fields
  if (!options.ignoreSkipCheck) {
    const skipUntil = global.__skipTaskReconciliation?.[taskId] || 0;
    if (skipUntil > Date.now()) {
      // Skip the broadcast if this task is locked for reconciliation
      console.log(`[Progress Utils] Skipping broadcast for task ${taskId} due to temporary lock until ${new Date(skipUntil).toISOString()}`);
      return;
    }
  }
  // Validate the progress value
  const validatedProgress = Math.max(0, Math.min(100, progress));
  
  // If metadata has submission indicators, always use SUBMITTED status
  let finalStatus = status;
  if (metadata?.submissionDate) {
    finalStatus = TaskStatus.SUBMITTED;
    console.log(`[Progress Utils] Task has submissionDate, overriding status to SUBMITTED`);
  } else if (metadata?.status === 'submitted' || metadata?.explicitlySubmitted === true) {
    finalStatus = TaskStatus.SUBMITTED;
    console.log(`[Progress Utils] Task has submission flags in metadata, overriding status to SUBMITTED`);
    console.log(`[Progress Utils] Metadata submission flags:`, { 
      status: metadata?.status,
      explicitlySubmitted: metadata?.explicitlySubmitted,
      submittedAt: metadata?.submittedAt 
    });
  }
  
  // Log the broadcast action with detailed information
  console.log('[Progress Utils] Broadcasting task progress update:', {
    taskId,
    progress: validatedProgress,
    requestedStatus: status,
    finalStatus,
    hasSubmissionDate: !!metadata?.submissionDate,
    hasSubmittedFlag: metadata?.status === 'submitted',
    timestamp: new Date().toISOString()
  });
  
  // Broadcast the update to all connected clients with the appropriate status
  broadcastMessage('task_update', {
    id: taskId,
    status: finalStatus || status || TaskStatus.IN_PROGRESS,
    progress: validatedProgress,
    metadata: metadata || {}
  });
}
/**
 * Unified Task Progress Calculation
 * 
 * This module implements a standardized approach to calculate and update task progress
 * for all form types (KYB, KY3P, Open Banking) in a consistent manner.
 * 
 * Key features:
 * - Single source of truth for progress calculation
 * - Proper transaction boundaries for atomic operations
 * - WebSocket broadcast for progress updates to all connected clients
 * - Standardized status mapping based on progress values
 * - Diagnostics for troubleshooting
 * 
 * Used by:
 * - Form field updates
 * - Form submissions
 * - Form clearing/reset
 * - Demo auto-fill
 */

import { db } from '@db';
import { sql, eq, and, count, SQL } from 'drizzle-orm';
import {
  tasks,
  kybResponses,
  ky3pResponses,
  openBankingResponses,
  kybFields,
  ky3pFields, 
  openBankingFields,
} from '@db/schema';

// Import WebSocket utilities
import { broadcast } from '../utils/unified-websocket';

// Constants for task status
export const TaskStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  SUBMITTED: 'submitted',
  REJECTED: 'rejected',
  APPROVED: 'approved',
  ARCHIVED: 'archived',
};

/**
 * Normalize a task status string to ensure consistent casing and format
 */
export function normalizeTaskStatus(status: string | null | undefined): string {
  if (!status) return TaskStatus.NOT_STARTED;
  
  // Convert to lowercase for case-insensitive comparison
  const normalizedStatus = status.toLowerCase();
  
  // Map to our standardized status values
  switch (normalizedStatus) {
    case 'not_started': 
    case 'notstarted': 
    case 'not started': 
      return TaskStatus.NOT_STARTED;
    case 'in_progress': 
    case 'inprogress':
    case 'in progress': 
      return TaskStatus.IN_PROGRESS;
    case 'ready_for_submission':
    case 'readyforsubmission':
    case 'ready for submission':
      return TaskStatus.READY_FOR_SUBMISSION;
    case 'submitted': 
      return TaskStatus.SUBMITTED;
    case 'rejected': 
      return TaskStatus.REJECTED;
    case 'approved': 
      return TaskStatus.APPROVED;
    case 'archived': 
      return TaskStatus.ARCHIVED;
    default:
      console.log(`[UnifiedProgress] Unknown status: ${status}, defaulting to NOT_STARTED`);
      return TaskStatus.NOT_STARTED;
  }
}

/**
 * Calculate progress for a specific task type using a standardized approach
 */
async function calculateTaskProgress(taskId: number, taskType: string, options: any = {}) {
  const debug = options.debug || false;
  
  if (debug) {
    console.log(`[UnifiedProgressCalc] Calculating progress for task ${taskId} (${taskType})`);
  }
  
  let totalFields = 0;
  let completedFields = 0;
  let progress = 0;
  
  try {
    // Different schemas based on task type
    if (taskType === 'company_kyb') {
      // Count total fields
      const [totalResult] = await db
        .select({ count: count() })
        .from(kybFields);
      totalFields = totalResult?.count || 0;
      
      // Count completed fields
      const [completedResult] = await db
        .select({ count: count() })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            eq(kybResponses.status, 'COMPLETE')
          )
        );
      completedFields = completedResult?.count || 0;
    } 
    else if (taskType === 'ky3p') {
      // Count total fields
      const [totalResult] = await db
        .select({ count: count() })
        .from(ky3pFields);
      totalFields = totalResult?.count || 0;
      
      // Count completed fields
      const [completedResult] = await db
        .select({ count: count() })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.status, 'COMPLETE')
          )
        );
      completedFields = completedResult?.count || 0;
    } 
    else if (taskType === 'open_banking') {
      // Count total fields
      const [totalResult] = await db
        .select({ count: count() })
        .from(openBankingFields);
      totalFields = totalResult?.count || 0;
      
      // Count completed fields
      const [completedResult] = await db
        .select({ count: count() })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            eq(openBankingResponses.status, 'COMPLETE')
          )
        );
      completedFields = completedResult?.count || 0;
    }
    
    // Calculate progress percentage
    if (totalFields > 0) {
      progress = Math.round((completedFields / totalFields) * 100);
    }
    
    // Make sure progress is between 0 and 100
    progress = Math.max(0, Math.min(100, progress));
    
    if (debug) {
      console.log(`[UnifiedProgressCalc] Task ${taskId} (${taskType}) progress: ${completedFields}/${totalFields} = ${progress}%`);
    }
    
    return {
      success: true,
      taskId,
      taskType,
      totalFields,
      completedFields,
      progress,
    };
  } catch (error) {
    console.error(`[UnifiedProgressCalc] Error calculating progress:`, {
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return {
      success: false,
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Determine task status based on progress and submission state
 */
function getStatusFromProgress(progress: number, currentStatus: string | null): string {
  // First normalize the current status
  const normalizedStatus = normalizeTaskStatus(currentStatus);
  
  // If the task is already in a terminal state, don't change it
  if (
    normalizedStatus === TaskStatus.SUBMITTED ||
    normalizedStatus === TaskStatus.REJECTED ||
    normalizedStatus === TaskStatus.APPROVED ||
    normalizedStatus === TaskStatus.ARCHIVED
  ) {
    return normalizedStatus;
  }
  
  // Otherwise, set the status based on progress
  if (progress === 0) {
    return TaskStatus.NOT_STARTED;
  } else if (progress < 100) {
    return TaskStatus.IN_PROGRESS;
  } else { // progress === 100
    return TaskStatus.READY_FOR_SUBMISSION;
  }
}

/**
 * Main function to update task progress
 */
export async function updateTaskProgress(taskId: number, taskType: string, options: any = {}) {
  const debug = options?.debug || false;
  const forceUpdate = options?.forceUpdate || false;
  const metadata = options?.metadata || {};
  const diagnosticId = `prog-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  console.log(`[UnifiedProgress] Starting progress update for task ${taskId} (${taskType})`, {
    taskId,
    taskType,
    diagnosticId,
    metadata: Object.keys(metadata),
  });
  
  try {
    // Using a transaction to make progress calculation and update atomic
    return await db.transaction(async (tx) => {
      // First get the current task state
      const [task] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
        
      if (!task) {
        return {
          success: false,
          message: `Task ${taskId} not found`,
        };
      }
      
      // Calculate the current progress
      const progressResult = await calculateTaskProgress(taskId, taskType, { debug });
      
      if (!progressResult.success) {
        throw new Error(`Error calculating progress: ${progressResult.error}`);
      }
      
      const { progress } = progressResult;
      
      // If progress hasn't changed and we're not forcing an update, return early
      if (task.progress === progress && !forceUpdate) {
        return {
          success: true,
          taskId,
          message: 'Progress unchanged',
          progress,
          status: task.status,
        };
      }
      
      // Determine the correct status based on progress
      const newStatus = getStatusFromProgress(progress, task.status);
      
      // Update the task with the new progress value
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          progress,
          status: newStatus,
          updated_at: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();
        
      if (!updatedTask) {
        throw new Error('Task update failed');
      }
      
      // Return the result including updated values
      return {
        success: true,
        taskId,
        progress,
        status: newStatus,
        previousProgress: task.progress,
        previousStatus: task.status,
        changed: task.progress !== progress || task.status !== newStatus,
      };
    });
  } catch (error) {
    console.error(`[UnifiedProgress] Error updating task ${taskId} progress:`, {
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      diagnosticId,
    });
    
    return {
      success: false,
      message: `Error updating task progress: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update task progress and broadcast the update to connected clients
 */
export async function updateTaskProgressAndBroadcast(taskId: number, taskType: string, options: any = {}) {
  // Update the progress
  const result = await updateTaskProgress(taskId, taskType, options);
  
  if (result.success) {
    // Broadcast the task update to connected clients
    broadcast('task_updated', {
      taskId,
      progress: result.progress,
      status: result.status,
      timestamp: new Date().toISOString(),
      previousProgress: result.previousProgress,
      previousStatus: result.previousStatus,
    });
  }
  
  return result;
}

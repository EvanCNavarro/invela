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

// Import the progress validator utilities
import { validateProgress, validateProgressForUpdate, getProgressSqlValue, isProgressDifferent } from './progress-validator';

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
            sql`${kybResponses.status} = 'complete'`
          )
        );
      completedFields = completedResult?.count || 0;
    } 
    else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment') {
      // IMPROVEMENT: Added support for both KY3P task types
      // This ensures we use the same progress calculation logic regardless of task_type name
      
      // Count total fields
      const [totalResult] = await db
        .select({ count: count() })
        .from(ky3pFields);
      totalFields = totalResult?.count || 0;
      
      // Count completed fields - handle both field_id and field_key responses
      // KY3P is special because it has both numeric and string field identifiers
      const [completedResult] = await db
        .select({ count: count() })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            sql`LOWER(${ky3pResponses.status}) = 'complete'` // Normalize status to lowercase
          )
        );
      completedFields = completedResult?.count || 0;
      
      // Log extended diagnostics for KY3P progress calculation
      if (debug) {
        console.log(`[KY3P Progress] Calculated progress for task ${taskId}:`, {
          taskId,
          taskType,
          normalizedTaskType: 'ky3p', // We use the same calculation for both KY3P task types
          totalFields,
          completedFields,
          progress: totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
          timeStamp: new Date().toISOString()
        });
      }
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
            sql`${openBankingResponses.status} = 'complete'`
          )
        );
      completedFields = completedResult?.count || 0;
    }
    
    // Calculate progress percentage
    if (totalFields > 0) {
      const rawProgress = Math.round((completedFields / totalFields) * 100);
      // Use our validateProgress function to ensure consistent handling
      progress = validateProgress(rawProgress) as number;
    }
    
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
 * 
 * @param progress The task progress value (0-100)
 * @param currentStatus The current task status
 * @param options Additional options like metadata checks
 * @returns The determined task status
 */
function getStatusFromProgress(
  progress: number | undefined | null, 
  currentStatus: string | null,
  options: {
    metadata?: Record<string, any>;
    checkSubmissionFlag?: boolean;
    debug?: boolean;
  } = {}
): string {
  const { metadata = {}, checkSubmissionFlag = true, debug = false } = options;
  
  // First normalize the current status
  const normalizedStatus = normalizeTaskStatus(currentStatus);
  
  // Ensure progress is a valid number - default to 0 if undefined or null
  const safeProgress = typeof progress === 'number' && !isNaN(progress) ? progress : 0;
  
  // Check for submission indicators in the metadata
  const hasSubmissionDate = metadata?.submissionDate || metadata?.submittedAt || metadata?.submission_date;
  const hasFileId = metadata?.fileId || metadata?.file_id;
  const hasSubmittedFlag = metadata?.submitted === true || metadata?.isSubmitted === true;
  const hasValidResponses = metadata?.responseCount && metadata?.responseCount > 0;
  
  // Log debug information when determining status
  console.log(`[STATUS DETERMINATION] Calculating status for task with:`, {
    progress: safeProgress,
    currentStatus: normalizedStatus,
    hasSubmissionDate: !!hasSubmissionDate,
    hasFileId: !!hasFileId,
    hasSubmittedFlag: !!hasSubmittedFlag,
    hasValidResponses: !!hasValidResponses,
    timestamp: new Date().toISOString()
  });
  
  // CRITICAL FIX: If the task has indicators of being submitted, always preserve that status
  // This prevents the task from being incorrectly set to "not_started" during reconciliation
  if (checkSubmissionFlag && (hasSubmissionDate || hasFileId || hasSubmittedFlag)) {
    console.log(`[STATUS DETERMINATION] Task has submission indicators, preserving SUBMITTED status`, {
      hasSubmissionDate: !!hasSubmissionDate,
      submissionDate: hasSubmissionDate,
      hasFileId: !!hasFileId,
      fileId: hasFileId,
      hasSubmittedFlag: !!hasSubmittedFlag,
      metadata: JSON.stringify(metadata).substring(0, 200) // Truncate for logging
    });
    return TaskStatus.SUBMITTED;
  }
  
  // If the task is already in a terminal state, don't change it
  if (
    normalizedStatus === TaskStatus.SUBMITTED ||
    normalizedStatus === TaskStatus.REJECTED ||
    normalizedStatus === TaskStatus.APPROVED ||
    normalizedStatus === TaskStatus.ARCHIVED
  ) {
    console.log(`[STATUS DETERMINATION] Task is in terminal state, maintaining status: ${normalizedStatus}`);
    return normalizedStatus;
  }
  
  // Special case: if progress is 100% and previous status was READY_FOR_SUBMISSION, keep it
  if (safeProgress === 100 && normalizedStatus === TaskStatus.READY_FOR_SUBMISSION) {
    console.log(`[STATUS DETERMINATION] Task has 100% progress and was ready for submission, preserving status`);
    return TaskStatus.READY_FOR_SUBMISSION;
  }
  
  // Otherwise, set the status based on progress
  if (safeProgress === 0) {
    console.log(`[STATUS DETERMINATION] Task has 0% progress, setting to NOT_STARTED`);
    return TaskStatus.NOT_STARTED;
  } else if (safeProgress < 100) {
    console.log(`[STATUS DETERMINATION] Task has ${safeProgress}% progress, setting to IN_PROGRESS`);
    return TaskStatus.IN_PROGRESS;
  } else { // progress === 100
    console.log(`[STATUS DETERMINATION] Task has 100% progress, setting to READY_FOR_SUBMISSION`);
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
      
      // Determine the correct status based on progress and task metadata
      // Pass the task metadata to getStatusFromProgress to check for submission indicators
      const newStatus = getStatusFromProgress(progress, task.status, {
        metadata: task.metadata || {},
        checkSubmissionFlag: true,
        debug: debug
      });
      
      // Update the task with the new progress value
      // Ensure progress is a valid number
      const numericProgress = Number(progress);
      if (isNaN(numericProgress)) {
        throw new Error(`Invalid progress value: ${progress}`);
      }

      // CRITICAL FIX: Use our progress validator to ensure consistent SQL type casting
      // This ensures proper type handling by the database system for all task types
      // Import validator functions - these must be imported at the top of the file
      // Validate progress and get proper SQL expression
      const validatedProgress = validateProgressForUpdate(taskId, numericProgress, {
        source: 'unified-task-progress',
        debug: debug,
        context: {
          taskType,
          previousProgress: task.progress ?? 0, // Default to 0 if null/undefined
          isForceUpdate: forceUpdate
        }
      });
      
      console.log(`[UnifiedProgress] Updating task ${taskId} progress with explicit SQL casting:`, {
        progress: validatedProgress,
        status: newStatus,
        taskType
      });
      
      // Handle the status field properly - convert newStatus to SQL expression if needed
      const safeStatus = typeof newStatus === 'string' ? newStatus : TaskStatus.NOT_STARTED;
      
      // Log the SQL update query parameters
      console.log(`[UnifiedProgress] Updating task ${taskId} with values:`, {
        progress: validatedProgress,
        status: safeStatus,
        taskType,
        timestamp: new Date().toISOString()
      });
      
      // SIMPLIFIED FIX: Use direct numeric values without complex SQL expressions
      // This avoids the 'could not determine polymorphic type' error
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          // Use a pure numeric value instead of SQL expression
          progress: validatedProgress,
          
          // Use direct string value
          status: safeStatus,
          
          // Use direct Date object
          updated_at: new Date(),
          
          // Keep existing metadata or initialize as empty object
          metadata: {
            ...task.metadata,
            lastProgressUpdate: new Date().toISOString(),
            progressHistory: [
              ...(task.metadata?.progressHistory || []),
              {
                value: validatedProgress,
                timestamp: new Date().toISOString()
              }
            ]
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
        
      console.log(`[UnifiedProgress] Task ${taskId} update successful:`, {
        taskId,
        progress: validatedProgress,
        status: safeStatus
      });
        
      if (!updatedTask) {
        throw new Error('Task update failed');
      }
      
      // Return the result including updated values
      return {
        success: true,
        taskId,
        progress: numericProgress, // Use the validated numeric value for consistency
        status: newStatus,
        previousProgress: task.progress,
        previousStatus: task.status,
        changed: task.progress !== numericProgress || task.status !== newStatus,
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

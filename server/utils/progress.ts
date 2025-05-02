import { TaskStatus } from '../types';
import * as WebSocketService from '../services/websocket';
import { db } from '@db';
import { eq, and, sql } from 'drizzle-orm';
import { 
  tasks, 
  kybResponses, 
  kybFields, 
  ky3pResponses, 
  ky3pFields, 
  openBankingResponses, 
  openBankingFields
} from '@db/schema';

import { hasAllRequiredFields } from './kyb-progress';

/**
 * Standardized form field update broadcast
 * 
 * This function broadcasts a form field update to all connected WebSocket clients
 * with a consistent payload structure.
 * 
 * @param taskId Task ID
 * @param fieldKey Field key (string identifier)
 * @param value Field value
 * @param fieldId Optional field ID (numeric)
 */
export function broadcastFieldUpdate(
  taskId: number | string,
  fieldKey: string,
  value: string,
  fieldId?: number
) {
  // Convert taskId to number to ensure consistency
  const numericTaskId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
  
  // Broadcast the field update with standard payload structure
  WebSocketService.broadcast('field_update', {
    taskId: numericTaskId,
    fieldKey,
    value,
    fieldId: fieldId || null,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[Progress Utils] Broadcasting field update for task ${numericTaskId}, field ${fieldKey}:`, {
    value: value ? (value.length > 50 ? `${value.substring(0, 47)}...` : value) : '(empty)',
    fieldId: fieldId || 'N/A',
    timestamp: new Date().toISOString()
  });
}

/**
 * Standardized submission status broadcast
 * 
 * This function broadcasts a form submission status update to all WebSocket clients
 * for consistent submission handling feedback.
 * 
 * @param taskId Task ID
 * @param status Submission status (success, error, etc.)
 * @param details Optional details about the submission
 */
export function broadcastSubmissionStatus(
  taskId: number | string, 
  status: 'success' | 'error' | 'in_progress',
  details: Record<string, any> = {}
) {
  // Convert taskId to number to ensure consistency
  const numericTaskId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
  
  // Broadcast the submission status
  WebSocketService.broadcast('submission_status', {
    taskId: numericTaskId,
    status,
    ...details,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[Progress Utils] Broadcasting submission status for task ${numericTaskId}:`, {
    status,
    details: Object.keys(details).length > 0 ? details : '(none)',
    timestamp: new Date().toISOString()
  });
}

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
  
  // CRITICAL FIX: Ensure task status strictly follows business rules:
  // 0% = Not Started
  // 1-99% = In Progress
  // 100% (not submitted) = Ready for Submission
  // 100% (submitted) = Submitted
  if (progress === 0) {
    console.log(`[STATUS DETERMINATION] Task has 0% progress, setting to NOT_STARTED`);
    return TaskStatus.NOT_STARTED;
  } else if (progress >= 1 && progress < 100) {
    console.log(`[STATUS DETERMINATION] Task has ${progress}% progress (1-99%), setting to IN_PROGRESS`);
    return TaskStatus.IN_PROGRESS;
  } else if (progress === 100) {
    // Special handling for 100% progress - depends on submission state
    if (metadata?.submissionDate || metadata?.explicitlySubmitted === true || metadata?.status === 'submitted' || currentStatus === TaskStatus.SUBMITTED) {
      console.log(`[STATUS DETERMINATION] Task has 100% progress and is submitted, setting to SUBMITTED`);
      return TaskStatus.SUBMITTED;
    } else {
      console.log(`[STATUS DETERMINATION] Task has 100% progress but is not submitted, setting to READY_FOR_SUBMISSION`);
      return TaskStatus.READY_FOR_SUBMISSION;
    }
  } else {
    // Fallback case, should never happen with validated progress
    console.log(`[STATUS DETERMINATION] Unexpected progress value (${progress}), defaulting to NOT_STARTED`);
    return TaskStatus.NOT_STARTED;
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
/**
 * Universal Task Progress Calculator
 * 
 * This centralized function calculates task progress consistently across all form types
 * by counting COMPLETE fields and dividing by total fields, using Math.round() for percentage.
 * 
 * @param taskId Task ID to calculate progress for
 * @param taskType Type of task ('kyb', 'ky3p', 'open_banking')
 * @param options Optional configuration including transaction for atomic operations
 * @returns Promise<number> Progress percentage (0-100)
 */
/**
 * Calculate universal task progress across different task types
 *
 * This function implements a standardized way to calculate progress
 * for all task types. It can use a transaction for atomic operations.
 *
 * @param taskId Task ID
 * @param taskType Type of task (company_kyb, ky3p, open_banking)
 * @param options Configuration options including transaction context
 * @returns Promise<number> Progress percentage (0-100)
 */
export async function calculateUniversalTaskProgress(
  taskId: number,
  taskType: string,
  options: { tx?: any; debug?: boolean } = {}
): Promise<number> {
  const logPrefix = '[Universal Progress]';
  let totalFields = 0;
  let completedFields = 0;
  const debug = options.debug || false;
  
  // Use the passed transaction context or the global db instance
  const dbContext = options.tx || db;
  
  try {
    // Use the appropriate schema and table based on task type
    if (taskType === 'open_banking') {
      // Count total Open Banking fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed Open Banking responses (with status = COMPLETE)
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            // Use UPPER() for case-insensitive comparison
            sql`UPPER(${openBankingResponses.status}) = 'COMPLETE'`
          )
        );
      completedFields = completedResultQuery[0].count;
    } 
    else if (taskType === 'ky3p' || taskType === 'security' || taskType === 'sp_ky3p_assessment' || taskType === 'security_assessment') {
      // Count total KY3P fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(ky3pFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed KY3P responses (with status = COMPLETE)
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            // Use UPPER() for case-insensitive comparison
            sql`UPPER(${ky3pResponses.status}) = 'COMPLETE'`
          )
        );
      completedFields = completedResultQuery[0].count;
    }
    else { 
      // Default to KYB fields (company_kyb type)
      // Count total KYB fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed KYB responses
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            // Use UPPER() for case-insensitive comparison 
            sql`UPPER(${kybResponses.status}) = 'COMPLETE'`
          )
        );
      completedFields = completedResultQuery[0].count;
    }
    
    // Calculate progress percentage using Math.round for consistency
    // This ensures all task types use the exact same calculation method
    const progressPercentage = totalFields > 0 
      ? Math.min(100, Math.round((completedFields / totalFields) * 100))
      : 0;
    
    if (debug) {
      console.log(`${logPrefix} Calculated progress for task ${taskId} (${taskType}): ${completedFields}/${totalFields} = ${progressPercentage}%`);
    }
    
    return progressPercentage;
  } catch (error) {
    console.error(`${logPrefix} Error calculating universal task progress:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Update Task Progress
 * 
 * Atomic function to update a task's progress in the database and broadcast the update
 * 
 * @param taskId Task ID to update
 * @param taskType Type of task for progress calculation
 * @param options Optional configuration
 * @returns Promise<void>
 */
/**
 * Update task progress with transaction support for atomic operations
 * 
 * This function calculates the current progress for a task and updates it in the database
 * using a transaction to ensure consistency. It also broadcasts the update to all connected clients.
 * 
 * @param taskId Task ID to update
 * @param taskType Type of task (company_kyb, ky3p, open_banking)
 * @param options Configuration options
 * @returns Promise<void>
 */
export async function updateTaskProgress(
  taskId: number,
  taskType: string,
  options: { 
    forceUpdate?: boolean; 
    skipBroadcast?: boolean; 
    debug?: boolean;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  const { forceUpdate = false, skipBroadcast = false, debug = false, metadata = {} } = options;
  const logPrefix = '[Task Progress Update]';
  
  try {
    // Using transaction for atomic operations
    return await db.transaction(async (tx) => {
      // Step 1: Get the current task with transaction
      const [task] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
        
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // Step 2: Calculate the accurate progress using our universal function
      const calculatedProgress = await calculateUniversalTaskProgress(taskId, taskType, { debug, tx });
      
      // Step 3: Check if update is needed with proper type conversion
      const storedProgress = Number(task.progress);
      const newProgress = Number(calculatedProgress);
      
      if (!forceUpdate && storedProgress === newProgress && !isNaN(storedProgress) && !isNaN(newProgress)) {
        if (debug) {
          console.log(`${logPrefix} No progress change needed for task ${taskId} (${taskType}): ${calculatedProgress}%`);
        }
        return;
      }
      
      // Log progress change for debugging purposes
      if (debug) {
        console.log(`${logPrefix} Progress change detected for task ${taskId} (${taskType}):`, {
          stored: storedProgress,
          calculated: newProgress,
          storedType: typeof task.progress,
          calculatedType: typeof calculatedProgress
        });
      }
      
      // Step 4: Determine the appropriate status based on progress
      const newStatus = determineStatusFromProgress(
        calculatedProgress,
        task.status as TaskStatus,
        [], // No formResponses needed since we're using the calculated progress
        { ...task.metadata, ...metadata }
      );
      
      if (debug) {
        console.log(`${logPrefix} Updating task ${taskId} (${taskType}):`, {
          progressFrom: task.progress,
          progressTo: calculatedProgress,
          statusFrom: task.status,
          statusTo: newStatus
        });
      }
      
      // Step 5: Update the task with new progress and status using the transaction
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          progress: Number(calculatedProgress), // Ensure numeric value in database
          status: newStatus,
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            ...metadata,
            lastProgressUpdate: new Date().toISOString(),
            progressHistory: [
              ...(task.metadata?.progressHistory || []),
              { value: calculatedProgress, timestamp: new Date().toISOString() }
            ].slice(-10) // Keep last 10 progress updates
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
        
      // After successful transaction completion, broadcast the update if not skipped
      if (!skipBroadcast) {
        // Broadcasting is done outside of transaction as it doesn't require rollback
        setTimeout(() => {
          broadcastProgressUpdate(
            taskId,
            calculatedProgress,
            newStatus,
            updatedTask.metadata || {}
          );
        }, 0);
      }
      
      // Return updated task data if needed for further processing
      return updatedTask;
    });
  } catch (error) {
    console.error(`${logPrefix} Error updating task progress:`, error);
    throw error;
  }
}

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
  // If no explicit status is provided, determine based on progress
  else if (!finalStatus) {
    if (validatedProgress === 0) {
      finalStatus = TaskStatus.NOT_STARTED;
      console.log(`[Progress Utils] Setting status to NOT_STARTED based on 0% progress`);
    } else if (validatedProgress < 100) {
      finalStatus = TaskStatus.IN_PROGRESS;
      console.log(`[Progress Utils] Setting status to IN_PROGRESS based on ${validatedProgress}% progress`);
    } else if (validatedProgress === 100) {
      finalStatus = TaskStatus.READY_FOR_SUBMISSION;
      console.log(`[Progress Utils] Setting status to READY_FOR_SUBMISSION based on 100% progress`);
    }
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
  WebSocketService.broadcast('task_update', {
    id: taskId,
    status: finalStatus || status || TaskStatus.IN_PROGRESS,
    progress: validatedProgress,
    metadata: metadata || {}
  });
}
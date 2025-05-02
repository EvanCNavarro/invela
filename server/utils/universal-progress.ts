/**
 * Universal Progress Calculator
 * 
 * This module provides a consistent, reliable way to calculate and update task progress
 * across all form types (KYB, KY3P, Open Banking) without special case handling.
 */

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

/**
 * Calculate task progress percentage
 * 
 * This function calculates the progress percentage for any task type
 * using a consistent formula: (completed fields / total fields) * 100
 * 
 * @param taskId Task ID
 * @param taskType Type of task (company_kyb, ky3p, open_banking)
 * @param options Optional configuration
 * @returns Progress percentage (0-100)
 */
export async function calculateTaskProgress(
  taskId: number,
  taskType: string,
  options: { tx?: any; debug?: boolean } = {}
): Promise<number> {
  const logPrefix = '[Progress Calculator]';
  const debug = options.debug || false;
  const dbContext = options.tx || db;
  
  let totalFields = 0;
  let completedFields = 0;
  
  try {
    // 1. Determine which tables to use based on task type
    let fieldsTable, responsesTable, taskIdField, statusField;
    
    if (taskType === 'open_banking') {
      fieldsTable = openBankingFields;
      responsesTable = openBankingResponses;
      taskIdField = openBankingResponses.task_id;
      statusField = openBankingResponses.status;
    } 
    else if (taskType === 'ky3p' || taskType === 'security' || 
             taskType === 'sp_ky3p_assessment' || taskType === 'security_assessment') {
      fieldsTable = ky3pFields;
      responsesTable = ky3pResponses;
      taskIdField = ky3pResponses.task_id;
      statusField = ky3pResponses.status;
    }
    else { // Default to KYB
      fieldsTable = kybFields;
      responsesTable = kybResponses;
      taskIdField = kybResponses.task_id;
      statusField = kybResponses.status;
    }
    
    // 2. Count total fields for this form type
    const totalFieldsResult = await dbContext
      .select({ count: sql<number>`count(*)` })
      .from(fieldsTable);
    
    totalFields = totalFieldsResult[0].count;
    
    // 3. Count completed responses for this task
    const completedResultQuery = await dbContext
      .select({ count: sql<number>`count(*)` })
      .from(responsesTable)
      .where(
        and(
          eq(taskIdField, taskId),
          // Use consistent UPPERCASE comparison for status
          sql`UPPER(${statusField}) = 'COMPLETE'`
        )
      );
    
    completedFields = completedResultQuery[0].count;
    
    // 4. Calculate progress percentage consistently
    const progressPercentage = totalFields > 0 
      ? Math.min(100, Math.round((completedFields / totalFields) * 100))
      : 0;
    
    if (debug) {
      console.log(`${logPrefix} Calculated progress for task ${taskId} (${taskType}): ` +
        `${completedFields}/${totalFields} = ${progressPercentage}%`);
    }
    
    return progressPercentage;
  } catch (error) {
    console.error(`${logPrefix} Error calculating task progress:`, error);
    throw error;
  }
}

/**
 * Determine the appropriate task status based on progress
 * 
 * @param progress Current progress percentage (0-100)
 * @param currentStatus Current task status
 * @param metadata Optional task metadata
 * @returns The appropriate task status
 */
export function determineTaskStatus(
  progress: number, 
  currentStatus: TaskStatus,
  metadata?: Record<string, any>
): TaskStatus {
  const logPrefix = '[Status Calculator]';
  
  // Always respect submission state
  if (metadata?.submissionDate || metadata?.status === 'submitted' || 
      metadata?.explicitlySubmitted === true) {
    console.log(`${logPrefix} Task has submission metadata, setting to SUBMITTED`);
    return TaskStatus.SUBMITTED;
  }
  
  // Don't change terminal states
  if ([TaskStatus.SUBMITTED, TaskStatus.COMPLETED, TaskStatus.APPROVED].includes(currentStatus)) {
    console.log(`${logPrefix} Task is in terminal state (${currentStatus}), preserving status`);
    return currentStatus;
  }
  
  // Strict business rule application
  if (progress === 0) {
    console.log(`${logPrefix} Task has 0% progress, setting to NOT_STARTED`);
    return TaskStatus.NOT_STARTED;
  } else if (progress >= 1 && progress < 100) {
    console.log(`${logPrefix} Task has ${progress}% progress (1-99%), setting to IN_PROGRESS`);
    return TaskStatus.IN_PROGRESS;
  } else if (progress === 100) {
    console.log(`${logPrefix} Task has 100% progress, setting to READY_FOR_SUBMISSION`);
    return TaskStatus.READY_FOR_SUBMISSION;
  } else {
    // Fallback (should never happen with validated progress)
    console.log(`${logPrefix} Unexpected progress value (${progress}), defaulting to NOT_STARTED`);
    return TaskStatus.NOT_STARTED;
  }
}

/**
 * Update task progress and status
 * 
 * @param taskId Task ID
 * @param taskType Task type (company_kyb, ky3p, open_banking)
 * @param options Optional configuration
 * @returns The updated task or null if no update was needed
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
): Promise<any> {
  const { forceUpdate = false, skipBroadcast = false, debug = false, metadata = {} } = options;
  const logPrefix = '[Progress Update]';
  
  try {
    // Use a single transaction for the entire operation
    return await db.transaction(async (tx) => {
      // 1. Get the current task
      const [task] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
        
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // 2. Calculate the accurate progress
      const calculatedProgress = await calculateTaskProgress(taskId, taskType, { debug, tx });
      
      // 3. Convert stored and calculated progress to numbers for consistent comparison
      const storedProgress = Number(task.progress);
      const newProgress = Number(calculatedProgress);
      
      // 4. Always log detailed progress information
      console.log(`${logPrefix} Task ${taskId} (${taskType}) progress check:\n` +
        `  - Stored progress: ${storedProgress}%\n` +
        `  - Calculated progress: ${newProgress}%\n` +
        `  - Force update: ${forceUpdate}`);
      
      // 5. Simple comparison - if progress is the same and no force update, no action needed
      if (!forceUpdate && storedProgress === newProgress) {
        console.log(`${logPrefix} No progress change for task ${taskId} (${taskType})`);
        return null;
      }
      
      // 6. Determine the appropriate status based on the new progress
      const newStatus = determineTaskStatus(
        newProgress, 
        task.status as TaskStatus, 
        { ...task.metadata, ...metadata }
      );
      
      // 7. Update the task with the new progress and status
      console.log(`${logPrefix} Updating task ${taskId} (${taskType}):\n` +
        `  - Progress: ${storedProgress}% -> ${newProgress}%\n` +
        `  - Status: ${task.status} -> ${newStatus}`);
      
      const [updatedTask] = await tx.update(tasks)
        .set({
          progress: newProgress,
          status: newStatus,
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            ...metadata,
            lastProgressUpdate: new Date().toISOString()
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      // 8. Broadcast the update if needed
      if (!skipBroadcast) {
        // Use setTimeout to ensure the transaction completes before broadcasting
        setTimeout(() => {
          console.log(`${logPrefix} Broadcasting progress update for task ${taskId}: ${newProgress}%`);
          broadcastProgressUpdate(taskId, newProgress, newStatus as TaskStatus, updatedTask.metadata || {});
        }, 0);
      }
      
      return updatedTask;
    });
  } catch (error) {
    console.error(`${logPrefix} Error updating task progress:`, error);
    throw error;
  }
}

/**
 * Broadcast a progress update
 * 
 * @param taskId Task ID
 * @param progress Progress percentage
 * @param status Task status
 * @param metadata Optional metadata
 */
export function broadcastProgressUpdate(
  taskId: number,
  progress: number,
  status: TaskStatus,
  metadata: Record<string, any> = {}
): void {
  // Broadcast the progress update with standard format
  WebSocketService.broadcast('progress_update', {
    taskId,
    progress,
    status,
    metadata,
    timestamp: new Date().toISOString()
  });
}

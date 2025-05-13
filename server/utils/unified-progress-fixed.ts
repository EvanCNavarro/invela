/**
 * Unified Progress Update Fixed Module
 * 
 * This module provides a fixed version of the progress update functionality.
 * It addresses the issue with KY3P progress not being correctly stored in the database
 * by adding explicit type handling and forcing updates for KY3P tasks.
 */

import { TaskStatus } from '../types';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks, ky3pResponses, ky3pFields } from '@db/schema';
import { calculateUniversalTaskProgress, determineStatusFromProgress, broadcastProgressUpdate } from './progress';
import { logger } from './logger';
import { sql } from 'drizzle-orm';

/**
 * Fixed update task progress function with guaranteed persistence
 * 
 * This function addresses the issue where KY3P progress is correctly calculated but
 * not properly persisted to the database. It adds extra type safety and logging.
 * 
 * @param taskId Task ID
 * @param taskType Task type (e.g., 'ky3p', 'kyb', 'open_banking')
 * @param options Options for controlling the update behavior
 */
export async function updateKy3pProgressFixed(
  taskId: number,
  options: {
    debug?: boolean;
    metadata?: Record<string, any>;
    forceUpdate?: boolean;
  } = {}
): Promise<{success: boolean; message: string; progress?: number}> {
  const { debug = true, metadata = {}, forceUpdate = true } = options;
  const logPrefix = '[KY3P Progress Fixed]';
  const diagnosticId = `ky3p-fix-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Always use KY3P as the task type for this fixed function
  const taskType = 'ky3p';
  
  try {
    // Step 1: Log the start of the operation with diagnostic info
    logger.info(`${logPrefix} Starting fixed progress update for KY3P task ${taskId}`, {
      taskId,
      diagnosticId,
      timestamp: new Date().toISOString()
    });
    
    // Step 2: Verify the task exists and is a KY3P task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      logger.error(`${logPrefix} Task ${taskId} not found`);
      return { success: false, message: `Task ${taskId} not found` };
    }
    
    if (!task.task_type.toLowerCase().includes('ky3p') &&
        !task.task_type.toLowerCase().includes('security')) {
      logger.error(`${logPrefix} Task ${taskId} is not a KY3P task (type: ${task.task_type})`);
      return { success: false, message: `Task ${taskId} is not a KY3P task (type: ${task.task_type})` };
    }
    
    // Step 3: Calculate the progress with our universal calculator
    const calculatedProgress = await calculateUniversalTaskProgress(taskId, taskType, { debug });
    
    // Always log the calculation result
    logger.info(`${logPrefix} Calculated progress for KY3P task ${taskId}: ${calculatedProgress}%`, {
      taskId,
      calculatedProgress,
      storedProgress: task.progress,
      diagnosticId
    });
    
    // Step 4: Determine appropriate status
    const newStatus = determineStatusFromProgress(
      calculatedProgress,
      task.status as TaskStatus,
      [], // No form responses needed for direct calculation
      { ...task.metadata, ...metadata }
    );
    
    // Step 5: Update the task with a transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // CRITICAL FIX: Use explicit type casting to ensure progress is properly stored
      // Cast calculatedProgress to a numeric type and use explicit db column types
      const progressValue = Number(calculatedProgress);
      
      // Verify the progress value is valid
      if (isNaN(progressValue)) {
        throw new Error(`Invalid progress value: ${calculatedProgress} (${typeof calculatedProgress})`);
      }
      
      // Use explicit returning() to ensure we get back the updated record
      // Add detailed logging for the update operation
      logger.info(`${logPrefix} Performing database update for KY3P task ${taskId}`, {
        taskId,
        progressValue,
        newStatus,
        diagnosticId,
        timestamp: new Date().toISOString()
      });
      
      // CRITICAL FIX: Use SQL type casting for progress to ensure proper persistence
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          // CRITICAL FIX: Use explicit SQL casting to integer 
          progress: sql`${progressValue}::integer`,
          status: newStatus,
          updated_at: new Date(),
          // Use SQL jsonb operations for metadata to ensure proper merging
          metadata: sql`jsonb_set(
            jsonb_set(
              COALESCE(${tasks.metadata}, '{}'::jsonb), 
              '{lastProgressUpdate}', 
              to_jsonb(now()::text)
            ),
            '{progressHistory}',
            COALESCE(${tasks.metadata} -> 'progressHistory', '[]'::jsonb) || 
            jsonb_build_array(jsonb_build_object('value', ${progressValue}, 'timestamp', now()::text))
          )`
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      // Verify the update was successful
      if (!updatedTask) {
        throw new Error(`Failed to update task ${taskId}`);
      }
      
      // Validate stored progress matches what we intended
      const storedProgress = Number(updatedTask.progress);
      
      if (storedProgress !== progressValue) {
        logger.error(`${logPrefix} Progress mismatch after update:`, {
          taskId,
          intendedProgress: progressValue,
          actualProgress: storedProgress,
          difference: storedProgress - progressValue
        });
      } else {
        logger.info(`${logPrefix} Progress successfully updated to ${storedProgress}%`, {
          taskId,
          previousProgress: task.progress,
          newProgress: storedProgress,
          status: newStatus,
          diagnosticId
        });
      }
      
      return updatedTask;
    });
    
    // Step 6: Broadcast the update to all connected clients
    if (result) {
      // Use a setTimeout to ensure the broadcast happens outside the transaction
      setTimeout(() => {
        // Use our existing broadcast function
        broadcastProgressUpdate(
          taskId,
          Number(result.progress),
          result.status as TaskStatus,
          result.metadata || {},
          diagnosticId
        );
        
        logger.info(`${logPrefix} Broadcasted progress update for task ${taskId}`);
      }, 0);
    }
    
    return {
      success: true,
      message: `Successfully updated KY3P task ${taskId} progress to ${calculatedProgress}%`,
      progress: calculatedProgress
    };
  } catch (error) {
    // Comprehensive error handling with full diagnostics
    logger.error(`${logPrefix} Error updating KY3P task progress:`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      diagnosticId,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      message: `Error updating progress: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Calculate and update task progress with proper transaction boundaries
 * 
 * This function calculates the current progress for a KY3P task and updates
 * the task record with the calculated value, all within a single transaction.
 * 
 * @param taskId Task ID
 * @param options Options for controlling the update behavior
 * @returns Object with success status, progress value, and status
 */
export async function calculateAndUpdateTaskProgress(
  taskId: number,
  options: {
    debug?: boolean;
    force?: boolean;
    source?: string;
  } = {}
): Promise<{
  success: boolean;
  message: string;
  progress: number;
  status: string;
}> {
  const { debug = false, force = false, source = 'unknown' } = options;
  const logPrefix = '[KY3P Progress]';
  const diagnosticId = `ky3p-progress-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  try {
    // Step 1: Verify the task exists
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      logger.error(`${logPrefix} Task ${taskId} not found`);
      return { 
        success: false, 
        message: `Task ${taskId} not found`,
        progress: 0,
        status: 'error' 
      };
    }
    
    // Step 2: Calculate accurate progress directly from the database within a transaction
    const result = await db.transaction(async (tx) => {
      // Count total KY3P fields
      const totalFieldsResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(ky3pFields);
      
      const totalFields = totalFieldsResult[0].count;
      
      // Count completed KY3P responses with complete status
      const completedResultQuery = await tx
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          sql`${ky3pResponses.task_id} = ${taskId} AND UPPER(${ky3pResponses.status}) = 'COMPLETE'`
        );
      
      // Calculate what percentage of responses are complete
      const completedFields = completedResultQuery[0].count;
      
      // Calculate progress percentage (0-100)
      const calculatedProgress = totalFields > 0 
        ? Math.min(100, Math.round((completedFields / totalFields) * 100)) 
        : 0;
      
      // Log calculation details
      logger.info(`${logPrefix} Calculated progress for task ${taskId}: ${completedFields}/${totalFields} = ${calculatedProgress}%`);
      
      // Determine appropriate status based on progress
      const currentStatus = task.status as TaskStatus;
      const calculatedStatus = 
        calculatedProgress === 0 ? TaskStatus.NOT_STARTED :
        calculatedProgress >= 100 ? TaskStatus.READY_FOR_SUBMISSION :
        TaskStatus.IN_PROGRESS;
      
      // Only update if progress is different or status needs to change
      if (force || task.progress !== calculatedProgress || currentStatus !== calculatedStatus) {
        // Update the task record with calculated progress and status
        // CRITICAL FIX: Use explicit SQL type casting for progress value
        logger.info(`[KY3P Progress] Using explicit SQL casting for task ${taskId} progress update`, {
          taskId,
          calculatedProgress,
          calculatedStatus,
          timestamp: new Date().toISOString(),
          source
        });
        
        const [updatedTask] = await tx
          .update(tasks)
          .set({
            // Use explicit SQL casting to integer to ensure proper type handling
            progress: sql`${calculatedProgress}::integer`,
            status: calculatedStatus,
            updated_at: new Date(),
            metadata: sql`jsonb_set(
              jsonb_set(
                COALESCE(${tasks.metadata}, '{}'::jsonb),
                '{lastProgressReconciliation}',
                to_jsonb(now()::text)
              ),
              '{reconciliationSource}',
              to_jsonb(${source}::text)
            )`
          })
          .where(eq(tasks.id, taskId))
          .returning();
        
        // Return the updated task
        return {
          task: updatedTask,
          progress: calculatedProgress,
          status: calculatedStatus,
          previousProgress: task.progress
        };
      }
      
      // No update needed, return current values
      return {
        task,
        progress: task.progress,
        status: currentStatus,
        previousProgress: task.progress,
        noUpdateNeeded: true
      };
    });
    
    // Step 3: Broadcast progress update outside the transaction
    if (result && !result.noUpdateNeeded) {
      // Use our existing broadcast function to notify clients
      broadcastProgressUpdate(
        taskId,
        result.progress,
        result.status as TaskStatus,
        result.task.metadata || {}
      );
      
      logger.info(`${logPrefix} Broadcasted progress update for task ${taskId}: ${result.progress}% (${result.status})`);
    } else if (result?.noUpdateNeeded && debug) {
      logger.info(`${logPrefix} No update needed for task ${taskId}: progress=${result.progress}%, status=${result.status}`);
    }
    
    return {
      success: true,
      message: `Task ${taskId} progress calculation complete`,
      progress: result?.progress || 0,
      status: result?.status || 'unknown'
    };
  } catch (error) {
    // Comprehensive error handling
    logger.error(`${logPrefix} Error calculating KY3P task progress:`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      source,
      diagnosticId
    });
    
    return {
      success: false,
      message: `Error calculating progress: ${error instanceof Error ? error.message : String(error)}`,
      progress: 0,
      status: 'error'
    };
  }
}

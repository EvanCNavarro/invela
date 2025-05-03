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
import { tasks } from '@db/schema';
import { calculateUniversalTaskProgress, determineStatusFromProgress, broadcastProgressUpdate } from './progress';
import { logger } from './logger';

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
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          // CRITICAL FIX: Use direct numeric value rather than calculation reference
          progress: progressValue,
          status: newStatus,
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            ...metadata,
            lastProgressUpdate: new Date().toISOString(),
            progressHistory: [
              ...(task.metadata?.progressHistory || []),
              { value: progressValue, timestamp: new Date().toISOString() }
            ].slice(-10) // Keep last 10 updates
          }
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

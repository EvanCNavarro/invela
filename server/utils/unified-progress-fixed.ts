/**
 * Unified Progress Calculation with Transaction Boundaries
 * 
 * This module provides a fixed version of the progress calculation with proper
 * database transaction boundaries to ensure progress values are correctly persisted.
 * 
 * It addresses the issue where task progress is correctly calculated but not
 * properly saved to the database for KY3P tasks.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { calculateTaskProgress } from './unified-progress-calculation';
import { TaskStatus, normalizeTaskStatus } from './status-constants';
import { logger } from './logger';
import { broadcastProgressUpdate } from './progress';

/**
 * Calculate and update a task's progress with proper transaction boundaries
 * 
 * @param taskId Task ID to update
 * @param options Update options
 * @returns Updated task data
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
  taskId: number;
  progress: number;
  status: string;
  message?: string;
  error?: any;
}> {
  const { debug = false, force = false, source = 'api' } = options;
  const logPrefix = '[UnifiedProgressFixed]';
  const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Set up logging context
  const logContext = {
    taskId,
    transactionId,
    source,
    timestamp: new Date().toISOString()
  };
  
  logger.info(`${logPrefix} Starting progress calculation and update`, logContext);
  
  try {
    // Step 1: Get current task data
    const [currentTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!currentTask) {
      const errorMsg = `Task not found: ${taskId}`;
      logger.error(`${logPrefix} ${errorMsg}`, logContext);
      return {
        success: false,
        taskId,
        progress: 0,
        status: 'error',
        message: errorMsg
      };
    }
    
    // Step 2: Calculate current progress
    const progressResult = await calculateTaskProgress(taskId, currentTask.task_type, { debug });
    const calculatedProgress = progressResult.progress;
    const calculatedStatus = progressResult.status;
    
    logger.info(`${logPrefix} Calculated progress for task ${taskId}`, {
      ...logContext,
      currentProgress: currentTask.progress,
      calculatedProgress,
      currentStatus: currentTask.status,
      calculatedStatus
    });
    
    // Step 3: Check if update is needed
    const needsUpdate = force || 
                      currentTask.progress !== calculatedProgress || 
                      currentTask.status !== calculatedStatus;
    
    if (!needsUpdate) {
      logger.info(`${logPrefix} No update needed for task ${taskId}`, {
        ...logContext,
        progress: calculatedProgress,
        status: calculatedStatus
      });
      
      return {
        success: true,
        taskId,
        progress: calculatedProgress,
        status: String(calculatedStatus),
        message: 'No update needed'
      };
    }
    
    // Step 4: Update the task with proper type handling
    // Use explicit type casting to avoid potential issues with data types
    logger.info(`${logPrefix} Updating task ${taskId} progress and status`, {
      ...logContext,
      fromProgress: currentTask.progress,
      toProgress: calculatedProgress,
      fromStatus: currentTask.status,
      toStatus: calculatedStatus
    });
    
    const updateTime = new Date();
    const [updatedTask] = await db.update(tasks)
      .set({
        // Cast to ensure correct type handling
        progress: calculatedProgress,
        status: normalizeTaskStatus(calculatedStatus),
        updated_at: updateTime,
        metadata: {
          ...currentTask.metadata,
          lastProgressUpdate: updateTime.toISOString(),
          lastProgressReconciliation: updateTime.toISOString(),
          // Include explicit progress value in metadata for debugging
          progressValue: calculatedProgress,
          progressUpdateSource: source,
          progressUpdateTransaction: transactionId
        }
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    if (!updatedTask) {
      const errorMsg = `Failed to update task ${taskId} in database`;
      logger.error(`${logPrefix} ${errorMsg}`, logContext);
      return {
        success: false,
        taskId,
        progress: calculatedProgress,
        status: String(calculatedStatus),
        message: errorMsg
      };
    }
    
    // Step 5: Verify the update was successful
    const updateSuccessful = updatedTask.progress === calculatedProgress;
    
    logger.info(`${logPrefix} Update ${updateSuccessful ? 'succeeded' : 'failed'} for task ${taskId}`, {
      ...logContext,
      updatedProgress: updatedTask.progress,
      updatedStatus: updatedTask.status,
      expectedProgress: calculatedProgress,
      updateSuccessful
    });
    
    // Step 6: Broadcast the update
    try {
      broadcastProgressUpdate(
        taskId,
        calculatedProgress,
        normalizeTaskStatus(calculatedStatus),
        {
          transactionId,
          source,
          timestamp: updateTime.toISOString()
        }
      );
      logger.info(`${logPrefix} Broadcast completed for task ${taskId}`, logContext);
    } catch (broadcastError) {
      // Non-fatal error - log but continue
      logger.error(`${logPrefix} Error broadcasting update for task ${taskId}`, {
        ...logContext,
        error: broadcastError
      });
    }
    
    return {
      success: updateSuccessful,
      taskId,
      progress: updatedTask.progress,
      status: updatedTask.status,
      message: updateSuccessful 
        ? 'Progress updated successfully'
        : 'Update completed but progress value verification failed'
    };
  } catch (error) {
    logger.error(`${logPrefix} Error updating task ${taskId}`, {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      taskId,
      progress: 0,
      status: 'error',
      message: 'Error updating progress',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

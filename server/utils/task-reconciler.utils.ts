/**
 * Fixed Task Reconciliation Module
 * 
 * This module provides a fixed version of the task reconciliation system that uses
 * the fixed field progress calculator to avoid Drizzle ORM type errors.
 */

import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { logger } from './logger';
import { calculateTaskProgressFixed, updateTaskProgressAndStatusFixed } from './field-progress.utils';
import { TaskStatus } from '../types';

/**
 * Reconcile task progress and status using the fixed progress calculator
 * 
 * @param taskId Task ID
 * @param options Additional options for reconciliation
 * @returns Promise with reconciliation result
 */
export async function reconcileTaskProgressFixed(
  taskId: number,
  options: {
    forceUpdate?: boolean;
    skipBroadcast?: boolean;
    preserveExisting?: boolean; // If true, don't update progress if it hasn't changed
    debug?: boolean;
    metadata?: Record<string, any>;
    operation?: string; // Operation name for logging
  } = {}
): Promise<{
  success: boolean;
  message: string;
  taskId: number;
  progress: number;
  status: string;
  wasUpdated: boolean;
}> {
  const { 
    forceUpdate = false, 
    skipBroadcast = false, 
    preserveExisting = false,
    debug = false,
    metadata = {},
    operation = 'reconcile'
  } = options;
  
  const logPrefix = '[Fixed Reconcile Task]';
  
  try {
    // Step 1: Get the task from the database
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      logger.error(`${logPrefix} Task ${taskId} not found`);
      return {
        success: false,
        message: `Task ${taskId} not found`,
        taskId,
        progress: 0,
        status: 'error',
        wasUpdated: false
      };
    }
    
    // Step 2: Calculate current progress using fixed calculation function
    logger.info(`${logPrefix} Starting task reconciliation for ${taskId} (${task.task_type})`, {
      taskId,
      taskType: task.task_type,
      currentProgress: task.progress,
      currentStatus: task.status,
      operation,
      timestamp: new Date().toISOString()
    });
    
    // If preserveExisting is true and task progress is already 100%,
    // don't recalculate progress to avoid accidental resets
    if (preserveExisting && task.progress === 100) {
      logger.info(`[FixedProgressCalc] Preserving existing progress for task ${taskId} (${task.task_type}): 100%`, {
        taskId,
        taskType: task.task_type,
        existingProgress: task.progress,
        operation: 'preserve-existing'
      });
      
      // Determine status based on the preserved progress value
      const result = await updateTaskProgressAndStatusFixed(taskId, task.task_type, {
        forceUpdate,
        skipBroadcast,
        debug,
        metadata: {
          ...metadata,
          preservedProgress: true,
          reconciliationOperation: operation
        }
      });
      
      return {
        success: true,
        message: `Preserved 100% progress for task ${taskId}`,
        taskId,
        progress: 100,
        status: result.status || task.status,
        wasUpdated: result.wasUpdated
      };
    }
    
    // Normal flow - calculate progress and update
    try {
      // Calculate progress and update the task with fixed function
      const result = await updateTaskProgressAndStatusFixed(taskId, task.task_type, {
        forceUpdate,
        skipBroadcast,
        debug,
        metadata: {
          ...metadata,
          reconciliationOperation: operation
        }
      });
      
      return {
        success: true,
        message: result.wasUpdated 
          ? `Updated task ${taskId} progress to ${result.progress}% and status to ${result.status}`
          : `No changes needed for task ${taskId}`,
        taskId,
        progress: result.progress,
        status: result.status,
        wasUpdated: result.wasUpdated
      };
    } catch (calculationError) {
      logger.error(`${logPrefix} Error calculating progress for task ${taskId}:`, {
        taskId,
        error: calculationError instanceof Error ? calculationError.message : String(calculationError),
        stack: calculationError instanceof Error ? calculationError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw calculationError;
    }
  } catch (error) {
    // Comprehensive error logging
    logger.error(`${logPrefix} Error reconciling task ${taskId}:`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      message: `Error reconciling task: ${error instanceof Error ? error.message : String(error)}`,
      taskId,
      progress: 0,
      status: 'error',
      wasUpdated: false
    };
  }
}

/**
 * Reconcile specific fields for a task using the fixed reconciler
 * 
 * @param taskId Task ID
 * @param fieldKeys Array of field keys that were updated
 * @param options Additional options
 */
export async function reconcileTaskFieldsFixed(
  taskId: number,
  fieldKeys: string[],
  options: {
    forceUpdate?: boolean;
    taskType?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<{
  success: boolean;
  message: string;
  progress: number;
  status: string;
}> {
  const { forceUpdate = false, metadata = {} } = options;
  const logPrefix = '[Fixed Reconcile Fields]';
  
  try {
    // Step 1: Get the task to determine task type
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      logger.error(`${logPrefix} Task ${taskId} not found`);
      return {
        success: false,
        message: `Task ${taskId} not found`,
        progress: 0,
        status: 'error'
      };
    }
    
    const taskType = options.taskType || task.task_type;
    
    // Step 2: Reconcile the task with specific field context
    logger.info(`${logPrefix} Reconciling ${fieldKeys.length} fields for task ${taskId} (${taskType})`, {
      taskId,
      fieldCount: fieldKeys.length,
      fieldKeys,
      taskType
    });
    
    const result = await reconcileTaskProgressFixed(taskId, {
      forceUpdate,
      metadata: {
        ...metadata,
        updatedFieldKeys: fieldKeys,
        fieldCount: fieldKeys.length
      },
      operation: 'field-update'
    });
    
    return {
      success: result.success,
      message: result.message,
      progress: result.progress,
      status: result.status
    };
  } catch (error) {
    // Comprehensive error logging
    logger.error(`${logPrefix} Error reconciling fields for task ${taskId}:`, {
      taskId,
      fieldKeys,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      message: `Error reconciling fields: ${error instanceof Error ? error.message : String(error)}`,
      progress: 0,
      status: 'error'
    };
  }
}

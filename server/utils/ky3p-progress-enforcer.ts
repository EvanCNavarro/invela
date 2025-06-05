/**
 * KY3P Progress Enforcer Utility
 * 
 * This utility provides a specialized set of functions for ensuring consistent
 * progress handling specifically for KY3P forms. It addresses the type conversion
 * issues that occur when storing progress values in the database.
 * 
 * The key issues this solves:
 * 1. Explicit type casting for KY3P progress values
 * 2. Atomic database updates to ensure consistent progress state
 * 3. Enhanced logging to track progress updates
 * 4. Immediate progress fixing for submitted forms
 */

import { db } from '@db';
import { logger } from './logger';
import { sql, eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { broadcastTaskUpdate } from './unified-websocket';
import { validateProgress } from './progress-validator';
import { TaskStatus } from '../types';

// Constants for clearer code
const PROGRESS_COMPLETE = 100;
const SUBMITTED_STATUS = TaskStatus.SUBMITTED;

// Allowed message types for broadcasts (to ensure type safety)
type AllowedBroadcastType = 'task_updated' | 'form_submission_completed';

/**
 * Ensures a KY3P task has the correct progress value (100%) when submitted
 * 
 * This function is designed to be called immediately after a KY3P form is submitted
 * to ensure the progress is correctly set to 100% in the database.
 * 
 * @param taskId The ID of the KY3P task to enforce progress on
 * @returns A result object with success status and details
 */
export async function enforceKy3pSubmittedProgress(taskId: number): Promise<{
  success: boolean;
  taskId: number;
  message?: string;
  oldProgress?: number;
  newProgress?: number;
  error?: string;
}> {
  const transactionId = `ky3p_progress_fix_${Date.now()}`;
  
  logger.info(`[KY3P Progress Enforcer] Enforcing progress for task ${taskId}`, {
    taskId,
    transactionId,
    timestamp: new Date().toISOString()
  });

  try {
    // First, check if this task is actually a KY3P task and has been submitted
    const [taskDetails] = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        progress: tasks.progress,
        task_type: tasks.task_type,
        metadata: tasks.metadata
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!taskDetails) {
      logger.warn(`[KY3P Progress Enforcer] Task ${taskId} not found`, {
        taskId,
        transactionId
      });
      
      return {
        success: false,
        taskId,
        message: `Task ${taskId} not found`,
        error: 'TASK_NOT_FOUND'
      };
    }

    // Check if this is a KY3P task
    const isKy3pTask = taskDetails.task_type === 'ky3p' || 
                        taskDetails.task_type === 'sp_ky3p_assessment';
    
    if (!isKy3pTask) {
      logger.info(`[KY3P Progress Enforcer] Task ${taskId} is not a KY3P task, skipping`, {
        taskId,
        taskType: taskDetails.task_type,
        transactionId
      });
      
      return {
        success: true,
        taskId,
        message: `Task ${taskId} is not a KY3P task, no action needed`,
        oldProgress: taskDetails.progress
      };
    }

    // Check if the task has submission indicators
    const metadata = taskDetails.metadata || {};
    const hasSubmissionDate = !!metadata.submission_date;
    const hasSubmittedFlag = !!metadata.submitted;
    const isTerminalState = taskDetails.status === SUBMITTED_STATUS;

    // Track for logging purposes
    const submissionIndicators = {
      hasSubmissionDate,
      hasSubmittedFlag,
      isTerminalState,
      currentProgress: taskDetails.progress,
      currentStatus: taskDetails.status,
    };

    logger.info(`[KY3P Progress Enforcer] Task submission indicators:`, {
      taskId,
      ...submissionIndicators,
      transactionId
    });

    // If the task has submission indicators but progress is not 100%, fix it
    const needsProgressFix = (hasSubmissionDate || hasSubmittedFlag || isTerminalState) && 
                            taskDetails.progress !== PROGRESS_COMPLETE;

    if (!needsProgressFix) {
      logger.info(`[KY3P Progress Enforcer] Task ${taskId} progress is already correct`, {
        taskId,
        currentProgress: taskDetails.progress,
        currentStatus: taskDetails.status,
        transactionId
      });
      
      return {
        success: true,
        taskId,
        message: `Task ${taskId} progress is already correct`,
        oldProgress: taskDetails.progress,
        newProgress: taskDetails.progress
      };
    }

    // Task needs progress fix - update the progress with explicit SQL casting
    logger.info(`[KY3P Progress Enforcer] Fixing progress for task ${taskId}`, {
      taskId,
      oldProgress: taskDetails.progress, 
      newProgress: PROGRESS_COMPLETE,
      transactionId
    });

    // Update with explicit SQL casting to ensure proper type handling
    const result = await db.update(tasks)
      .set({
        // Use a SQL expression with explicit CAST to ensure consistent type handling
        progress: sql`CAST(${PROGRESS_COMPLETE} AS INTEGER)`,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning({
        id: tasks.id,
        progress: tasks.progress,
        status: tasks.status
      });

    if (!result || result.length === 0) {
      throw new Error(`Failed to update task ${taskId}`);
    }

    const updatedTask = result[0];
    
    logger.info(`[KY3P Progress Enforcer] Successfully updated task ${taskId} progress`, {
      taskId,
      oldProgress: taskDetails.progress,
      newProgress: updatedTask.progress,
      transactionId
    });

    // Broadcast the update to connected clients
    try {
      broadcastTaskUpdate({
        taskId,
        status: updatedTask.status as TaskStatus,
        progress: updatedTask.progress,
        metadata: {
          ...metadata,
          // Ensure submission indicators are properly set
          submitted: true,
          completed: true
        },
        message: 'KY3P form progress fixed to 100%'
      });
      
      logger.info(`[KY3P Progress Enforcer] Broadcasted task update for ${taskId}`, {
        taskId,
        transactionId
      });
    } catch (broadcastError) {
      logger.error(`[KY3P Progress Enforcer] Error broadcasting task update`, {
        taskId,
        error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError),
        transactionId
      });
      // Continue execution - broadcast failure shouldn't fail the entire operation
    }

    return {
      success: true,
      taskId,
      message: `Successfully updated task ${taskId} progress from ${taskDetails.progress} to ${updatedTask.progress}`,
      oldProgress: taskDetails.progress,
      newProgress: updatedTask.progress
    };

  } catch (error) {
    logger.error(`[KY3P Progress Enforcer] Error enforcing progress for task ${taskId}`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      transactionId
    });
    
    return {
      success: false,
      taskId,
      message: `Error enforcing progress: ${error instanceof Error ? error.message : String(error)}`,
      error: 'PROGRESS_UPDATE_ERROR'
    };
  }
}

/**
 * Fix KY3P progress when a form is submitted
 * 
 * This function ensures the progress is set to 100% immediately after form submission
 * 
 * @param taskId The ID of the task to fix
 * @param force If true, forces the progress to 100% regardless of current state
 * @returns A result object with success status and details
 */
export async function fixKy3pFormSubmission(
  taskId: number, 
  force: boolean = false
): Promise<{
  success: boolean;
  taskId: number;
  message?: string;
}> {
  // Generate a diagnostic ID for tracing this operation
  const diagnosticId = `fix_ky3p_${taskId}_${Date.now()}`;
  
  logger.info(`[KY3P Form Fix] Starting KY3P form submission fix`, {
    taskId,
    force,
    diagnosticId
  });
  
  try {
    // Fetch the current task state
    const [task] = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        progress: tasks.progress,
        task_type: tasks.task_type,
        metadata: tasks.metadata
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      logger.error(`[KY3P Form Fix] Task ${taskId} not found`, { diagnosticId });
      return {
        success: false,
        taskId,
        message: `Task ${taskId} not found`
      };
    }
    
    // Determine if this is a KY3P task
    const isKy3pTask = task.task_type === 'ky3p' || task.task_type === 'sp_ky3p_assessment';
    
    if (!isKy3pTask) {
      logger.info(`[KY3P Form Fix] Task ${taskId} is not a KY3P task, no action needed`, {
        taskType: task.task_type,
        diagnosticId
      });
      
      return {
        success: true,
        taskId,
        message: 'Not a KY3P task, no action needed'
      };
    }
    
    // Check if we need to fix the progress
    const needsFix = force || 
                     task.status === SUBMITTED_STATUS || 
                     (task.metadata && task.metadata.submitted) || 
                     (task.metadata && task.metadata.submission_date);
    
    if (!needsFix) {
      logger.info(`[KY3P Form Fix] Task ${taskId} does not need progress fix`, {
        status: task.status,
        progress: task.progress,
        diagnosticId
      });
      
      return {
        success: true,
        taskId,
        message: 'Task does not need a progress fix'
      };
    }
    
    // Apply the progress fix with explicit type casting
    logger.info(`[KY3P Form Fix] Applying progress fix to task ${taskId}`, {
      oldProgress: task.progress,
      newProgress: PROGRESS_COMPLETE,
      diagnosticId
    });
    
    // Apply the progress fix
    const result = await enforceKy3pSubmittedProgress(taskId);
    
    if (!result.success) {
      logger.error(`[KY3P Form Fix] Failed to apply progress fix to task ${taskId}`, {
        error: result.error,
        diagnosticId
      });
      
      return {
        success: false,
        taskId,
        message: `Progress fix failed: ${result.message}`
      };
    }
    
    logger.info(`[KY3P Form Fix] Successfully applied progress fix to task ${taskId}`, {
      oldProgress: result.oldProgress,
      newProgress: result.newProgress,
      diagnosticId
    });
    
    return {
      success: true,
      taskId,
      message: `Progress fix applied successfully: ${result.message}`
    };
    
  } catch (error) {
    logger.error(`[KY3P Form Fix] Error during KY3P form submission fix`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      diagnosticId
    });
    
    return {
      success: false,
      taskId,
      message: `Error during fix: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Batch fix KY3P tasks with incorrect progress
 * 
 * This function finds all KY3P tasks that have been submitted
 * but don't have 100% progress and fixes them.
 * 
 * @returns A result object with counts of fixed tasks
 */
export async function batchFixKy3pTasks(): Promise<{
  success: boolean;
  message: string;
  found: number;
  fixed: number;
  errors: number;
}> {
  const batchId = `ky3p_batch_${Date.now()}`;
  
  logger.info(`[KY3P Batch Fix] Starting batch fix operation`, { batchId });
  
  try {
    // Find all KY3P tasks with submission indicators but incorrect progress
    const potentialTasks = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        progress: tasks.progress,
        task_type: tasks.task_type,
        metadata: tasks.metadata
      })
      .from(tasks)
      .where(
        sql`(${tasks.task_type} = 'ky3p' OR ${tasks.task_type} = 'sp_ky3p_assessment') AND 
           (${tasks.status} = 'submitted' OR 
            ${tasks.metadata}->>'submitted' = 'true' OR 
            ${tasks.metadata}->>'submission_date' IS NOT NULL) AND
           ${tasks.progress} < 100`
      );
    
    logger.info(`[KY3P Batch Fix] Found ${potentialTasks.length} KY3P tasks that need fixing`, { batchId });
    
    if (potentialTasks.length === 0) {
      return {
        success: true,
        message: 'No tasks found that need fixing',
        found: 0,
        fixed: 0,
        errors: 0
      };
    }
    
    // Fix each task
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const task of potentialTasks) {
      try {
        const result = await enforceKy3pSubmittedProgress(task.id);
        
        if (result.success) {
          fixedCount++;
          logger.info(`[KY3P Batch Fix] Fixed task ${task.id}`, {
            oldProgress: result.oldProgress,
            newProgress: result.newProgress,
            batchId
          });
        } else {
          errorCount++;
          logger.error(`[KY3P Batch Fix] Failed to fix task ${task.id}`, {
            error: result.error,
            batchId
          });
        }
      } catch (error) {
        errorCount++;
        logger.error(`[KY3P Batch Fix] Error fixing task ${task.id}`, {
          error: error instanceof Error ? error.message : String(error),
          batchId
        });
      }
    }
    
    logger.info(`[KY3P Batch Fix] Batch fix completed`, {
      found: potentialTasks.length,
      fixed: fixedCount,
      errors: errorCount,
      batchId
    });
    
    return {
      success: true,
      message: `Fixed ${fixedCount} out of ${potentialTasks.length} tasks`,
      found: potentialTasks.length,
      fixed: fixedCount,
      errors: errorCount
    };
    
  } catch (error) {
    logger.error(`[KY3P Batch Fix] Error during batch fix operation`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      batchId
    });
    
    return {
      success: false,
      message: `Error during batch fix: ${error instanceof Error ? error.message : String(error)}`,
      found: 0,
      fixed: 0,
      errors: 1
    };
  }
}
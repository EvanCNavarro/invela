/**
 * Unified Progress Calculator
 * 
 * This utility provides a consistent approach to calculating progress
 * across different form types. It ensures that progress calculations
 * are performed the same way whether triggered by form submission,
 * task dependency updates, or manual reconciliation.
 */

import { sql } from 'drizzle-orm';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { WebSocketServer } from '../websocket';
import { calculateKybProgress } from './progress-calculators/kyb-progress';
import { calculateKy3pProgress } from './progress-calculators/ky3p-progress';
import { calculateOpenBankingProgress } from './progress-calculators/open-banking-progress';
import getLogger from './logger';

const logger = getLogger('UnifiedProgress');

// Supported task types
type TaskType = 'company_kyb' | 'ky3p' | 'open_banking' | 'user_kyb';

// Result interface
interface ProgressResult {
  success: boolean;
  taskId: number;
  progress: number;
  status: string;
  message?: string;
  error?: any;
}

// Options for progress calculation
interface ProgressOptions {
  preserveProgress?: boolean;
  updateDatabase?: boolean;
  sendWebSocketUpdate?: boolean;
  transaction?: any;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * Calculate and update progress for a task
 * 
 * @param taskId The task ID
 * @param taskType The task type
 * @param options Options for the calculation and update
 * @returns The calculation result
 */
export async function calculateAndUpdateProgress(
  taskId: number,
  taskType: TaskType,
  options: ProgressOptions = {}
): Promise<ProgressResult> {
  const {
    preserveProgress = false,
    updateDatabase = true,
    sendWebSocketUpdate = true,
    transaction = null,
    source = 'api',
    metadata = {},
  } = options;
  
  // Create a diagnostic ID for tracking this update across logs
  const diagnosticId = `prog-${Date.now()}-${Math.floor(Math.random() * 100)}`;
  
  logger.info(`Starting progress update for task ${taskId} (${taskType})`, {
    taskId,
    taskType,
    diagnosticId,
    metadata: Object.keys(metadata),
  });
  
  try {
    // If a transaction is provided, use it
    const tx = transaction || db;
    
    // Get the current task status
    const task = await tx.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      columns: {
        id: true,
        progress: true,
        status: true,
      },
    });
    
    if (!task) {
      return {
        success: false,
        taskId,
        progress: 0,
        status: 'not_found',
        message: `Task ${taskId} not found`,
      };
    }
    
    // Get the current progress and status
    const currentProgress = task.progress;
    const currentStatus = task.status;
    
    // Check if the task is in a terminal state
    const terminalStates = ['submitted', 'approved', 'rejected', 'archived'];
    
    // If the task is in a terminal state and we're not preserving progress,
    // don't update it
    if (terminalStates.includes(currentStatus) && !preserveProgress) {
      return {
        success: true,
        taskId,
        progress: currentProgress,
        status: currentStatus,
        message: `Task is in terminal state (${currentStatus}), progress calculation skipped`,
      };
    }
    
    // Calculate the progress for the task
    logger.info(`Calculating progress for task ${taskId} (${taskType})`);
    
    let calculatedProgress = 0;
    
    try {
      // Use the appropriate progress calculator based on task type
      switch (taskType) {
        case 'company_kyb':
          calculatedProgress = await calculateKybProgress(taskId, tx);
          break;
          
        case 'ky3p':
          // Get additional metadata for KY3P tasks
          const isKy3pTask = taskType === 'ky3p';
          metadata.isKy3pTask = isKy3pTask;
          calculatedProgress = await calculateKy3pProgress(taskId, tx);
          break;
          
        case 'open_banking':
          calculatedProgress = await calculateOpenBankingProgress(taskId, tx);
          break;
          
        case 'user_kyb':
          // Simplified progress calculation for user KYB
          const totalFields = await tx.execute(
            sql`SELECT COUNT(*) as count FROM user_kyb_field_definitions`
          );
          const completedFields = await tx.execute(
            sql`SELECT COUNT(*) as count FROM user_kyb_responses WHERE task_id = ${taskId}`
          );
          
          const total = parseInt(totalFields[0].count, 10) || 1; // Avoid division by zero
          const completed = parseInt(completedFields[0].count, 10) || 0;
          
          calculatedProgress = Math.min(100, Math.round((completed / total) * 100));
          break;
          
        default:
          return {
            success: false,
            taskId,
            progress: currentProgress,
            status: currentStatus,
            message: `Unsupported task type: ${taskType}`,
          };
      }
      
      logger.info(`Task ${taskId} (${taskType}) progress: ${calculatedProgress}%`);
    } catch (error) {
      logger.error(`Error calculating progress for task ${taskId}:`, error);
      return {
        success: false,
        taskId,
        progress: currentProgress,
        status: currentStatus,
        message: `Error calculating progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      };
    }
    
    // Determine the final progress value
    const finalProgress = preserveProgress 
      ? Math.max(currentProgress, calculatedProgress)
      : calculatedProgress;
    
    // Determine if progress has changed
    const hasProgressChanged = finalProgress !== currentProgress;
    
    // Determine the status based on progress
    let newStatus = currentStatus;
    
    // Only update status if it's not already in a terminal state
    if (!terminalStates.includes(currentStatus)) {
      if (finalProgress === 100) {
        newStatus = 'submitted';
      } else if (finalProgress > 0) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'not_started';
      }
    }
    
    // Determine if status has changed
    const hasStatusChanged = newStatus !== currentStatus;
    
    // Update the task in the database if needed
    if (updateDatabase && (hasProgressChanged || hasStatusChanged)) {
      logger.info(`Updating task ${taskId} status/progress in database`, {
        previousProgress: currentProgress,
        newProgress: finalProgress,
        previousStatus: currentStatus,
        newStatus,
        hasProgressChanged,
        hasStatusChanged,
      });
      
      await tx.update(tasks)
        .set({
          progress: finalProgress,
          status: newStatus,
          updated_at: new Date(),
        })
        .where(eq(tasks.id, taskId));
    }
    
    // Send WebSocket update if needed
    if (sendWebSocketUpdate && (hasProgressChanged || hasStatusChanged)) {
      try {
        // We can't directly use the WebSocket server in a transaction
        // so we schedule it to be sent after the transaction commits
        setTimeout(() => {
          try {
            WebSocketServer.broadcast('task_updated', {
              taskId,
              progress: finalProgress,
              status: newStatus,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            logger.error(`Error broadcasting task update for task ${taskId}:`, error);
          }
        }, 0);
      } catch (error) {
        logger.error(`Error scheduling WebSocket notification for task ${taskId}:`, error);
      }
    }
    
    // Determine the result message
    let resultMessage = 'Progress calculated successfully';
    if (hasProgressChanged) {
      resultMessage = `Progress updated from ${currentProgress}% to ${finalProgress}%`;
    } else {
      resultMessage = 'Progress unchanged';
    }
    
    if (hasStatusChanged) {
      resultMessage += `, status changed from '${currentStatus}' to '${newStatus}'`;
    }
    
    // Return the result
    return {
      success: true,
      taskId,
      progress: finalProgress,
      status: newStatus,
      message: resultMessage,
    };
  } catch (error) {
    logger.error(`Error updating progress for task ${taskId}:`, error);
    return {
      success: false,
      taskId,
      progress: 0,
      status: 'error',
      message: `Error updating progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error,
    };
  }
}

/**
 * Recalculate and update progress for multiple tasks
 * 
 * @param tasks List of task IDs and types
 * @param options Options for the calculation and update
 * @returns The calculation results
 */
export async function batchUpdateProgress(
  tasks: { taskId: number; taskType: TaskType }[],
  options: ProgressOptions = {}
): Promise<ProgressResult[]> {
  const results: ProgressResult[] = [];
  
  logger.info(`Starting batch progress update for ${tasks.length} tasks`);
  
  // Process each task one by one
  for (const task of tasks) {
    const result = await calculateAndUpdateProgress(
      task.taskId,
      task.taskType,
      options
    );
    
    results.push(result);
  }
  
  return results;
}

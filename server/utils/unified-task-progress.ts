/**
 * Unified Task Progress Module
 * 
 * This module provides a standardized implementation for progress calculation and persistence
 * that works consistently across all form types (KYB, KY3P, Open Banking).
 * 
 * Core features:
 * 1. Single transaction boundary for all operations
 * 2. Consistent progress calculation logic
 * 3. Proper enum value handling
 * 4. Uniform status determination
 * 5. Reliable WebSocket broadcasting
 */

import { db } from '@db';
import { TaskStatus } from '../types';
import { tasks, kybResponses, ky3pResponses, openBankingResponses, KYBFieldStatus } from '@db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { logger } from './logger';
import * as WebSocketService from '../services/websocket';

interface ProgressOptions {
  forceUpdate?: boolean;
  debug?: boolean;
  metadata?: Record<string, any>;
  allowDecrease?: boolean;
  diagnosticId?: string;
  skipBroadcast?: boolean;
}

/**
 * Calculate task progress value directly from the database
 * with proper handling of all form types
 * 
 * @param taskId Task ID to calculate progress for
 * @param taskType Type of task ('company_kyb', 'ky3p', 'open_banking')
 * @param opts Options for the calculation
 * @returns Progress percentage (0-100)
 */
export async function calculateTaskProgress(
  taskId: number,
  taskType: string,
  opts: { tx?: any; debug?: boolean } = {}
): Promise<number> {
  const debug = opts.debug || false;
  const dbContext = opts.tx || db;
  const logPrefix = '[UnifiedProgressCalc]';
  
  try {
    let totalFields = 0;
    let completedFields = 0;
    const normalizedType = taskType.toLowerCase();
    
    // Determine which tables to use based on the task type
    if (normalizedType.includes('open_banking')) {
      // Handle Open Banking forms
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingResponses.fieldTable);
      totalFields = totalFieldsResult[0].count;

      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            eq(openBankingResponses.status, KYBFieldStatus.COMPLETE)
          )
        );
      completedFields = completedResultQuery[0].count;
    } 
    else if (normalizedType.includes('ky3p') || normalizedType.includes('security')) {
      // Handle KY3P forms
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses.fieldTable);
      totalFields = totalFieldsResult[0].count;

      // Count completed KY3P responses using the enum value directly
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.status, KYBFieldStatus.COMPLETE)
          )
        );
      completedFields = completedResultQuery[0].count;
    }
    else {
      // Default to KYB forms
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybResponses.fieldTable);
      totalFields = totalFieldsResult[0].count;

      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            eq(kybResponses.status, KYBFieldStatus.COMPLETE)
          )
        );
      completedFields = completedResultQuery[0].count;
    }

    // Calculate progress with consistent logic across all form types
    const progressPercentage = totalFields > 0
      ? Math.min(100, Math.round((completedFields / totalFields) * 100))
      : 0;
    
    if (debug) {
      logger.info(`${logPrefix} Progress calculation for task ${taskId} (${taskType}): ${completedFields}/${totalFields} = ${progressPercentage}%`);
    }
    
    return progressPercentage;
  }
  catch (error) {
    logger.error(`${logPrefix} Error calculating progress:`, {
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Determine appropriate task status based on progress value and metadata
 * 
 * @param progress Progress percentage (0-100)
 * @param currentStatus Current task status
 * @param metadata Task metadata containing submission information
 * @returns Appropriate TaskStatus enum value
 */
export function determineTaskStatus(
  progress: number,
  currentStatus: TaskStatus,
  metadata?: Record<string, any>
): TaskStatus {
  // Check for submission indicators in metadata
  const hasSubmissionDate = !!(metadata?.submissionDate || metadata?.submittedAt);
  const hasSubmittedFlag = metadata?.status === 'submitted' || metadata?.explicitlySubmitted === true;
  const isAlreadySubmitted = currentStatus === TaskStatus.SUBMITTED;
  
  // CRITICAL: Always respect submission state
  if (hasSubmissionDate || hasSubmittedFlag || isAlreadySubmitted) {
    return TaskStatus.SUBMITTED;
  }
  
  // Apply consistent status rules based on progress value
  if (progress === 0) {
    return TaskStatus.NOT_STARTED;
  }
  else if (progress > 0 && progress < 100) {
    return TaskStatus.IN_PROGRESS;
  }
  else if (progress === 100) {
    return TaskStatus.READY_FOR_SUBMISSION;
  }
  
  // Fallback - should never reach here with valid progress values
  return TaskStatus.NOT_STARTED;
}

/**
 * Broadcast a task progress update to all connected clients
 * 
 * @param taskId Task ID that was updated
 * @param progress Current progress value
 * @param status Current task status
 * @param metadata Additional metadata to include
 */
export function broadcastProgressUpdate(
  taskId: number,
  progress: number,
  status: TaskStatus,
  metadata: Record<string, any> = {}
): void {
  try {
    // Create payload with standard format
    const payload = {
      id: taskId,
      progress,
      status,
      metadata: {
        ...metadata,
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    // Use consistent 'task_update' event type
    WebSocketService.broadcast('task_update', {
      taskId,
      data: payload,
      payload: payload,
      timestamp: new Date().toISOString()
    });
    
    logger.debug(`[UnifiedProgress] Broadcasted progress update for task ${taskId}: ${progress}% (${status})`);
  }
  catch (error) {
    logger.error(`[UnifiedProgress] Error broadcasting update:`, {
      taskId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update task progress with transaction boundary and broadcast update
 * 
 * This is the main unified function to be used by all form types
 * to ensure consistent progress tracking across the application.
 * 
 * @param taskId Task ID to update
 * @param taskType Type of task ('company_kyb', 'ky3p', 'open_banking')
 * @param options Options for the update operation
 * @returns Object with success/error information and updated progress
 */
export async function updateTaskProgress(
  taskId: number,
  taskType: string,
  options: ProgressOptions = {}
): Promise<{ success: boolean; message: string; progress?: number; status?: string }> {
  const {
    forceUpdate = false,
    debug = true,
    metadata = {},
    skipBroadcast = false,
    diagnosticId = `prog-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  } = options;
  
  try {
    logger.info(`[UnifiedProgress] Starting progress update for task ${taskId} (${taskType})`, {
      taskId,
      taskType,
      diagnosticId,
      metadata: Object.keys(metadata)
    });
    
    // Use transaction to ensure atomicity of all operations
    const result = await db.transaction(async (tx) => {
      // Step 1: Get current task data
      const [task] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // Step 2: Calculate current progress
      const calculatedProgress = await calculateTaskProgress(taskId, taskType, { tx, debug });
      const currentProgress = Number(task.progress);
      
      // Step 3: Determine if update is needed
      const progressChanged = currentProgress !== calculatedProgress;
      const shouldUpdate = forceUpdate || progressChanged;
      
      if (!shouldUpdate) {
        logger.info(`[UnifiedProgress] No progress update needed for task ${taskId}: ${currentProgress}% (unchanged)`);
        return {
          task,
          progress: currentProgress,
          updated: false
        };
      }
      
      // Step 4: Determine appropriate status
      const newStatus = determineTaskStatus(
        calculatedProgress,
        task.status as TaskStatus,
        { ...task.metadata, ...metadata }
      );
      
      // Step 5: Update the task record
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          progress: calculatedProgress,
          status: newStatus,
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            ...metadata,
            lastProgressUpdate: new Date().toISOString(),
            progressHistory: [
              ...(task.metadata?.progressHistory || []),
              { value: calculatedProgress, timestamp: new Date().toISOString() }
            ].slice(-10) // Keep last 10 updates
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      // Validate that the update was successful
      if (!updatedTask) {
        throw new Error(`Failed to update task ${taskId}`);
      }
      
      logger.info(`[UnifiedProgress] Progress updated for task ${taskId}: ${currentProgress}% → ${calculatedProgress}%`);
      
      return {
        task: updatedTask,
        progress: calculatedProgress,
        updated: true
      };
    });
    
    // Broadcast the update outside of the transaction
    if (result.updated && !skipBroadcast) {
      // Use setTimeout to ensure broadcasting happens after transaction is committed
      setTimeout(() => {
        broadcastProgressUpdate(
          taskId,
          Number(result.progress),
          result.task.status as TaskStatus,
          result.task.metadata || {}
        );
      }, 0);
    }
    
    return {
      success: true,
      message: result.updated
        ? `Task ${taskId} progress updated to ${result.progress}%`
        : `No update needed for task ${taskId} (progress: ${result.progress}%)`,
      progress: result.progress,
      status: result.task.status
    };
  }
  catch (error) {
    logger.error(`[UnifiedProgress] Error updating task ${taskId} progress:`, {
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      diagnosticId
    });
    
    return {
      success: false,
      message: `Error updating task progress: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

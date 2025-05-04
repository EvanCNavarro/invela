/**
 * Unified Progress Calculator
 * 
 * This module provides a single source of truth for calculating task progress
 * across all task types, ensuring consistency throughout the application.
 * 
 * It follows DRY and KISS principles, making progress calculation simple and reliable.
 */

import { db } from '@db';
import { 
  tasks, 
  kybResponses, 
  kybFields, 
  ky3pResponses, 
  ky3pFields, 
  openBankingResponses, 
  openBankingFields,
  KYBFieldStatus
} from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from './logger';

/**
 * Single source of truth for task progress calculation
 * 
 * This function provides a consistent way to calculate progress for all task types,
 * supporting both field_id and field_key approaches for backward compatibility.
 * 
 * @param taskId Task ID to calculate progress for
 * @param taskType Type of task (company_kyb, ky3p, open_banking, etc.)
 * @param options Optional configuration (transaction, debug mode, etc.)
 * @returns Promise<number> Progress percentage (0-100)
 */
export async function calculateTaskProgress(
  taskId: number,
  taskType: string,
  options: { tx?: any; debug?: boolean; preserveExisting?: boolean } = {}
): Promise<number> {
  const logPrefix = '[UnifiedProgressCalc]';
  const debug = options.debug || false;
  const preserveExisting = options.preserveExisting || false;
  let totalFields = 0;
  let completedFields = 0;
  
  // Use the passed transaction context or the global db instance
  const dbContext = options.tx || db;

  try {
    // If preserveExisting is true, first check if the task already has progress
    if (preserveExisting) {
      const existingTask = await dbContext
        .select({ progress: tasks.progress })
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (existingTask.length > 0 && existingTask[0].progress > 0) {
        const existingProgress = existingTask[0].progress;
        
        logger.info(`${logPrefix} Preserving existing progress for task ${taskId} (${taskType}): ${existingProgress}%`, {
          taskId,
          taskType,
          existingProgress,
          operation: 'preserve-existing'
        });
        
        return existingProgress;
      }
    }
    
    // Calculate progress based on task type
    if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
      // Count total Open Banking fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed Open Banking responses for this task
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            sql`${openBankingResponses.status} = ${KYBFieldStatus.COMPLETE}`
          )
        );
      completedFields = completedResultQuery[0].count;
    } 
    else if (taskType === 'ky3p' || taskType === 'security' || taskType === 'sp_ky3p_assessment') {
      // IMPORTANT CHANGE: For KY3P, only count fields that have responses for this specific task
      // This aligns KY3P with other task types and prevents the "divide by total fields" issue
      
      // First, get all fields with responses for this task
      const fieldsWithResponses = await dbContext
        .select({ 
          field_id: ky3pResponses.field_id,
          field_key: ky3pResponses.field_key 
        })
        .from(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      // Total fields is the number of unique fields with responses
      totalFields = fieldsWithResponses.length;
      
      // Count completed responses for this task
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            sql`${ky3pResponses.status} = ${KYBFieldStatus.COMPLETE}`
          )
        );
      completedFields = completedResultQuery[0].count;

      // Enhanced logging for KY3P progress calculation
      if (debug) {
        logger.debug(`${logPrefix} KY3P progress calculation details:`, {
          taskId,
          totalFields,
          completedFields,
          fieldsWithResponses: fieldsWithResponses.length,
          calculationMethod: 'fields-with-responses'
        });
      }
    }
    else if (taskType === 'company_kyb' || taskType === 'kyb') {
      // Count total KYB fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed KYB responses for this task
      const completedResultQuery = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            sql`${kybResponses.status} = ${KYBFieldStatus.COMPLETE}`
          )
        );
      completedFields = completedResultQuery[0].count;
    }
    else {
      // Unknown task type
      logger.warn(`${logPrefix} Unknown task type for progress calculation: ${taskType}`, {
        taskId,
        taskType
      });
      return 0;
    }
    
    // Calculate progress percentage using Math.round for consistency
    const progress = totalFields > 0 
      ? Math.min(100, Math.round((completedFields / totalFields) * 100))
      : 0;
    
    if (debug || totalFields > 0) {
      logger.info(`${logPrefix} Calculated progress for task ${taskId} (${taskType}): ${completedFields}/${totalFields} = ${progress}%`, {
        taskId,
        taskType,
        totalFields,
        completedFields,
        progress
      });
    }
    
    return progress;
  } catch (error) {
    logger.error(`${logPrefix} Error calculating progress for task ${taskId} (${taskType}):`, {
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return 0 for safety in case of errors
    return 0;
  }
}

/**
 * Update task progress and broadcast the update
 * 
 * This function updates a task's progress in the database and broadcasts the change.
 * It uses the unified progress calculation to ensure consistency.
 * 
 * @param taskId Task ID to update
 * @param taskType Type of task
 * @param options Optional configuration
 * @returns Promise<number> The updated progress value
 */
export async function updateAndBroadcastProgress(
  taskId: number,
  taskType: string,
  options: { 
    tx?: any; 
    debug?: boolean; 
    preserveExisting?: boolean;
    forceProgress?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<number> {
  const logPrefix = '[ProgressUpdate]';
  const debug = options.debug || false;
  
  try {
    // Use the provided transaction or start a new one
    const dbContext = options.tx || db;
    
    // Use forced progress value if provided, otherwise calculate
    const progress = options.forceProgress !== undefined
      ? options.forceProgress
      : await calculateTaskProgress(taskId, taskType, {
          tx: dbContext,
          debug,
          preserveExisting: options.preserveExisting
        });
    
    // Get the current task to determine the appropriate status
    const currentTask = await dbContext
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (currentTask.length === 0) {
      logger.warn(`${logPrefix} Task not found for progress update: ${taskId}`, {
        taskId,
        taskType
      });
      return 0;
    }
    
    // Import determineStatusFromProgress to ensure consistent status determination
    const { determineStatusFromProgress } = await import('./progress');
    
    // Determine the correct status based on progress
    const currentStatus = currentTask[0].status as any;
    const newStatus = determineStatusFromProgress(
      progress,
      currentStatus,
      [], // No form responses needed for basic status determination
      currentTask[0].metadata || {}
    );
    
    // Update task with new progress and status
    await dbContext
      .update(tasks)
      .set({
        progress,
        status: newStatus,
        updated_at: new Date(),
        // Update metadata if provided
        ...(options.metadata ? {
          metadata: {
            ...currentTask[0].metadata,
            ...options.metadata,
            lastProgressUpdate: new Date().toISOString(),
            progressHistoryEntry: {
              value: progress, 
              timestamp: new Date().toISOString()
            }
          }
        } : {})
      })
      .where(eq(tasks.id, taskId));
    
    logger.info(`${logPrefix} Updated task ${taskId} progress to ${progress}% and status to ${newStatus}`, {
      taskId,
      taskType,
      progress,
      status: newStatus,
      previousStatus: currentStatus
    });
    
    // Broadcast the update via WebSocket
    try {
      const { broadcastTaskUpdate } = await import('../services/websocket');
      broadcastTaskUpdate({
        id: taskId,
        status: newStatus,
        progress,
        metadata: {
          ...(options.metadata || {}),
          lastProgressUpdate: new Date().toISOString()
        }
      });
      
      logger.info(`${logPrefix} Broadcasted progress update for task ${taskId}`, {
        taskId,
        progress,
        status: newStatus
      });
    } catch (broadcastError) {
      logger.error(`${logPrefix} Error broadcasting progress update:`, {
        taskId,
        error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError)
      });
    }
    
    return progress;
  } catch (error) {
    logger.error(`${logPrefix} Error updating and broadcasting progress:`, {
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return 0 for safety in case of errors
    return 0;
  }
}

// Export the unified progress calculator functions
export default {
  calculateTaskProgress,
  updateAndBroadcastProgress
};

/**
 * Universal Progress Calculation Module
 * 
 * This module provides a unified approach to calculating task progress
 * across different form types (KYB, KY3P, Open Banking) without special
 * case handling or inconsistent type handling.
 * 
 * Core principles:
 * 1. Use a single, consistent formula for all form types
 * 2. Always use number type for progress values
 * 3. Eliminate special case handling and retries
 * 4. Use atomic transactions for reliable updates
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '@db';
import { 
  tasks, 
  kybFields, 
  kybResponses, 
  ky3pFields, 
  ky3pResponses,
  openBankingFields,
  openBankingResponses,
  TaskStatus
} from '@db/schema';
import { logger } from './logger';
import * as WebSocketService from '../services/websocket';

/**
 * Transaction context - allows calculations to be part of a larger transaction
 */
type TransactionContext = {
  tx?: any;
  debug?: boolean;
};

/**
 * Calculate task progress for any form type using a unified approach
 * 
 * @param taskId The task ID
 * @param formType The form type: 'company_kyb', 'ky3p', or 'open_banking'
 * @param context Optional transaction context for atomic operations
 * @returns The calculated progress percentage (0-100)
 */
export async function calculateTaskProgress(
  taskId: number,
  formType: string,
  context: TransactionContext = {}
): Promise<number> {
  const { tx, debug = false } = context;
  const dbContext = tx || db;
  
  if (debug) {
    logger.info(`[Universal Progress] Calculating progress for task ${taskId} (${formType})`);
  }
  
  try {
    let totalFields = 0;
    let completedFields = 0;
    
    // Choose the right tables based on form type
    if (formType === 'company_kyb') {
      // Get KYB field counts
      const kybResult = await dbContext
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN ${kybResponses.status} = 'COMPLETE' THEN 1 ELSE 0 END)`
        })
        .from(kybResponses)
        .where(eq(kybResponses.task_id, taskId));
      
      if (kybResult && kybResult.length > 0) {
        totalFields = Number(kybResult[0].total) || 0;
        completedFields = Number(kybResult[0].completed) || 0;
      }
    } else if (formType === 'ky3p') {
      // Get KY3P field counts
      const ky3pResult = await dbContext
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN ${ky3pResponses.status} = 'COMPLETE' THEN 1 ELSE 0 END)`
        })
        .from(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      if (ky3pResult && ky3pResult.length > 0) {
        totalFields = Number(ky3pResult[0].total) || 0;
        completedFields = Number(ky3pResult[0].completed) || 0;
      }
    } else if (formType === 'open_banking') {
      // Get Open Banking field counts
      const obResult = await dbContext
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN ${openBankingResponses.status} = 'COMPLETE' THEN 1 ELSE 0 END)`
        })
        .from(openBankingResponses)
        .where(eq(openBankingResponses.task_id, taskId));
      
      if (obResult && obResult.length > 0) {
        totalFields = Number(obResult[0].total) || 0;
        completedFields = Number(obResult[0].completed) || 0;
      }
    }
    
    // If no fields found, try to get the count of available fields for this form type
    if (totalFields === 0) {
      if (formType === 'company_kyb') {
        const [count] = await dbContext
          .select({ count: sql<number>`COUNT(*)` })
          .from(kybFields);
        totalFields = Number(count?.count) || 0;
      } else if (formType === 'ky3p') {
        const [count] = await dbContext
          .select({ count: sql<number>`COUNT(*)` })
          .from(ky3pFields);
        totalFields = Number(count?.count) || 0;
      } else if (formType === 'open_banking') {
        const [count] = await dbContext
          .select({ count: sql<number>`COUNT(*)` })
          .from(openBankingFields);
        totalFields = Number(count?.count) || 0;
      }
    }
    
    // Apply the universal progress calculation formula
    const progressPercentage = totalFields > 0 
      ? Math.min(100, Math.round((completedFields / totalFields) * 100))
      : 0;
    
    if (debug) {
      logger.info(`[Task Progress] Calculated progress for task ${taskId} (${formType}): ${completedFields}/${totalFields} = ${progressPercentage}%`);
    }
    
    return progressPercentage;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Universal Progress] Error calculating progress for task ${taskId}:`, { error: errorMessage });
    // If part of a transaction, we should throw to ensure rollback
    if (tx) throw error;
    // Otherwise return 0 progress as a fallback
    return 0;
  }
}

/**
 * Update task progress in the database
 * 
 * @param taskId The task ID
 * @param progress The new progress value (0-100)
 * @param status The new task status
 * @param context Optional transaction context
 * @returns The updated task object
 */
export async function updateTaskProgress(
  taskId: number,
  progress: number,
  status: TaskStatus,
  context: TransactionContext = {}
): Promise<any> {
  const { tx, debug = false } = context;
  const dbContext = tx || db;
  
  try {
    if (debug) {
      logger.info(`[Universal Progress] Updating task ${taskId} progress to ${progress}% with status ${status}`);
    }
    
    // Update the task with the new progress and status
    const [updatedTask] = await dbContext
      .update(tasks)
      .set({
        progress,
        status,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
      
    return updatedTask;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Universal Progress] Error updating progress for task ${taskId}:`, { error: errorMessage });
    // If part of a transaction, we should throw to ensure rollback
    if (tx) throw error;
    // Otherwise return null
    return null;
  }
}

/**
 * Broadcast a progress update via WebSocket
 * 
 * @param taskId The task ID
 * @param progress The new progress value (0-100)
 * @param status The new task status
 * @param metadata Optional task metadata
 */
export function broadcastProgressUpdate(
  taskId: number,
  progress: number,
  status: TaskStatus,
  metadata: any = {}
): void {
  try {
    // Broadcast the update via WebSocket
    WebSocketService.broadcastEvent('task_updated', {
      taskId,
      progress,
      status,
      metadata,
      timestamp: new Date().toISOString(),
      source: 'universal_progress'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Universal Progress] Error broadcasting update for task ${taskId}:`, { error: errorMessage });
  }
}

/**
 * Determine the appropriate task status based on progress
 * 
 * @param progress The task progress (0-100)
 * @param currentStatus The current task status
 * @param metadata Optional task metadata
 * @returns The determined task status
 */
export function determineTaskStatus(
  progress: number,
  currentStatus: TaskStatus,
  metadata: any = {}
): TaskStatus {
  // If already submitted or approved, don't change the status
  if (
    currentStatus === 'submitted' || 
    currentStatus === 'approved'
  ) {
    return currentStatus;
  }
  
  // Special case for rejected status
  if (currentStatus === 'rejected' as TaskStatus) {
    return currentStatus;
  }
  
  // If 100% progress, set to ready_for_submission
  if (progress === 100) {
    return 'ready_for_submission';
  }
  
  // If any progress, set to in_progress
  if (progress > 0) {
    return 'in_progress';
  }
  
  // Otherwise keep as not_started
  return 'not_started';
}

/**
 * Synchronous Task Dependencies Service
 * 
 * This service provides immediate, synchronous unlocking of dependent tasks
 * to eliminate the 30-second wait time during form submission.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { broadcastTaskUpdate } from './websocket';
import { Logger } from '../utils/logger';

const logger = new Logger('SyncTaskDependencies');

/**
 * Immediately unlock specific dependent tasks for a company based on the source task type
 * 
 * This function enforces the following dependency rules:
 * - KYB submission: Unlocks KY3P and Open Banking tasks
 * - KY3P submission: Doesn't unlock any tasks by itself
 * - Open Banking submission: Doesn't unlock any tasks by itself
 * 
 * @param companyId The company ID
 * @param sourceTaskId The ID of the submitted task (optional)
 * @param sourceTaskType The type of the submitted task (e.g., 'kyb', 'ky3p')
 * @returns Promise<number> The number of tasks unlocked
 */
export async function unlockDependentTasksImmediately(
  companyId: number,
  sourceTaskId?: number,
  sourceTaskType?: string
): Promise<number> {
  logger.info('Immediately unlocking dependent tasks', { 
    companyId, 
    sourceTaskId,
    sourceTaskType
  });
  
  try {
    let tasksToUnlock = [];
    
    // Apply the specific dependency rules based on the source task type
    if (sourceTaskType === 'kyb') {
      // KYB submission unlocks KY3P and Open Banking tasks
      tasksToUnlock = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.company_id, companyId),
            or(
              eq(tasks.status, 'locked'),
              isNull(tasks.status)
            ),
            inArray(tasks.task_type, [
              'ky3p', 'sp_ky3p_assessment', 'security', 'security_assessment',
              'open_banking', 'open_banking_survey', 'company_card'
            ])
          )
        );
      
      logger.info('Found KY3P and Open Banking tasks to unlock after KYB submission', {
        companyId,
        count: tasksToUnlock.length,
        taskIds: tasksToUnlock.map(t => t.id),
        taskTypes: tasksToUnlock.map(t => t.task_type)
      });
    } 
    else if (sourceTaskType === 'open_banking' || sourceTaskType === 'open_banking_survey' || sourceTaskType === 'company_card') {
      // Open Banking submission doesn't unlock any tasks, but may enable dashboard and insights tabs
      // This is handled at the UI level, not through database task statuses
      logger.info('Open Banking submission does not unlock any tasks, but enables dashboard and insights tabs', {
        companyId,
        sourceTaskId
      });
      return 0;
    }
    else if (sourceTaskType?.includes('ky3p') || sourceTaskType === 'security' || sourceTaskType === 'security_assessment') {
      // KY3P submission doesn't unlock any tasks
      logger.info('KY3P submission does not unlock any tasks', {
        companyId,
        sourceTaskId
      });
      return 0;
    }
    // Default case - no specific rules match
    else if (!sourceTaskType) {
      // If no source task type is provided, unlock all tasks (emergency/admin functionality)
      tasksToUnlock = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.company_id, companyId),
            or(
              eq(tasks.status, 'locked'),
              isNull(tasks.status)
            )
          )
        );
      
      logger.info('Emergency unlock - found all locked tasks to unlock', {
        companyId,
        count: tasksToUnlock.length,
        taskIds: tasksToUnlock.map(t => t.id),
        taskTypes: tasksToUnlock.map(t => t.task_type)
      });
    }
    
    if (tasksToUnlock.length === 0) {
      logger.info('No locked dependent tasks found to unlock', { companyId });
      return 0;
    }
    
    // Unlock each task and notify clients via WebSocket
    let unlockedCount = 0;
    for (const task of tasksToUnlock) {
      // Skip source task if provided
      if (sourceTaskId && task.id === sourceTaskId) {
        logger.info('Skipping source task', { taskId: task.id });
        continue;
      }
      
      // Set task status to not_started and update metadata
      await db.update(tasks)
        .set({
          status: 'not_started',
          metadata: sql`jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{locked}', 'false'
              ),
              '{prerequisite_completed}', 'true'
            ),
            '{prerequisite_completed_at}', to_jsonb(now())
          )`,
          updated_at: new Date()
        })
        .where(eq(tasks.id, task.id));
      
      logger.info('Successfully unlocked task', { 
        taskId: task.id, 
        taskType: task.task_type,
        unlockedBy: sourceTaskType || 'direct_unlock'
      });
      
      // Broadcast update via WebSocket
      await broadcastTaskUpdate({
        id: task.id,
        status: 'not_started',
        metadata: {
          locked: false,
          prerequisite_completed: true,
          prerequisite_completed_at: new Date().toISOString(),
          unlockedBy: sourceTaskType || 'direct_unlock'
        }
      });
      
      unlockedCount++;
    }
    
    logger.info('Successfully unlocked dependent tasks immediately', { 
      companyId, 
      unlockedCount,
      sourceTaskType
    });
    
    return unlockedCount;
  } catch (error) {
    logger.error('Error unlocking dependent tasks immediately', { 
      companyId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Don't block the form submission if unlocking fails
    return 0;
  }
}

/**
 * Unlock file vault access for a company
 * 
 * @param companyId The company ID 
 * @returns Promise<boolean> Whether the operation was successful
 */
export async function unlockFileVaultAccess(companyId: number): Promise<boolean> {
  logger.info('Unlocking File Vault access for company', { companyId });
  
  try {
    // Get any completed KYB task for this company
    const completedKybTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          eq(tasks.task_type, 'kyb'),
          eq(tasks.status, 'submitted')
        )
      )
      .limit(1);
    
    // If no completed KYB task, can't unlock File Vault
    if (completedKybTasks.length === 0) {
      logger.info('No completed KYB tasks found, cannot unlock File Vault', { companyId });
      return false;
    }
    
    // Update company record to unlock File Vault
    // This will be handled by the existing table update mechanism
    logger.info('Company has completed KYB, File Vault access granted', { 
      companyId,
      kybTaskId: completedKybTasks[0].id 
    });
    
    // The File Vault tab becomes available once a KYB task is submitted
    return true;
  } catch (error) {
    logger.error('Error unlocking File Vault access', { 
      companyId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

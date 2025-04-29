/**
 * Synchronous Task Dependencies Service
 * 
 * This service provides immediate, synchronous unlocking of dependent tasks
 * to eliminate the 30-second wait time during form submission.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { broadcastTaskUpdate } from './websocket';
import { Logger } from '../utils/logger';

const logger = new Logger('SyncTaskDependencies');

/**
 * Immediately unlock all tasks for a company that should be unlocked
 * after a specific task is submitted.
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
    // Find all tasks for this company that are currently locked or have no status
    // and should be unlocked based on the source task type
    const tasksToUnlock = await db.select()
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
    
    if (tasksToUnlock.length === 0) {
      logger.info('No locked dependent tasks found to unlock', { companyId });
      return 0;
    }
    
    logger.info('Found tasks to unlock immediately', {
      companyId,
      count: tasksToUnlock.length,
      taskIds: tasksToUnlock.map(t => t.id),
      taskTypes: tasksToUnlock.map(t => t.task_type)
    });
    
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
    
    logger.info('Successfully unlocked all dependent tasks immediately', { 
      companyId, 
      unlockedCount 
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

/**
 * Synchronous Task Dependencies Service
 * 
 * This service handles synchronous task dependency unlocking
 * to ensure that once a task is completed, dependent tasks
 * are immediately unlocked without the previous 30-second delay.
 * 
 * It also provides utility functions for unlocking other company features
 * like File Vault access.
 */
import { db } from '@db';
import { tasks as tasksTable, companies } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { Logger } from './logger';
import { broadcastMessage } from './websocket';

const logger = new Logger('SynchronousTaskDeps');

/**
 * Synchronously unlock dependent tasks for a company
 * after a task is completed
 * 
 * @param companyId The company ID
 * @param completedTaskId The ID of the task that was just completed
 * @returns Promise resolving to an array of unlocked task IDs
 */
export async function synchronizeTasks(
  companyId: number,
  completedTaskId: number
): Promise<number[]> {
  try {
    // First, find the completed task to determine its type
    const [completedTask] = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.id, completedTaskId),
          eq(tasksTable.company_id, companyId)
        )
      )
      .limit(1);

    if (!completedTask) {
      logger.warn(`Task ${completedTaskId} not found for company ${companyId}`);
      return [];
    }

    logger.info(`Task ${completedTaskId} (${completedTask.task_type}) completed for company ${companyId}`);

    // Find dependent tasks that could be unlocked
    // For simplicity, here we're unlocking based on task order/sequence
    // In a real implementation, this would have more complex dependency rules
    const dependentTasks = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.company_id, companyId),
          sql`${tasksTable.status} = 'locked'`
        )
      );

    if (dependentTasks.length === 0) {
      logger.info(`No locked tasks found for company ${companyId}`);
      return [];
    }

    // Determine which tasks should be unlocked based on the type of task that was completed
    const tasksToUnlock = determineDependentTasks(completedTask.task_type, dependentTasks);
    
    if (tasksToUnlock.length === 0) {
      logger.info(`No dependent tasks found for task type: ${completedTask.task_type}`);
      return [];
    }

    // Unlock the dependent tasks
    const unlockedTaskIds: number[] = [];
    
    for (const taskId of tasksToUnlock) {
      await db
        .update(tasksTable)
        .set({ status: 'not_started' })
        .where(eq(tasksTable.id, taskId));
      
      unlockedTaskIds.push(taskId);
      
      logger.info(`Unlocked dependent task: ${taskId}`);
    }

    return unlockedTaskIds;
  } catch (error) {
    logger.error(`Error synchronizing tasks for company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Helper function to determine which tasks should be unlocked
 * based on the type of task that was completed
 * 
 * @param completedTaskType The type of the completed task
 * @param lockedTasks Array of locked tasks
 * @returns Array of task IDs that should be unlocked
 */
function determineDependentTasks(
  completedTaskType: string,
  lockedTasks: any[]
): number[] {
  // For this implementation, we're using a simple ruleset
  // In a real system, this would be more sophisticated
  const taskIdsToUnlock: number[] = [];

  // Example rules:
  // 1. When a 'kyb' task is completed, unlock 'ky3p' and 'security' tasks
  // 2. When a 'ky3p' task is completed, unlock 'open_banking' tasks
  // 3. When an 'open_banking' task is completed, there's nothing to unlock

  switch(completedTaskType) {
    case 'kyb':
      // Find and unlock KY3P and security tasks
      lockedTasks.forEach(task => {
        if (task.task_type === 'ky3p' || task.task_type === 'security') {
          taskIdsToUnlock.push(task.id);
        }
      });
      break;
      
    case 'ky3p':
    case 'security':
      // Find and unlock Open Banking tasks
      lockedTasks.forEach(task => {
        if (task.task_type === 'open_banking') {
          taskIdsToUnlock.push(task.id);
        }
      });
      break;
      
    default:
      // No tasks to unlock for other task types
      break;
  }

  return taskIdsToUnlock;
}

/**
 * Unlock File Vault access for a company
 * 
 * This function updates the company record to enable file vault access
 * and broadcasts a WebSocket message to update the UI
 * 
 * @param companyId The company ID
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function unlockFileVaultAccess(companyId: number): Promise<boolean> {
  try {
    logger.info(`Unlocking file vault access for company ${companyId}`);
    
    // Get current company data
    const companyData = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (companyData.length === 0) {
      logger.warn(`Company ${companyId} not found when unlocking file vault`);
      return false;
    }
    
    const company = companyData[0];
    
    // Check if file vault tab exists in available_tabs
    const availableTabs = company.available_tabs || [];
    const fileVaultAlreadyUnlocked = availableTabs.includes('file_vault');
    
    if (fileVaultAlreadyUnlocked) {
      logger.info(`File vault already unlocked for company ${companyId}`);
      return true;
    }
    
    // Add file_vault to available_tabs
    const updatedTabs = [...availableTabs, 'file_vault'];
    
    // Update company record
    await db
      .update(companies)
      .set({ 
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    logger.info(`File vault access unlocked for company ${companyId}`);
    
    // Broadcast WebSocket message to update UI
    broadcastMessage('company_tabs_updated', {
      companyId,
      availableTabs: updatedTabs,
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    logger.error(`Error unlocking file vault access for company ${companyId}:`, error);
    return false;
  }
}
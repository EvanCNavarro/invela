/**
 * Synchronous Task Dependencies Service
 * 
 * This service provides immediate task unlocking after form submissions,
 * ensuring users can proceed to the next step without delay.
 */

import { db } from "@db";
import { tasks } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Logger } from "./logger";
import { withRetry } from "../utils/db-retry";
import { broadcastTaskUpdate } from "../services/websocket";

const logger = new Logger("TaskDependencies");

/**
 * Unlock dependent tasks based on completed task type
 * 
 * @param companyId The company ID
 * @param completedTaskType The type of task that was completed
 * @returns Array of IDs of tasks that were unlocked
 */
/**
 * Synchronize tasks based on dependencies
 * This is an alias for unlockDependentTasks for backward compatibility
 * 
 * @param companyId Company ID
 * @param triggeredByTaskId The task ID that triggered the synchronization (optional)
 * @returns Array of unlocked task IDs
 */
export async function synchronizeTasks(
  companyId: number, 
  triggeredByTaskId?: number
): Promise<number[]> {
  logger.info(`[TaskDependencies] Synchronizing tasks for company ${companyId}`, {
    triggeredByTaskId
  });
  
  // Get the task type of the triggering task if provided
  let completedTaskType = "unknown";
  if (triggeredByTaskId) {
    try {
      const [triggeringTask] = await db
        .select({ task_type: tasks.task_type })
        .from(tasks)
        .where(eq(tasks.id, triggeredByTaskId))
        .limit(1);
        
      if (triggeringTask) {
        completedTaskType = triggeringTask.task_type;
      }
    } catch (error) {
      logger.error(`[TaskDependencies] Error getting triggering task type:`, error);
    }
  }
  
  // Call the main unlockDependentTasks function
  return unlockDependentTasks(companyId, completedTaskType);
}

export async function unlockDependentTasks(
  companyId: number,
  completedTaskType: string
): Promise<number[]> {
  logger.info(`[TaskDependencies] Unlocking dependent tasks for ${completedTaskType}`, { companyId });
  
  try {
    const now = new Date().toISOString();
    let tasksToUnlock: number[] = [];
    
    // Determine which tasks to unlock based on the completed task type
    switch (completedTaskType) {
      case "kyb":
        // Unlock KY3P and Open Banking after KYB completion
        tasksToUnlock = await findLockedTasksByType(companyId, ["ky3p", "open_banking"]);
        break;
        
      case "ky3p":
        // Specific dependencies for KY3P
        if (await checkKybCompleted(companyId)) {
          // Only unlock Open Banking if KYB is also completed
          tasksToUnlock = await findLockedTasksByType(companyId, ["open_banking"]);
        }
        break;
        
      case "open_banking":
        // Unlock dashboard access and File Vault
        await unlockDashboardAndInsightsTabs(companyId);
        await unlockFileVaultAccess(companyId);
        break;
    }
    
    // No tasks to unlock
    if (tasksToUnlock.length === 0) {
      logger.info(`[TaskDependencies] No dependent tasks to unlock for ${completedTaskType}`, { companyId });
      return [];
    }
    
    // Update task metadata to unlock tasks
    const unlockedTasks = await withRetry(
      async () => {
        const updates = [];
        
        for (const taskId of tasksToUnlock) {
          // Update each task individually
          const [updated] = await db
            .update(tasks)
            .set({
              metadata: {
                locked: false,
                prerequisite_completed: true,
                prerequisite_completed_at: now
              }
            })
            .where(eq(tasks.id, taskId))
            .returning({ id: tasks.id });
            
          if (updated) {
            updates.push(updated.id);
            
            // Broadcast WebSocket update
            broadcastTaskUpdate({
              id: taskId,
              status: "not_started",
              metadata: {
                locked: false,
                prerequisite_completed: true,
                prerequisite_completed_at: now
              }
            });
            
            logger.info(`[TaskDependencies] Unlocked task ${taskId}`);
          }
        }
        
        return updates;
      },
      {
        maxRetries: 3,
        operation: `Unlock dependent tasks for company ${companyId}`
      }
    );
    
    logger.info(`[TaskDependencies] Successfully unlocked ${unlockedTasks.length} tasks`, { 
      companyId, 
      taskIds: unlockedTasks 
    });
    
    return unlockedTasks;
  } catch (error) {
    logger.error(`[TaskDependencies] Failed to unlock dependent tasks:`, error);
    return [];
  }
}

/**
 * Find locked tasks by type
 * 
 * @param companyId Company ID
 * @param taskTypes Array of task types to find
 * @returns Array of task IDs
 */
async function findLockedTasksByType(
  companyId: number,
  taskTypes: string[]
): Promise<number[]> {
  try {
    const lockedTasks = await withRetry(
      async () => {
        return db
          .select({ id: tasks.id, type: tasks.task_type })
          .from(tasks)
          .where(
            and(
              eq(tasks.company_id, companyId),
              // Only include tasks where metadata.locked is true or undefined
              sql`tasks.metadata->>'locked' = 'true' OR tasks.metadata->>'locked' IS NULL`
            )
          );
      },
      {
        maxRetries: 2,
        operation: "Find locked tasks"
      }
    );
    
    // Filter tasks by requested types
    return lockedTasks
      .filter(task => taskTypes.includes(task.type))
      .map(task => task.id);
      
  } catch (error) {
    logger.error(`[TaskDependencies] Error finding locked tasks:`, error);
    return [];
  }
}

/**
 * Check if KYB is completed for a company
 * 
 * @param companyId Company ID
 * @returns Boolean indicating if KYB is completed
 */
async function checkKybCompleted(companyId: number): Promise<boolean> {
  try {
    const kybTasks = await withRetry(
      async () => {
        return db
          .select({ status: tasks.status })
          .from(tasks)
          .where(
            and(
              eq(tasks.company_id, companyId),
              eq(tasks.task_type, "kyb")
            )
          );
      },
      {
        maxRetries: 2,
        operation: "Check KYB completion"
      }
    );
    
    // Check if any KYB task is completed or submitted
    return kybTasks.some(task => 
      task.status === "completed" || task.status === "submitted"
    );
    
  } catch (error) {
    logger.error(`[TaskDependencies] Error checking KYB completion:`, error);
    return false;
  }
}

/**
 * Unlock File Vault access for the company
 * 
 * @param companyId Company ID
 */
export async function unlockFileVaultAccess(companyId: number): Promise<boolean> {
  try {
    logger.info(`[TaskDependencies] Unlocking File Vault access for company:`, { companyId });
    
    // Update company settings to enable file_vault access
    await withRetry(
      async () => {
        return db.execute(sql`
          UPDATE companies
          SET available_tabs = jsonb_set(
            COALESCE(available_tabs, '[]'::jsonb),
            '{-1}',
            '"file_vault"',
            true
          )
          WHERE id = ${companyId}
        `);
      },
      {
        maxRetries: 2,
        operation: "Unlock File Vault access"
      }
    );
    
    // Broadcast company update to refresh UI
    broadcastCompanyUpdate(companyId);
    
    // Return success
    return true;
  } catch (error) {
    logger.error(`[TaskDependencies] Error unlocking File Vault access:`, error);
    return false;
  }
}

/**
 * Unlock Dashboard and Insights tabs for the company
 * 
 * @param companyId Company ID
 */
export async function unlockDashboardAndInsightsTabs(companyId: number): Promise<boolean> {
  try {
    logger.info(`[TaskDependencies] Unlocking Dashboard and Insights tabs for company:`, { companyId });
    
    // Update company settings to enable dashboard and insights access
    await withRetry(
      async () => {
        // First add dashboard tab
        await db.execute(sql`
          UPDATE companies
          SET available_tabs = jsonb_set(
            COALESCE(available_tabs, '[]'::jsonb),
            '{-1}',
            '"dashboard"',
            true
          )
          WHERE id = ${companyId}
        `);
        
        // Then add insights tab
        return db.execute(sql`
          UPDATE companies
          SET available_tabs = jsonb_set(
            available_tabs,
            '{-1}',
            '"insights"',
            true
          )
          WHERE id = ${companyId}
        `);
      },
      {
        maxRetries: 2,
        operation: "Unlock Dashboard and Insights tabs"
      }
    );
    
    // Broadcast company update to refresh UI
    broadcastCompanyUpdate(companyId);
    
    // Return success
    return true;
  } catch (error) {
    logger.error(`[TaskDependencies] Error unlocking Dashboard and Insights tabs:`, error);
    return false;
  }
}

/**
 * Broadcast company update to all connected clients
 * 
 * @param companyId Company ID
 */
function broadcastCompanyUpdate(companyId: number): void {
  try {
    // Import the WebSocket broadcast function
    const { broadcastCompanyTabsUpdate } = require("./websocket");
    
    // Broadcast update to refresh company tabs in the UI
    if (typeof broadcastCompanyTabsUpdate === "function") {
      broadcastCompanyTabsUpdate(companyId, ["file-vault"], { 
        cache_invalidation: true,
        source: "task_dependency_unlock"
      });
    }
  } catch (error) {
    logger.error(`[TaskDependencies] Error broadcasting company update:`, error);
  }
}
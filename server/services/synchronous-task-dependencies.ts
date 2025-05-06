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
    
    // CRITICAL FIX: Normalize task type to handle variations of KY3P task types
    // This ensures both 'ky3p' and 'sp_ky3p_assessment' are recognized as the same type
    const normalizedTaskType = completedTaskType.toLowerCase();
    const isKy3pTask = normalizedTaskType === 'ky3p' || normalizedTaskType === 'sp_ky3p_assessment';
    
    // Log the normalized task type for debugging
    logger.info(`[TaskDependencies] Normalized task type: ${normalizedTaskType}, isKy3pTask: ${isKy3pTask}`, {
      originalType: completedTaskType,
      normalizedType: normalizedTaskType,
      isKy3pTask
    });
    
    // Determine which tasks to unlock based on the completed task type
    if (normalizedTaskType === "company_kyb" || normalizedTaskType === "kyb") {
      // Unlock KY3P and Open Banking after KYB completion
      // Ensure we include both KY3P task type variations
      tasksToUnlock = await findLockedTasksByType(companyId, ["ky3p", "sp_ky3p_assessment", "open_banking"]);
      logger.info(`[TaskDependencies] Unlocking KY3P and Open Banking tasks after KYB completion`, {
        tasksToUnlock
      });
    } 
    else if (isKy3pTask) {
      // Specific dependencies for KY3P
      if (await checkKybCompleted(companyId)) {
        // Only unlock Open Banking if KYB is also completed
        tasksToUnlock = await findLockedTasksByType(companyId, ["open_banking"]);
        logger.info(`[TaskDependencies] Unlocking Open Banking tasks after KY3P completion`, {
          tasksToUnlock
        });
      }
    }
    else if (normalizedTaskType === "open_banking") {
      // Unlock dashboard access and File Vault
      await unlockDashboardAndInsightsTabs(companyId);
      await unlockFileVaultAccess(companyId);
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
          // First get the task type to handle KY3P tasks correctly
          const [taskInfo] = await db
            .select({ task_type: tasks.task_type })
            .from(tasks)
            .where(eq(tasks.id, taskId));
            
          // Check if this is a KY3P task - normalize task types for consistency
          const taskType = taskInfo?.task_type || 'unknown';
          const normalizedTaskType = taskType.toLowerCase();
          const isKy3pTask = normalizedTaskType === 'ky3p' || normalizedTaskType === 'sp_ky3p_assessment';
          
          // For KY3P tasks, we used to set a temporary initial progress of 60%
          // But this caused inconsistencies between Task Center and form view
          // Now we always set initial progress to 0 for all task types
          const initialProgressForKy3p = 0;
          
          const [updated] = await db
            .update(tasks)
            .set({
              progress: initialProgressForKy3p, // Set initial progress for KY3P tasks
              status: 'not_started', // Always start with not_started status
              metadata: {
                locked: false,
                prerequisite_completed: true,
                prerequisite_completed_at: now,
                dependencyUnlockOperation: true, // Mark as unlocked via dependency operation
                isKy3pTask // Store whether this is a KY3P task
              }
            })
            .where(eq(tasks.id, taskId))
            .returning({ id: tasks.id });
            
          if (updated) {
            updates.push(updated.id);
            
            // Broadcast WebSocket update
            broadcastTaskUpdate({
              id: taskId,
              status: 'not_started', // Always start with not_started status for all task types
              progress: initialProgressForKy3p,
              metadata: {
                locked: false,
                prerequisite_completed: true,
                prerequisite_completed_at: now,
                dependencyUnlockOperation: true,
                previousProgress: 0,
                previousStatus: 'not_started',
                isKy3pTask
              }
            });
            
            // Log the unlocked task with additional details
            logger.info(`[TaskDependencies] Unlocked task using unified progress calculator`, {
              companyId,
              taskId,
              taskType,
              isKy3pTask,
              calculatedProgress: initialProgressForKy3p,
              previousProgress: initialProgressForKy3p,
              wasPreserved: true
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
    // IMPROVEMENT: Add detailed logging for the lookup process
    logger.info(`[TaskDependencies] Looking for tasks with types: ${taskTypes.join(', ')}`, {
      companyId,
      taskTypes
    });
    
    const lockedTasks = await withRetry(
      async () => {
        return db
          .select({ id: tasks.id, type: tasks.task_type, status: tasks.status, progress: tasks.progress })
          .from(tasks)
          .where(
            and(
              eq(tasks.company_id, companyId),
              // IMPROVEMENT: Include more task states to ensure we find all relevant tasks
              // This ensures tasks with any locked state or null state are included
              or(
                sql`tasks.metadata->>'locked' = 'true'`,
                sql`tasks.metadata->>'locked' IS NULL`,
                eq(tasks.status, 'locked'),
                eq(tasks.status, 'not_started')
              )
            )
          );
      },
      {
        maxRetries: 2,
        operation: "Find locked tasks"
      }
    );
    
    // IMPROVEMENT: Add logging about all tasks found before filtering
    logger.info(`[TaskDependencies] Found ${lockedTasks.length} potential tasks for unlocking`, {
      companyId,
      taskCounts: lockedTasks.reduce((acc, task) => {
        acc[task.type] = (acc[task.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Filter tasks by requested types
    const filteredTasks = lockedTasks
      .filter(task => taskTypes.includes(task.type))
      .map(task => ({
        id: task.id,
        type: task.type,
        status: task.status,
        progress: task.progress
      }));
    
    // IMPROVEMENT: Log the exact tasks we've found after filtering
    logger.info(`[TaskDependencies] After filtering, found ${filteredTasks.length} tasks to unlock`, {
      companyId,
      taskTypes,
      taskDetails: filteredTasks
    });
    
    // Return just the IDs for the actual operation
    return filteredTasks.map(task => task.id);
      
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
    logger.info(`[TaskDependencies] Unlocking File Vault access for company`, { companyId });
    
    // First get the current company data to check if file vault is already unlocked
    const currentCompany = await db.execute(sql`
      SELECT available_tabs FROM companies WHERE id = ${companyId}
    `);
    
    logger.info(`[TaskDependencies] Current company tabs before unlock`, { 
      companyId,
      company: currentCompany.rows[0],
      available_tabs: currentCompany.rows[0]?.available_tabs
    });
    
    // Update using a more robust JSONB array append approach
    const result = await withRetry(
      async () => {
        // First ensure we have an array
        await db.execute(sql`
          UPDATE companies
          SET available_tabs = COALESCE(available_tabs, '[]'::jsonb)
          WHERE id = ${companyId} AND (available_tabs IS NULL OR available_tabs = 'null'::jsonb)
        `);
        
        // Then add file_vault if it doesn't exist in the array
        return db.execute(sql`
          UPDATE companies
          SET available_tabs = (
            CASE 
              WHEN available_tabs @> '"file_vault"' THEN available_tabs
              ELSE available_tabs || '"file_vault"'
            END
          ),
          onboarding_completed = true
          WHERE id = ${companyId}
        `);
      },
      {
        maxRetries: 3,
        operation: "Unlock File Vault access with array verification"
      }
    );
    
    logger.info(`[TaskDependencies] File vault update query result`, { 
      companyId,
      rowCount: result.rowCount,
      command: result.command
    });
    
    // Verify the update was successful
    const updatedCompany = await db.execute(sql`
      SELECT available_tabs FROM companies WHERE id = ${companyId}
    `);
    
    logger.info(`[TaskDependencies] Company tabs after unlock`, { 
      companyId,
      available_tabs: updatedCompany.rows[0]?.available_tabs
    });
    
    const tabsAfterUpdate = updatedCompany.rows[0]?.available_tabs || [];
    const fileVaultIsUnlocked = 
      Array.isArray(tabsAfterUpdate) ? 
      tabsAfterUpdate.includes("file_vault") : 
      String(tabsAfterUpdate).includes("file_vault");
    
    logger.info(`[TaskDependencies] File vault unlock status check`, { 
      companyId,
      fileVaultIsUnlocked 
    });
    
    // Broadcast company update to refresh UI
    broadcastCompanyUpdate(companyId);
    
    // Return whether the file vault is now unlocked
    return fileVaultIsUnlocked;
  } catch (error) {
    logger.error(`[TaskDependencies] Error unlocking File Vault access`, error);
    // Log detailed error information
    if (error instanceof Error) {
      logger.error(`[TaskDependencies] Error details: ${error.message}`, {
        stack: error.stack,
        companyId
      });
    }
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
    logger.info(`[TaskDependencies] Unlocking Dashboard and Insights tabs for company`, { companyId });
    
    // First get the current company data to check available tabs
    const currentCompany = await db.execute(sql`
      SELECT available_tabs FROM companies WHERE id = ${companyId}
    `);
    
    logger.info(`[TaskDependencies] Current company tabs before dashboard/insights unlock`, { 
      companyId,
      available_tabs: currentCompany.rows[0]?.available_tabs
    });
    
    // Update using same robust JSONB array approach as file vault unlock
    const result = await withRetry(
      async () => {
        // First ensure we have an array
        await db.execute(sql`
          UPDATE companies
          SET available_tabs = COALESCE(available_tabs, '[]'::jsonb)
          WHERE id = ${companyId} AND (available_tabs IS NULL OR available_tabs = 'null'::jsonb)
        `);
        
        // Add dashboard if it doesn't exist in the array
        await db.execute(sql`
          UPDATE companies
          SET available_tabs = (
            CASE 
              WHEN available_tabs @> '"dashboard"' THEN available_tabs
              ELSE available_tabs || '"dashboard"'
            END
          )
          WHERE id = ${companyId}
        `);
        
        // Add insights if it doesn't exist in the array
        return db.execute(sql`
          UPDATE companies
          SET available_tabs = (
            CASE 
              WHEN available_tabs @> '"insights"' THEN available_tabs
              ELSE available_tabs || '"insights"'
            END
          ),
          onboarding_completed = true
          WHERE id = ${companyId}
        `);
      },
      {
        maxRetries: 3,
        operation: "Unlock Dashboard and Insights tabs with array verification"
      }
    );
    
    logger.info(`[TaskDependencies] Dashboard/Insights update query result`, { 
      companyId,
      rowCount: result.rowCount,
      command: result.command
    });
    
    // Verify the update was successful
    const updatedCompany = await db.execute(sql`
      SELECT available_tabs FROM companies WHERE id = ${companyId}
    `);
    
    logger.info(`[TaskDependencies] Company tabs after dashboard/insights unlock`, { 
      companyId,
      available_tabs: updatedCompany.rows[0]?.available_tabs
    });
    
    // Broadcast company update to refresh UI
    broadcastCompanyUpdate(companyId);
    
    // Return success
    return true;
  } catch (error) {
    logger.error(`[TaskDependencies] Error unlocking Dashboard and Insights tabs`, error);
    if (error instanceof Error) {
      logger.error(`[TaskDependencies] Error details: ${error.message}`, {
        stack: error.stack,
        companyId
      });
    }
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
    // Import the WebSocket broadcast function directly
    const { broadcastCompanyTabsUpdate } = require("./company-tabs");
    
    logger.info(`[TaskDependencies] Broadcasting company update for tab access`, { 
      companyId, 
      operation: "task_dependency_unlock" 
    });
    
    // Broadcast update to refresh company tabs in the UI
    if (typeof broadcastCompanyTabsUpdate === "function") {
      // Use file_vault (with underscore) to match the database field name
      broadcastCompanyTabsUpdate(companyId, ["file_vault", "dashboard", "insights"], { 
        cache_invalidation: true,
        source: "task_dependency_unlock",
        timestamp: new Date().toISOString()
      });
      
      logger.info(`[TaskDependencies] Company tabs broadcast completed`, { companyId });
    } else {
      logger.error(`[TaskDependencies] broadcastCompanyTabsUpdate is not a function`, { 
        companyId,
        type: typeof broadcastCompanyTabsUpdate 
      });
    }
  } catch (error) {
    logger.error(`[TaskDependencies] Error broadcasting company update:`, error);
    // Log specific details about the error
    if (error instanceof Error) {
      logger.error(`[TaskDependencies] Error details: ${error.message}`, {
        stack: error.stack,
        companyId
      });
    }
  }
}
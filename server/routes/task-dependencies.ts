/**
 * Task Dependencies Router
 * 
 * This module manages task dependencies, ensuring tasks are properly unlocked
 * when their dependencies are completed. It uses the unified progress calculator
 * to ensure consistent status and progress handling.
 */

import { Router } from 'express';
import { db } from '@db';
import { eq, and, inArray, or } from 'drizzle-orm';
import { tasks, task_dependencies } from '@db/schema';
import { calculateAndUpdateProgress } from '../utils/unified-progress-calculator';
import { logger } from '../utils/logger';

const log = logger.child({ module: 'TaskDependencies' });
const router = Router();

/**
 * Update dependent tasks when a task is completed
 * 
 * This endpoint checks for tasks that depend on the given task,
 * and unlocks them if all their dependencies are met.
 */
router.post('/api/task-dependencies/update', async (req, res) => {
  try {
    const { taskId, companyId } = req.body;
    
    if (!taskId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'taskId and companyId are required',
      });
    }
    
    const result = await updateTaskDependencies(taskId, companyId);
    return res.json(result);
  } catch (error) {
    log.error('Error updating task dependencies:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error updating task dependencies',
    });
  }
});

/**
 * Process task dependencies for a company
 * 
 * This endpoint processes all task dependencies for a company,
 * unlocking any tasks whose dependencies are met.
 */
router.post('/api/task-dependencies/process-company', async (req, res) => {
  try {
    const { companyId } = req.body;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'companyId is required',
      });
    }
    
    const result = await processCompanyDependencies(companyId);
    return res.json(result);
  } catch (error) {
    log.error('Error processing company task dependencies:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error processing company task dependencies',
    });
  }
});

/**
 * Update dependent tasks when a task is completed
 * @export
 */
export async function updateTaskDependencies(taskId: number, companyId: number) {
  log.info(`Updating task dependencies for task ${taskId} in company ${companyId}`);
  
  try {
    // Find tasks that depend on this task
    const dependencies = await db.query.task_dependencies.findMany({
      where: eq(task_dependencies.prerequisite_task_id, taskId),
      columns: {
        task_id: true,
        prerequisite_task_id: true,
      },
    });
    
    if (dependencies.length === 0) {
      log.info(`No dependent tasks found for task ${taskId}`);
      return {
        success: true,
        message: 'No dependent tasks found',
        unlockedTasks: [],
      };
    }
    
    log.info(`Found ${dependencies.length} dependent tasks for task ${taskId}`);
    
    // Get all dependent task IDs
    const dependentTaskIds = dependencies.map(dep => dep.task_id);
    
    // Find all tasks with their dependencies
    const dependentTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.company_id, companyId),
        inArray(tasks.id, dependentTaskIds)
      ),
      columns: {
        id: true,
        task_type: true,
        status: true,
        locked: true,
      },
    });
    
    // Process each dependent task
    const unlockedTasks = [];
    for (const task of dependentTasks) {
      // Only process locked tasks that are not in terminal states
      const terminalStates = ['submitted', 'approved', 'rejected', 'archived'];
      if (task.locked && !terminalStates.includes(task.status)) {
        // Check if all prerequisites are completed
        const allPrerequisitesMet = await checkAllPrerequisites(task.id);
        
        if (allPrerequisitesMet) {
          // Unlock the task
          log.info(`Unlocking task ${task.id} (${task.task_type})`);
          await unlockTask(task.id, task.task_type, companyId);
          unlockedTasks.push(task.id);
        }
      }
    }
    
    return {
      success: true,
      message: `Unlocked ${unlockedTasks.length} tasks`,
      unlockedTasks,
    };
  } catch (error) {
    log.error(`Error updating task dependencies for task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Process all task dependencies for a company
 * @export
 */
export async function processCompanyDependencies(companyId: number) {
  log.info(`Processing all task dependencies for company ${companyId}`);
  
  try {
    // Find all locked tasks for the company
    const lockedTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.company_id, companyId),
        eq(tasks.locked, true),
        or(
          eq(tasks.status, 'not_started'),
          eq(tasks.status, 'in_progress')
        )
      ),
      columns: {
        id: true,
        task_type: true,
        status: true,
      },
    });
    
    if (lockedTasks.length === 0) {
      log.info(`No locked tasks found for company ${companyId}`);
      return {
        success: true,
        message: 'No locked tasks found',
        unlockedTasks: [],
      };
    }
    
    log.info(`Found ${lockedTasks.length} locked tasks for company ${companyId}`);
    
    // Process each locked task
    const unlockedTasks = [];
    for (const task of lockedTasks) {
      // Check if all prerequisites are completed
      const allPrerequisitesMet = await checkAllPrerequisites(task.id);
      
      if (allPrerequisitesMet) {
        // Unlock the task
        log.info(`Unlocking task ${task.id} (${task.task_type})`);
        await unlockTask(task.id, task.task_type, companyId);
        unlockedTasks.push(task.id);
      }
    }
    
    return {
      success: true,
      message: `Unlocked ${unlockedTasks.length} tasks`,
      unlockedTasks,
    };
  } catch (error) {
    log.error(`Error processing task dependencies for company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Check if all prerequisites for a task are completed
 */
async function checkAllPrerequisites(taskId: number): Promise<boolean> {
  try {
    // Find all prerequisites for this task
    const dependencies = await db.query.task_dependencies.findMany({
      where: eq(task_dependencies.task_id, taskId),
      columns: {
        prerequisite_task_id: true,
      },
    });
    
    if (dependencies.length === 0) {
      // No prerequisites, so all are met
      return true;
    }
    
    // Get all prerequisite task IDs
    const prerequisiteTaskIds = dependencies.map(dep => dep.prerequisite_task_id);
    
    // Check if all prerequisites are completed
    const prerequisiteTasks = await db.query.tasks.findMany({
      where: inArray(tasks.id, prerequisiteTaskIds),
      columns: {
        id: true,
        status: true,
        progress: true,
      },
    });
    
    // For a prerequisite to be considered completed, it must be in a terminal state
    // or have 100% progress
    const completedPrerequisites = prerequisiteTasks.filter(task => {
      return task.status === 'submitted' || 
             task.status === 'approved' || 
             task.progress === 100;
    });
    
    // All prerequisites must be completed
    return completedPrerequisites.length === prerequisiteTaskIds.length;
  } catch (error) {
    log.error(`Error checking prerequisites for task ${taskId}:`, error);
    return false;
  }
}

/**
 * Unlock a task and update its progress
 */
async function unlockTask(taskId: number, taskType: string, companyId: number): Promise<boolean> {
  try {
    // First unlock the task by setting the locked flag to false
    await db.update(tasks)
      .set({
        locked: false,
        updated_at: new Date(),
        prerequisite_completed: true,
        prerequisite_completed_at: new Date(),
      })
      .where(eq(tasks.id, taskId));
    
    // Get comprehensive task type to use for progress calculation
    const normalizedTaskType = mapTaskType(taskType);
    
    // Then update the task progress using the unified calculator
    const calculatedProgress = await calculateAndUpdateProgress(
      taskId,
      normalizedTaskType as any,
      {
        preserveProgress: false, // Don't preserve progress when unlocking
        updateDatabase: true,
        sendWebSocketUpdate: true,
        metadata: {
          locked: false,
          prerequisite_completed: true,
          prerequisite_completed_at: new Date(),
          dependencyUnlockOperation: true,
          previousProgress: 0, // Initial assumption
          previousStatus: 'not_started', // Initial assumption
          isKy3pTask: normalizedTaskType === 'ky3p',
        },
      }
    );
    
    log.info('Unlocked task using unified progress calculator', {
      companyId,
      taskId,
      taskType: normalizedTaskType,
      isKy3pTask: normalizedTaskType === 'ky3p',
      calculatedProgress,
      previousProgress: 0, // This is an approximation
      wasPreserved: false,
    });
    
    return true;
  } catch (error) {
    log.error(`Error unlocking task ${taskId}:`, error);
    return false;
  }
}

/**
 * Map a task type to a consistent normalized value for progress calculation
 */
function mapTaskType(taskType: string): string {
  // Normalize task type for progress calculation
  const taskTypeMap: Record<string, string> = {
    'company_kyb': 'company_kyb',
    'kyb': 'company_kyb',
    'ky3p': 'ky3p',
    'open_banking': 'open_banking',
    'user_kyb': 'user_kyb',
  };
  
  return taskTypeMap[taskType.toLowerCase()] || taskType.toLowerCase();
}

/**
 * Specifically unlock Open Banking tasks for a company
 * This is used when other form types are completed to ensure
 * that Open Banking tasks are unlocked appropriately.
 *
 * @export
 */
export async function unlockOpenBankingTasks(companyId: number) {
  log.info(`Unlocking Open Banking tasks for company ${companyId}`);
  
  try {
    // Find all Open Banking tasks for the company
    const openBankingTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.company_id, companyId),
        eq(tasks.task_type, 'open_banking'),
        eq(tasks.locked, true)
      ),
      columns: {
        id: true,
        status: true,
      },
    });
    
    if (openBankingTasks.length === 0) {
      log.info(`No locked Open Banking tasks found for company ${companyId}`);
      return {
        success: true,
        message: 'No locked Open Banking tasks found',
        unlockedTasks: [],
      };
    }
    
    log.info(`Found ${openBankingTasks.length} locked Open Banking tasks for company ${companyId}`);
    
    // Process each locked Open Banking task
    const unlockedTasks = [];
    for (const task of openBankingTasks) {
      // Unlock the task
      log.info(`Unlocking Open Banking task ${task.id}`);
      await unlockTask(task.id, 'open_banking', companyId);
      unlockedTasks.push(task.id);
    }
    
    return {
      success: true,
      message: `Unlocked ${unlockedTasks.length} Open Banking tasks`,
      unlockedTasks,
    };
  } catch (error) {
    log.error(`Error unlocking Open Banking tasks for company ${companyId}:`, error);
    throw error;
  }
}

// For backwards compatibility, also export processDependencies as processCompanyDependencies
export const processDependencies = processCompanyDependencies;

export default router;

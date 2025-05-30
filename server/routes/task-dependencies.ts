/**
 * Task Dependencies Management
 * 
 * This module handles automatic unlocking of dependent tasks
 * based on task type relationships and status changes.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { broadcastTaskUpdate } from '../utils/unified-websocket';
import { logger } from '../utils/logger';
import { updateTaskProgressAndBroadcast } from '../utils/unified-progress-calculator';

// Logger is already initialized in the imported module

interface DependencyRule {
  prerequisiteType: string;
  prerequisiteStatus: string;
  dependentType: string;
}

// Define task dependencies
// Empty dependency rules - all tasks will be unlocked by default
const DEPENDENCY_RULES: DependencyRule[] = [];

/**
 * Check and unlock dependent tasks for a given company
 * @param companyId 
 */
export async function processDependencies(companyId: number) {
  logger.info('[TaskDependencies] Processing task dependencies', { companyId });
  
  try {
    // For each dependency rule, check if any prerequisites are met
    for (const rule of DEPENDENCY_RULES) {
      // Check if any prerequisite tasks with the required status exist
      const prerequisiteTasks = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.company_id, companyId),
            eq(tasks.task_type, rule.prerequisiteType),
            eq(tasks.status, rule.prerequisiteStatus)
          )
        );
      
      if (prerequisiteTasks.length === 0) {
        logger.info('[TaskDependencies] No qualifying prerequisite tasks found', { 
          companyId, 
          prerequisiteType: rule.prerequisiteType,
          prerequisiteStatus: rule.prerequisiteStatus
        });
        continue;
      }
      
      logger.info('[TaskDependencies] Found qualifying prerequisite tasks', { 
        companyId, 
        prerequisiteType: rule.prerequisiteType,
        prerequisiteStatus: rule.prerequisiteStatus,
        count: prerequisiteTasks.length
      });
      
      // Find dependent tasks that need to be unlocked
      const dependentTasks = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.company_id, companyId),
            eq(tasks.task_type, rule.dependentType),
            or(
              eq(tasks.status, 'locked'),
              isNull(tasks.status)
            )
          )
        );
      
      if (dependentTasks.length === 0) {
        logger.info('[TaskDependencies] No locked dependent tasks found', { 
          companyId, 
          dependentType: rule.dependentType
        });
        continue;
      }
      
      logger.info('[TaskDependencies] Found locked dependent tasks to unlock', { 
        companyId, 
        dependentType: rule.dependentType,
        count: dependentTasks.length
      });
      
      // Import determineStatusFromProgress function to ensure correct status
      const { determineStatusFromProgress } = await import('../utils/progress');

      // Unlock each dependent task
      for (const task of dependentTasks) {
        // Determine correct status based on task's progress
        const taskProgress = task.progress || 0;
        const newStatus = determineStatusFromProgress(
          taskProgress,
          task.status as any,
          [], // no form responses
          task.metadata || {}
        );
        
        await db.update(tasks)
          .set({
            status: newStatus, // Use the properly determined status
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
          
        logger.info('[TaskDependencies] Unlocked dependent task', { 
          companyId, 
          dependentType: rule.dependentType,
          taskId: task.id,
          progress: taskProgress,
          status: newStatus
        });
        
        // Broadcast the update via WebSocket
        broadcastTaskUpdate({
          id: task.id,
          status: newStatus,
          progress: taskProgress,
          metadata: {
            locked: false,
            prerequisite_completed: true,
            prerequisite_completed_at: new Date().toISOString()
          }
        });
      }
    }
    
    logger.info('[TaskDependencies] Finished processing task dependencies', { companyId });
  } catch (error) {
    logger.error('[TaskDependencies] Error processing task dependencies', {
      companyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check for specific task to unlock (for direct unlocking)
 */
export async function unlockOpenBankingTasks(companyId: number) {
  logger.info('[TaskDependencies] Directly unlocking Open Banking tasks', { companyId });
  
  try {
    // FIRST PRIORITY: Try to unlock task ID 614 directly (based on user reports)
    const specificTask = await db.select()
      .from(tasks)
      .where(eq(tasks.id, 614));
    
    if (specificTask.length > 0) {
      logger.info('[TaskDependencies] Found specific Open Banking task ID 614', { 
        taskType: specificTask[0].task_type,
        status: specificTask[0].status
      });
      
      // Import determineStatusFromProgress function to ensure correct status
      const { determineStatusFromProgress } = await import('../utils/progress');
      
      // Determine correct status based on task's progress
      const task = specificTask[0];
      const taskProgress = task.progress || 0;
      const newStatus = determineStatusFromProgress(
        taskProgress,
        task.status as any,
        [], // no form responses
        task.metadata || {}
      );
      
      logger.info('[TaskDependencies] Determining correct status for task 614', {
        progress: taskProgress,
        currentStatus: task.status,
        newStatus
      });

      // Unlock task 614 with proper status based on progress
      await db.update(tasks)
        .set({
          status: newStatus,
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
        .where(eq(tasks.id, 614));
        
      logger.info('[TaskDependencies] Unlocked specific task ID 614', {
        progress: taskProgress,
        status: newStatus
      });
      
      // Broadcast the update via WebSocket
      broadcastTaskUpdate({
        id: 614,
        status: newStatus,
        progress: taskProgress,
        metadata: {
          locked: false,
          prerequisite_completed: true,
          prerequisite_completed_at: new Date().toISOString()
        }
      });
    }
    
    // SECOND PRIORITY: Find any Open Banking tasks that need unlocking (both open_banking_survey and company_card types)
    const openBankingTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          or(
            eq(tasks.task_type, 'open_banking_survey'),
            eq(tasks.task_type, 'company_card')
          ),
          or(
            eq(tasks.status, 'locked'),
            eq(tasks.status, 'not_started'),
            isNull(tasks.status)
          )
        )
      );
    
    if (openBankingTasks.length === 0) {
      logger.info('[TaskDependencies] No Open Banking tasks found to unlock', { companyId });
      return;
    }
    
    logger.info('[TaskDependencies] Found Open Banking tasks to unlock', { 
      companyId, 
      count: openBankingTasks.length
    });
    
    // Import determineStatusFromProgress function if not already imported
    if (typeof determineStatusFromProgress === 'undefined') {
      var { determineStatusFromProgress } = await import('../utils/progress');
    }

    // Unlock each Open Banking task
    for (const task of openBankingTasks) {
      // Determine correct status based on task's progress
      const taskProgress = task.progress || 0;
      const newStatus = determineStatusFromProgress(
        taskProgress,
        task.status as any,
        [], // no form responses
        task.metadata || {}
      );
      
      logger.info('[TaskDependencies] Determining correct status for Open Banking task', {
        taskId: task.id,
        progress: taskProgress,
        currentStatus: task.status,
        newStatus
      });

      await db.update(tasks)
        .set({
          status: newStatus,
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
        
      logger.info('[TaskDependencies] Unlocked Open Banking task', { 
        companyId, 
        taskId: task.id,
        progress: taskProgress,
        status: newStatus
      });
      
      // Broadcast the update via WebSocket
      broadcastTaskUpdate({
        id: task.id,
        status: newStatus,
        progress: taskProgress,
        metadata: {
          locked: false,
          prerequisite_completed: true,
          prerequisite_completed_at: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    logger.error('[TaskDependencies] Error unlocking Open Banking tasks', {
      companyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Unlock ALL tasks for a company regardless of dependencies
 * This function directly unlocks every task for a company without checking prerequisites
 */
export async function unlockAllTasks(companyId: number) {
  logger.info('[TaskDependencies] Unlocking ALL tasks for company', { companyId });
  
  try {
    // Find all tasks for this company
    // CRITICAL FIX: Ensure we don't have any task type restrictions
    // This ensures KY3P tasks are properly included in the unlocking process
    
    // Get all tasks to check for submission metadata
    const allCompanyTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.company_id, companyId));
      
    // Filter out tasks with submission indicators in their metadata
    const companyTasks = allCompanyTasks.filter(task => {
      // Check for submission indicators in metadata
      const hasSubmissionDate = task.metadata?.submissionDate || 
                               task.metadata?.submittedAt || 
                               task.metadata?.submission_date;
                               
      const hasSubmittedFlag = task.metadata?.submitted === true || 
                              task.metadata?.isSubmitted === true;
                              
      const hasFileId = task.metadata?.fileId || task.metadata?.file_id;
      
      // Special handling for user_onboarding tasks
      // These should be marked as completed after a user successfully logs in
      if (task.task_type === 'user_onboarding') {
        // If user has successfully logged in, we want to mark this as completed
        // so we allow processing to continue - don't filter it out
        logger.info('[TaskDependencies] Found user onboarding task that needs completion', {
          taskId: task.id,
          userEmail: task.user_email,
          currentStatus: task.status,
          currentProgress: task.progress
        });
        return true;
      }
      
      // ENHANCED FIX: Comprehensively check for ANY submission indicators and don't process submitted tasks
      const isReadyForSubmission = task.status === 'ready_for_submission' && task.progress === 100;
      const isExplicitlySubmitted = task.status === 'submitted';
      
      // Detect ALL possible submission indicators across different metadata fields and naming conventions
      if (hasSubmissionDate || 
          hasSubmittedFlag || 
          hasFileId || 
          isExplicitlySubmitted || 
          isReadyForSubmission) {
        
        // Log detailed submission indicators for debugging
        console.log(`[TaskDependencies] Skipping task ${task.id} with submission indicators`, {
          hasSubmissionDate: !!hasSubmissionDate,
          hasSubmittedFlag: !!hasSubmittedFlag,
          hasFileId: !!hasFileId,
          status: task.status,
          progress: task.progress,
          isReadyForSubmission: isReadyForSubmission
        });
        
        // IMPORTANT: Fix submitted tasks that have incorrect progress
        if (isExplicitlySubmitted && task.progress !== 100) {
          logger.info('[TaskDependencies] Found submitted task with incorrect progress', {
            taskId: task.id,
            taskType: task.task_type,
            currentProgress: task.progress,
            correctProgress: 100
          });
          
          // Trigger manual reconciliation for this task through the periodic system
          // This will be handled asynchronously
          import('../utils/periodic-task-reconciliation').then(module => {
            module.triggerManualReconciliation([task.id])
              .catch(err => {
                logger.error('[TaskDependencies] Error triggering reconciliation:', err);
              });
          }).catch(err => {
            logger.error('[TaskDependencies] Error importing reconciliation module:', err);
          });
        }
        return false;
      }
      
      // Also exclude tasks with other terminal states
      if (['approved', 'rejected', 'archived'].includes(task.status || '')) {
        return false;
      }
      
      return true;
    });
    
    if (companyTasks.length === 0) {
      logger.info('[TaskDependencies] No tasks found to unlock', { companyId });
      return;
    }
    
    // IMPROVEMENT: Explicitly log any KY3P tasks found to verify they're being included
    const ky3pTasks = companyTasks.filter(t => 
      t.task_type === 'ky3p' || t.task_type === 'sp_ky3p_assessment'
    );
    
    logger.info('[TaskDependencies] Found tasks to unlock', { 
      companyId, 
      count: companyTasks.length,
      taskIds: companyTasks.map(t => t.id),
      taskTypes: companyTasks.map(t => t.task_type),
      ky3pTaskCount: ky3pTasks.length,
      ky3pTaskIds: ky3pTasks.map(t => t.id)
    });
    
    // Unlock each task using the unified progress calculator
    for (const task of companyTasks) {
      // CRITICAL FIX: Special handling for different task types
      const isKy3pTask = task.task_type === 'ky3p' || task.task_type === 'sp_ky3p_assessment';
      const isUserOnboardingTask = task.task_type === 'user_onboarding';
      
      // Create metadata for the task update
      const updateMetadata = {
        locked: false,
        prerequisite_completed: true,
        prerequisite_completed_at: new Date().toISOString(),
        dependencyUnlockOperation: true,
        previousProgress: task.progress || 0,
        previousStatus: task.status || 'unknown',
        // Add flags to indicate special task types
        isKy3pTask: isKy3pTask,
        isUserOnboardingTask: isUserOnboardingTask
      };
      
      // For KY3P tasks, log detailed information before updating
      if (isKy3pTask) {
        logger.info('[TaskDependencies] Processing KY3P task', {
          taskId: task.id,
          taskType: task.task_type,
          currentProgress: task.progress,
          currentStatus: task.status,
          timestamp: new Date().toISOString()
        });
      }
      
      // Special handling for User Onboarding tasks - these should be marked as completed
      if (isUserOnboardingTask) {
        logger.info('[TaskDependencies] Setting User Onboarding task as completed', {
          taskId: task.id,
          userEmail: task.user_email,
          timestamp: new Date().toISOString()
        });
        
        // Directly update the task in the database to mark it as completed with 100% progress
        await db.update(tasks)
          .set({
            status: 'completed',
            progress: 100,
            metadata: sql`jsonb_set(
              jsonb_set(
                jsonb_set(
                  COALESCE(metadata, '{}'::jsonb),
                  '{completed}', 'true'
                ),
                '{submission_date}', to_jsonb(now())
              ),
              '{locked}', 'false'
            )`,
            updated_at: new Date()
          })
          .where(eq(tasks.id, task.id));
          
        // Broadcast the update via WebSocket
        broadcastTaskUpdate({
          id: task.id,
          status: 'completed',
          progress: 100,
          metadata: {
            locked: false,
            completed: true,
            submission_date: new Date().toISOString()
          }
        });
        
        // Skip the regular update flow for user onboarding tasks
        continue;
      }
      
      // For all other task types, use the unified progress calculator with preserveExisting=true
      // This ensures we don't reset progress if it already exists
      // CRITICAL FIX: Force preserveExisting for KY3P tasks to prevent progress resets
      const taskProgress = await updateTaskProgressAndBroadcast(task.id, task.task_type, {
        debug: true,
        preserveExisting: true, // Critical flag to prevent progress resets
        forcePreserve: isKy3pTask, // Force preservation for KY3P tasks
        metadata: updateMetadata
      });
      
      // Enhanced logging to track task updates
      logger.info('[TaskDependencies] Unlocked task using unified progress calculator', { 
        companyId, 
        taskId: task.id,
        taskType: task.task_type,
        isKy3pTask,
        calculatedProgress: taskProgress,
        previousProgress: task.progress || 0,
        wasPreserved: (task.progress || 0) > 0 && taskProgress === (task.progress || 0)
      });
      
      // Note: We don't need to broadcast the update here because updateTaskProgressAndBroadcast already does it
    }
    
    logger.info('[TaskDependencies] Successfully unlocked all tasks', { 
      companyId, 
      count: companyTasks.length 
    });
  } catch (error) {
    logger.error('[TaskDependencies] Error unlocking all tasks', {
      companyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default {
  processDependencies,
  unlockOpenBankingTasks,
  unlockAllTasks
};
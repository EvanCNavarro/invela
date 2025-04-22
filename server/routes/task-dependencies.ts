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
import { broadcastTaskUpdate } from '../services/websocket';
import { Logger } from '../utils/logger';

const logger = new Logger('TaskDependencies');

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
      
      // Unlock each dependent task
      for (const task of dependentTasks) {
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
          
        logger.info('[TaskDependencies] Unlocked dependent task', { 
          companyId, 
          dependentType: rule.dependentType,
          taskId: task.id
        });
        
        // Broadcast the update via WebSocket
        broadcastTaskUpdate({
          id: task.id,
          status: 'not_started',
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
      
      // Unlock task 614 regardless of its current type or status
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
        .where(eq(tasks.id, 614));
        
      logger.info('[TaskDependencies] Unlocked specific task ID 614');
      
      // Broadcast the update via WebSocket
      broadcastTaskUpdate({
        id: 614,
        status: 'not_started',
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
    
    // Unlock each Open Banking task
    for (const task of openBankingTasks) {
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
        
      logger.info('[TaskDependencies] Unlocked Open Banking task', { 
        companyId, 
        taskId: task.id
      });
      
      // Broadcast the update via WebSocket
      broadcastTaskUpdate({
        id: task.id,
        status: 'not_started',
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
    const companyTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          or(
            eq(tasks.status, 'locked'),
            eq(tasks.status, 'not_started'),
            isNull(tasks.status)
          )
        )
      );
    
    if (companyTasks.length === 0) {
      logger.info('[TaskDependencies] No tasks found to unlock', { companyId });
      return;
    }
    
    logger.info('[TaskDependencies] Found tasks to unlock', { 
      companyId, 
      count: companyTasks.length,
      taskIds: companyTasks.map(t => t.id),
      taskTypes: companyTasks.map(t => t.task_type)
    });
    
    // Unlock each task
    for (const task of companyTasks) {
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
        
      logger.info('[TaskDependencies] Unlocked task', { 
        companyId, 
        taskId: task.id,
        taskType: task.task_type
      });
      
      // Broadcast the update via WebSocket
      broadcastTaskUpdate({
        id: task.id,
        status: 'not_started',
        metadata: {
          locked: false,
          prerequisite_completed: true,
          prerequisite_completed_at: new Date().toISOString()
        }
      });
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
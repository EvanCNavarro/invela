/**
 * Periodic Task Reconciliation System
 * 
 * This module provides automatic monitoring and correction of task progress values
 * to ensure they stay consistent with the actual data in the database.
 * 
 * It implements a system that runs periodic checks and reconciles any
 * inconsistencies between task progress values and the actual form data.
 * 
 * Enterprise logging standardization applied following OODA methodology.
 */

import { eq, and, lt, or, sql, inArray } from 'drizzle-orm';
import { db } from '@db';
import { tasks, TaskStatus } from '@db/schema';
import { reconcileTaskProgress, calculateTaskProgressFromDB } from './task-reconciliation';
import { broadcastProgressUpdate } from './progress';
import { logger } from './logger';

// Map of tasks that were recently reconciled to prevent redundant operations
const recentlyReconciledTasks = new Map<number, number>();

// Maximum number of tasks to reconcile in each batch
const MAX_BATCH_SIZE = 10;

// Minimum time in milliseconds between reconciliation attempts for the same task
const MIN_RECONCILIATION_INTERVAL = 60 * 1000; // 1 minute

/**
 * Find tasks that might have inconsistent progress values
 * 
 * @returns Promise<number[]> Array of task IDs that should be reconciled
 */
async function findTasksNeedingReconciliation(): Promise<number[]> {
  try {
    // Current time minus reconciliation interval
    const minReconciliationTime = new Date(Date.now() - MIN_RECONCILIATION_INTERVAL);
    
    // Find active tasks not recently reconciled
    const tasksToCheck = await db.select({ id: tasks.id, type: tasks.task_type, status: tasks.status, metadata: tasks.metadata })
      .from(tasks)
      .where(
        and(
          // Only check active tasks - NEVER include submitted/completed tasks
          or(
            eq(tasks.status, TaskStatus.IN_PROGRESS),
            eq(tasks.status, TaskStatus.NOT_STARTED),
            eq(tasks.status, TaskStatus.READY_FOR_SUBMISSION)
          ),
          // Only check form-based tasks
          or(
            eq(tasks.task_type, 'company_kyb'),
            eq(tasks.task_type, 'ky3p'),
            eq(tasks.task_type, 'open_banking')
          ),
          // Skip tasks with recent reconciliation timestamp in metadata
          or(
            sql`${tasks.metadata}->>'lastProgressReconciliation' IS NULL`,
            sql`(${tasks.metadata}->>'lastProgressReconciliation')::timestamp < ${minReconciliationTime}`
          ),
          // CRITICAL FIX: Explicitly exclude tasks with any submission indicators in metadata
          // This ensures we never try to recalculate progress for submitted tasks
          and(
            sql`${tasks.metadata}->>'submissionDate' IS NULL`,
            sql`${tasks.metadata}->>'submission_date' IS NULL`,
            sql`${tasks.metadata}->>'submitted' IS NULL OR ${tasks.metadata}->>'submitted' = 'false'`,
            sql`${tasks.metadata}->>'explicitlySubmitted' IS NULL OR ${tasks.metadata}->>'explicitlySubmitted' = 'false'`
          )
        )
      )
      .limit(MAX_BATCH_SIZE);
      
    // Filter out recently reconciled tasks (in-memory cache)
    const currentTime = Date.now();
    const filteredTasks = tasksToCheck.filter(task => {
      const lastReconciled = recentlyReconciledTasks.get(task.id);
      return !lastReconciled || (currentTime - lastReconciled > MIN_RECONCILIATION_INTERVAL);
    });
    
    // Return just the task IDs
    return filteredTasks.map(task => task.id);
  } catch (error) {
    console.error('[PeriodicTaskReconciliation] Error finding tasks to reconcile:', error);
    return [];
  }
}

/**
 * Perform periodic reconciliation for a batch of tasks
 * 
 * @returns Promise<void>
 */
async function reconcileBatch(): Promise<void> {
  try {
    // Find tasks that need reconciliation
    const taskIds = await findTasksNeedingReconciliation();
    
    if (taskIds.length === 0) {
      return; // No tasks need reconciliation
    }
    
    logger.child({ module: 'PeriodicTaskReconciliation' }).info('Reconciling batch of tasks', { 
      batchSize: taskIds.length, 
      taskIds 
    });
    
    // Process each task
    for (const taskId of taskIds) {
      try {
        // Mark as recently reconciled to prevent duplicate processing
        recentlyReconciledTasks.set(taskId, Date.now());
        
        // Get task details
        const task = await db.query.tasks.findFirst({
          where: eq(tasks.id, taskId)
        });
        
        if (!task) {
          logger.child({ module: 'PeriodicTaskReconciliation' }).warn('Task not found during reconciliation', { taskId });
          continue;
        }
        
        // Get actual progress from database
        const calculatedProgress = await calculateTaskProgressFromDB(taskId, task.task_type);
        
        // If progress differs significantly, reconcile it
        if (Math.abs(calculatedProgress - (task.progress || 0)) >= 5) {
          console.log(`[PeriodicTaskReconciliation] Reconciling task ${taskId} progress:`, {
            taskType: task.task_type,
            currentProgress: task.progress,
            calculatedProgress,
            diff: calculatedProgress - (task.progress || 0)
          });
          
          // Perform full reconciliation
          await reconcileTaskProgress(taskId, { debug: true });
        } else {
          // Progress is close enough, just update the timestamp
          await db.update(tasks)
            .set({
              metadata: {
                ...task.metadata,
                lastProgressReconciliation: new Date().toISOString()
              }
            })
            .where(eq(tasks.id, taskId));
        }
      } catch (taskError) {
        console.error(`[PeriodicTaskReconciliation] Error reconciling task ${taskId}:`, taskError);
        // Continue with next task
      }
    }
  } catch (error) {
    console.error('[PeriodicTaskReconciliation] Error in reconciliation batch:', error);
  }
}

// Clean up the in-memory cache periodically
function cleanupCache(): void {
  try {
    const currentTime = Date.now();
    let expiredCount = 0;
    
    // Delete entries older than the reconciliation interval
    for (const [taskId, timestamp] of recentlyReconciledTasks.entries()) {
      if (currentTime - timestamp > MIN_RECONCILIATION_INTERVAL * 2) {
        recentlyReconciledTasks.delete(taskId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`[PeriodicTaskReconciliation] Cleaned up ${expiredCount} expired entries from cache`);
    }
  } catch (error) {
    console.error('[PeriodicTaskReconciliation] Error cleaning up cache:', error);
  }
}

// Interval for running periodic reconciliation (5 minutes)
const RECONCILIATION_INTERVAL = 5 * 60 * 1000;

// Interval for cleaning up the cache (15 minutes)
const CACHE_CLEANUP_INTERVAL = 15 * 60 * 1000;

// Start reconciliation system
let reconciliationInterval: NodeJS.Timeout | null = null;
let cacheCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start the periodic task reconciliation system
 */
export function startPeriodicTaskReconciliation(): void {
  // Stop any existing intervals
  stopPeriodicTaskReconciliation();
  
  logger.child({ module: 'PeriodicTaskReconciliation' }).info('Periodic reconciliation system started', { 
    intervalMs: RECONCILIATION_INTERVAL,
    cacheCleanupIntervalMs: CACHE_CLEANUP_INTERVAL,
    status: 'active'
  });
  
  // DISABLED: Start reconciliation interval for testing real-time WebSocket events
  // reconciliationInterval = setInterval(reconcileBatch, RECONCILIATION_INTERVAL);
  
  // Start cache cleanup interval
  cacheCleanupInterval = setInterval(cleanupCache, CACHE_CLEANUP_INTERVAL);
  
  // DISABLED: Run initial reconciliation after a short delay
  // setTimeout(reconcileBatch, 30 * 1000); // 30 seconds after server startup
}

/**
 * Stop the periodic task reconciliation system
 */
export function stopPeriodicTaskReconciliation(): void {
  if (reconciliationInterval) {
    clearInterval(reconciliationInterval);
    reconciliationInterval = null;
  }
  
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
  }
  
  logger.child({ module: 'PeriodicTaskReconciliation' }).info('Periodic reconciliation system stopped', { 
    status: 'inactive'
  });
}

/**
 * Manually trigger reconciliation for specific task IDs
 * 
 * @param taskIds Array of task IDs to reconcile
 */
export async function triggerManualReconciliation(taskIds: number[]): Promise<void> {
  console.log(`[PeriodicTaskReconciliation] Manual reconciliation triggered for ${taskIds.length} tasks:`, taskIds);
  
  for (const taskId of taskIds) {
    try {
      await reconcileTaskProgress(taskId, { forceUpdate: true, debug: true });
      recentlyReconciledTasks.set(taskId, Date.now());
    } catch (error) {
      console.error(`[PeriodicTaskReconciliation] Error in manual reconciliation for task ${taskId}:`, error);
    }
  }
}
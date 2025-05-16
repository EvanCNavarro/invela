/**
 * Atomic Task Update Service
 * 
 * This service ensures that task status and progress are always updated together
 * in an atomic operation to prevent inconsistencies.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { TaskStatus } from '../../types/tasks';
import { logger } from '../utils/logger';

/**
 * Update task status and progress atomically
 * 
 * @param taskId - The ID of the task to update
 * @param status - The new status for the task
 * @param progress - The new progress value (0-100)
 * @param metadata - Optional metadata updates
 * @returns Promise<boolean> - Whether the update was successful
 */
export async function updateTaskStatusAndProgress(
  taskId: number,
  status: TaskStatus,
  progress: number,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    // Validate input
    if (!taskId || isNaN(taskId)) {
      logger.error('Invalid task ID provided for atomic update', { taskId });
      return false;
    }
    
    if (progress < 0 || progress > 100) {
      logger.error('Invalid progress value for atomic update', { progress });
      return false;
    }
    
    // Add validation for status transition
    if (status === 'submitted' && progress !== 100) {
      // Auto-correct progress for submitted tasks
      logger.warn('Fixing inconsistent status/progress: submitted but progress not 100%', { 
        taskId, 
        status,
        originalProgress: progress,
        fixedProgress: 100
      });
      progress = 100;
    }
    
    if (progress === 100 && status !== 'submitted') {
      // Auto-correct status for 100% progress
      logger.warn('Fixing inconsistent status/progress: 100% progress but status not submitted', { 
        taskId, 
        originalStatus: status,
        progress,
        fixedStatus: 'submitted'
      });
      status = 'submitted';
    }
    
    // Get current task state
    const [existingTask] = await db.select({
      id: tasks.id,
      status: tasks.status,
      progress: tasks.progress,
      metadata: tasks.metadata
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
    if (!existingTask) {
      logger.error('Task not found for atomic update', { taskId });
      return false;
    }
    
    // Prepare update object
    const now = new Date();
    const updateData: Record<string, any> = {
      status,
      progress,
      updated_at: now
    };
    
    // Set completion date if status is 'submitted'
    if (status === 'submitted') {
      updateData.completion_date = now;
    }
    
    // Prepare metadata updates
    let updatedMetadata = existingTask.metadata || {};
    
    if (metadata) {
      updatedMetadata = {
        ...updatedMetadata,
        ...metadata
      };
    }
    
    // Ensure required metadata for submitted tasks
    if (status === 'submitted') {
      updatedMetadata = {
        ...updatedMetadata,
        submitted: true,
        completed: true,
        submissionDate: updatedMetadata.submissionDate || now.toISOString(),
        submission_date: updatedMetadata.submission_date || now.toISOString(),
        lastUpdated: now.toISOString()
      };
    }
    
    updateData.metadata = updatedMetadata;
    
    // Perform the atomic update
    const updateResult = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId));
    
    // Log the update
    logger.info('Atomic task update successful', {
      taskId,
      status,
      progress,
      previousStatus: existingTask.status,
      previousProgress: existingTask.progress
    });
    
    return true;
  } catch (error) {
    logger.error('Error in atomic task update', { taskId, status, progress, error });
    return false;
  }
}

/**
 * Update task status to submitted and progress to 100% atomically
 * 
 * @param taskId - The ID of the task to mark as submitted
 * @param metadata - Optional metadata updates
 * @returns Promise<boolean> - Whether the update was successful
 */
export async function markTaskAsSubmitted(
  taskId: number,
  metadata?: Record<string, any>
): Promise<boolean> {
  return updateTaskStatusAndProgress(taskId, 'submitted', 100, metadata);
}

/**
 * Verify and fix task status/progress consistency if needed
 * 
 * @param taskId - The ID of the task to check and fix
 * @returns Promise<boolean> - Whether the task was fixed or is already consistent
 */
export async function verifyAndFixTaskConsistency(
  taskId: number
): Promise<boolean> {
  try {
    // Get current task state
    const [task] = await db.select({
      id: tasks.id,
      status: tasks.status, 
      progress: tasks.progress,
      metadata: tasks.metadata
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
    if (!task) {
      logger.error('Task not found for consistency check', { taskId });
      return false;
    }
    
    // Check for inconsistencies
    let needsFix = false;
    
    if (task.status === 'submitted' && task.progress !== 100) {
      logger.warn('Found inconsistent task: submitted but progress not 100%', { 
        taskId, 
        status: task.status,
        progress: task.progress 
      });
      needsFix = true;
    }
    
    if (task.progress === 100 && task.status !== 'submitted') {
      logger.warn('Found inconsistent task: 100% progress but status not submitted', { 
        taskId, 
        status: task.status,
        progress: task.progress 
      });
      needsFix = true;
    }
    
    if (needsFix) {
      // Fix the inconsistency
      return await markTaskAsSubmitted(taskId, task.metadata);
    }
    
    // No fix needed
    return true;
  } catch (error) {
    logger.error('Error in verify and fix task consistency', { taskId, error });
    return false;
  }
}
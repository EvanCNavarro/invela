/**
 * Atomic Task Update Utility
 * 
 * This utility ensures that task status and progress are always updated
 * atomically to prevent inconsistencies in the system.
 */

const { db } = require('@db');
const { tasks } = require('@db/schema');
const { eq } = require('drizzle-orm');
const { logger } = require('./logger');

/**
 * Update a task's status and progress atomically
 * 
 * @param {number} taskId - The ID of the task to update
 * @param {string} status - The new status for the task
 * @param {number} progress - The new progress value (0-100)
 * @param {object} [metadata] - Optional metadata to include in the update
 * @returns {Promise<boolean>} - Success status of the update
 */
async function updateTaskAtomically(taskId, status, progress, metadata = {}) {
  try {
    // Input validation
    if (!taskId || isNaN(taskId)) {
      logger.error('[Atomic Update] Invalid task ID provided', { taskId });
      return false;
    }
    
    // Enforce consistency rules
    if (status === 'submitted' && progress !== 100) {
      logger.warn('[Atomic Update] Auto-correcting progress to 100% for submitted status', {
        taskId,
        originalProgress: progress
      });
      progress = 100;
    }
    
    if (progress === 100 && status !== 'submitted') {
      logger.warn('[Atomic Update] Auto-correcting status to submitted for 100% progress', {
        taskId,
        originalStatus: status
      });
      status = 'submitted';
    }
    
    // Get current task to preserve existing data
    const [currentTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!currentTask) {
      logger.error('[Atomic Update] Task not found', { taskId });
      return false;
    }
    
    // Prepare update
    const now = new Date();
    const updateData = {
      status,
      progress,
      updated_at: now
    };
    
    // Set completion date for submitted tasks
    if (status === 'submitted') {
      updateData.completion_date = now;
    }
    
    // Merge metadata if provided
    if (metadata && Object.keys(metadata).length > 0) {
      updateData.metadata = {
        ...(currentTask.metadata || {}),
        ...metadata,
        lastUpdated: now.toISOString()
      };
      
      // Add submission metadata for submitted tasks
      if (status === 'submitted') {
        updateData.metadata.submitted = true;
        updateData.metadata.submissionDate = updateData.metadata.submissionDate || now.toISOString();
        updateData.metadata.submission_date = updateData.metadata.submission_date || now.toISOString();
        updateData.metadata.completed = true;
      }
    }
    
    // Perform the atomic update
    await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId));
    
    // Verify update
    const [updatedTask] = await db.select({
      id: tasks.id,
      status: tasks.status,
      progress: tasks.progress
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
    const success = 
      updatedTask.status === status && 
      updatedTask.progress === progress;
    
    if (!success) {
      logger.error('[Atomic Update] Verification failed - task state not updated correctly', {
        taskId,
        expected: { status, progress },
        actual: { status: updatedTask.status, progress: updatedTask.progress }
      });
      return false;
    }
    
    logger.info('[Atomic Update] Task successfully updated', {
      taskId,
      status,
      progress,
      previousStatus: currentTask.status,
      previousProgress: currentTask.progress
    });
    
    return true;
  } catch (error) {
    logger.error('[Atomic Update] Error updating task', {
      taskId,
      status,
      progress,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Mark a task as submitted
 * 
 * @param {number} taskId - The ID of the task to mark as submitted
 * @param {object} [metadata] - Optional metadata to include in the update
 * @returns {Promise<boolean>} - Success status of the update
 */
async function markTaskAsSubmitted(taskId, metadata = {}) {
  return updateTaskAtomically(taskId, 'submitted', 100, {
    ...metadata,
    submitted: true,
    completed: true,
    submissionDate: new Date().toISOString(),
    submission_date: new Date().toISOString()
  });
}

/**
 * Fix task status and progress inconsistencies
 * 
 * @param {number} taskId - The ID of the task to fix
 * @returns {Promise<boolean>} - Success status of the fix
 */
async function fixTaskConsistency(taskId) {
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
      logger.error('[Task Fix] Task not found', { taskId });
      return false;
    }
    
    // Check for inconsistencies
    let needsFix = false;
    let fixType = null;
    
    if (task.status === 'submitted' && task.progress !== 100) {
      needsFix = true;
      fixType = 'submitted_with_partial_progress';
    } else if (task.progress === 100 && task.status !== 'submitted') {
      needsFix = true;
      fixType = 'complete_progress_with_wrong_status';
    }
    
    if (needsFix) {
      logger.warn('[Task Fix] Found inconsistent task', {
        taskId,
        status: task.status,
        progress: task.progress,
        fixType
      });
      
      // Apply fix
      return await markTaskAsSubmitted(taskId, task.metadata);
    }
    
    // No fix needed
    logger.info('[Task Fix] Task is consistent', {
      taskId,
      status: task.status,
      progress: task.progress
    });
    
    return true;
  } catch (error) {
    logger.error('[Task Fix] Error checking task consistency', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

module.exports = {
  updateTaskAtomically,
  markTaskAsSubmitted,
  fixTaskConsistency
};
/**
 * Atomic Task Update Utility
 * 
 * This utility ensures that task status and progress are always updated atomically
 * to prevent inconsistencies where one might be updated without the other.
 */

const { db } = require('@db');
const { tasks } = require('@db/schema');
const { eq } = require('drizzle-orm');
const { logger } = require('./logger');

/**
 * Update a task's status and progress atomically in a single database operation
 * 
 * @param {number} taskId - The ID of the task to update
 * @param {string} status - The new status for the task
 * @param {number} progress - The new progress value (0-100)
 * @param {object} [options] - Additional options
 * @param {object} [options.metadata] - Optional metadata to include in the update
 * @param {boolean} [options.enforceConsistency=true] - Enforce consistency between status and progress
 * @param {boolean} [options.setCompletionDate=true] - Automatically set completion_date for submitted tasks
 * @param {string} [options.source] - Source of the update for logging purposes
 * @returns {Promise<{success: boolean, message?: string, updatedTask?: object}>}
 */
async function updateTaskStatusAndProgress(taskId, status, progress, options = {}) {
  const {
    metadata = {},
    enforceConsistency = true,
    setCompletionDate = true,
    source = 'atomic-update-util'
  } = options;
  
  logger.info('[AtomicUpdate] Starting atomic task update', {
    taskId,
    status,
    progress,
    source,
    hasMetadata: Object.keys(metadata).length > 0
  });
  
  try {
    // Input validation
    if (!taskId || isNaN(taskId)) {
      logger.error('[AtomicUpdate] Invalid task ID', { taskId, source });
      return { success: false, message: 'Invalid task ID' };
    }
    
    if (!status) {
      logger.error('[AtomicUpdate] Missing status', { taskId, source });
      return { success: false, message: 'Status is required' };
    }
    
    if (progress < 0 || progress > 100 || isNaN(progress)) {
      logger.error('[AtomicUpdate] Invalid progress value', { taskId, progress, source });
      return { success: false, message: 'Progress must be a number between 0 and 100' };
    }
    
    // Enforce consistency rules if enabled
    if (enforceConsistency) {
      const originalStatus = status;
      const originalProgress = progress;
      
      // Rule 1: 'submitted' status must have 100% progress
      if (status === 'submitted' && progress !== 100) {
        progress = 100;
        logger.warn('[AtomicUpdate] Auto-corrected progress to 100% for submitted status', { 
          taskId, 
          originalProgress,
          correctedProgress: progress,
          source
        });
      }
      
      // Rule 2: 100% progress should use 'submitted' status
      if (progress === 100 && status !== 'submitted') {
        status = 'submitted';
        logger.warn('[AtomicUpdate] Auto-corrected status to submitted for 100% progress', { 
          taskId, 
          originalStatus,
          correctedStatus: status,
          source
        });
      }
    }
    
    // Get current task to preserve existing data
    const [currentTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!currentTask) {
      logger.error('[AtomicUpdate] Task not found', { taskId, source });
      return { success: false, message: 'Task not found' };
    }
    
    // Prepare update data
    const now = new Date();
    const updateData = {
      status,
      progress,
      updated_at: now
    };
    
    // Set completion date for submitted tasks if enabled
    if (setCompletionDate && status === 'submitted') {
      updateData.completion_date = now;
    }
    
    // Merge metadata if provided
    if (Object.keys(metadata).length > 0) {
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
    
    // Log the update we're about to perform
    logger.info('[AtomicUpdate] Performing atomic update', {
      taskId,
      status,
      progress,
      metadata: Object.keys(updateData.metadata || {}),
      source
    });
    
    // Perform the atomic update in a single database operation
    await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId));
    
    // Verify the update
    const [updatedTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    // Check if update was successful
    const success = 
      updatedTask.status === status && 
      updatedTask.progress === progress;
    
    if (!success) {
      logger.error('[AtomicUpdate] Verification failed - task state not updated correctly', {
        taskId,
        expected: { status, progress },
        actual: { status: updatedTask.status, progress: updatedTask.progress },
        source
      });
      
      return { 
        success: false, 
        message: 'Update verification failed',
        updatedTask
      };
    }
    
    logger.info('[AtomicUpdate] Task successfully updated', {
      taskId,
      status,
      progress,
      previousStatus: currentTask.status,
      previousProgress: currentTask.progress,
      source
    });
    
    return { 
      success: true, 
      message: 'Task updated successfully',
      updatedTask
    };
  } catch (error) {
    logger.error('[AtomicUpdate] Error updating task', {
      taskId,
      status,
      progress,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      source
    });
    
    return { 
      success: false, 
      message: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Mark a task as submitted with 100% progress
 * 
 * @param {number} taskId - The ID of the task to mark as submitted
 * @param {object} [options] - Additional options
 * @param {object} [options.metadata] - Optional metadata to include
 * @param {string} [options.source] - Source of the update for logging
 * @returns {Promise<{success: boolean, message?: string, updatedTask?: object}>}
 */
async function markTaskAsSubmitted(taskId, options = {}) {
  const { metadata = {}, source = 'mark-as-submitted' } = options;
  
  // Always include submission-specific metadata
  const submissionMetadata = {
    ...metadata,
    submitted: true,
    completed: true,
    submissionDate: new Date().toISOString(),
    submission_date: new Date().toISOString()
  };
  
  return updateTaskStatusAndProgress(taskId, 'submitted', 100, {
    metadata: submissionMetadata,
    source
  });
}

/**
 * Check if a task has consistent status and progress
 * 
 * @param {number} taskId - The ID of the task to check
 * @returns {Promise<{consistent: boolean, task?: object, issues?: string[]}>}
 */
async function checkTaskConsistency(taskId) {
  try {
    // Get the task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return { consistent: false, issues: ['Task not found'] };
    }
    
    const issues = [];
    
    // Check for inconsistencies
    if (task.status === 'submitted' && task.progress !== 100) {
      issues.push(`Task has 'submitted' status but progress is ${task.progress}% (should be 100%)`);
    }
    
    if (task.progress === 100 && task.status !== 'submitted') {
      issues.push(`Task has 100% progress but status is '${task.status}' (should be 'submitted')`);
    }
    
    return {
      consistent: issues.length === 0,
      task,
      issues: issues.length > 0 ? issues : undefined
    };
  } catch (error) {
    logger.error('[AtomicUpdate] Error checking task consistency', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      consistent: false, 
      issues: [`Error checking consistency: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Fix inconsistencies in a task's status and progress
 * 
 * @param {number} taskId - The ID of the task to fix
 * @returns {Promise<{success: boolean, message?: string, fixed?: boolean}>}
 */
async function fixTaskConsistency(taskId) {
  try {
    logger.info('[AtomicUpdate] Starting task consistency check', { taskId });
    
    // Check if the task is consistent
    const check = await checkTaskConsistency(taskId);
    
    if (!check.task) {
      return { success: false, message: 'Task not found', fixed: false };
    }
    
    if (check.consistent) {
      logger.info('[AtomicUpdate] Task is already consistent', { 
        taskId,
        status: check.task.status,
        progress: check.task.progress
      });
      
      return { success: true, message: 'Task is already consistent', fixed: false };
    }
    
    // Fix the inconsistency
    logger.warn('[AtomicUpdate] Fixing inconsistent task', { 
      taskId,
      currentStatus: check.task.status,
      currentProgress: check.task.progress,
      issues: check.issues
    });
    
    // Determine the correct status and progress
    let targetStatus = check.task.status;
    let targetProgress = check.task.progress;
    
    if (check.task.status === 'submitted') {
      // Case 1: submitted but progress < 100
      targetProgress = 100;
    } else if (check.task.progress === 100) {
      // Case 2: 100% progress but not submitted
      targetStatus = 'submitted';
    }
    
    // Apply the fix
    const result = await updateTaskStatusAndProgress(taskId, targetStatus, targetProgress, {
      metadata: check.task.metadata,
      source: 'consistency-fix'
    });
    
    if (result.success) {
      logger.info('[AtomicUpdate] Successfully fixed task consistency', {
        taskId,
        newStatus: targetStatus,
        newProgress: targetProgress
      });
      
      return { success: true, message: 'Task consistency fixed', fixed: true };
    } else {
      logger.error('[AtomicUpdate] Failed to fix task consistency', {
        taskId,
        error: result.message
      });
      
      return { success: false, message: result.message, fixed: false };
    }
  } catch (error) {
    logger.error('[AtomicUpdate] Error fixing task consistency', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      message: `Error fixing consistency: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fixed: false
    };
  }
}

// Export functions for use in other modules
module.exports = {
  updateTaskStatusAndProgress,
  markTaskAsSubmitted,
  checkTaskConsistency,
  fixTaskConsistency
};
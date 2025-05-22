/**
 * Direct script to fix task status/progress inconsistencies
 * 
 * This script uses direct database access to ensure consistent status and progress
 * values for tasks. It fixes:
 * 1. Tasks with status="submitted" but progress < 100%
 * 2. Tasks with progress=100% but status != "submitted"
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastTaskUpdate } from './server/utils/unified-websocket';

// Add color to console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Fix a single task's status/progress inconsistency
 * 
 * @param {number} taskId - The ID of the task to fix
 * @returns {Promise<object>} Result object with success status and details
 */
async function fixTaskStatus(taskId) {
  log(`Fixing task status for task ${taskId}...`, colors.cyan);

  try {
    // 1. Get current task state
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      log(`Task with ID ${taskId} not found`, colors.red);
      return { 
        success: false, 
        error: `Task with ID ${taskId} not found` 
      };
    }

    log(`Current task state:`, colors.yellow);
    log(`  Status: ${task.status}`, colors.yellow);
    log(`  Progress: ${task.progress}%`, colors.yellow);

    // 2. Check for status/progress inconsistencies
    let needsUpdate = false;
    const now = new Date();
    let updatedStatus = task.status;
    let updatedProgress = task.progress;
    let updatedMetadata = task.metadata || {};

    // Check if task is submitted but progress is not 100%
    if (task.status === 'submitted' && task.progress !== 100) {
      updatedProgress = 100;
      needsUpdate = true;
      log(`Task is submitted but progress is not 100%`, colors.magenta);
      log(`Updating progress to 100%`, colors.magenta);
    }

    // Check if task is at 100% but not marked as submitted
    if (task.progress === 100 && task.status !== 'submitted') {
      updatedStatus = 'submitted';
      needsUpdate = true;
      log(`Task is at 100% but not marked as submitted`, colors.magenta);
      log(`Updating status to "submitted"`, colors.magenta);
    }

    // Update metadata if necessary
    if (needsUpdate) {
      // Ensure required metadata fields are set
      updatedMetadata = {
        ...updatedMetadata,
        submissionDate: updatedMetadata.submissionDate || now.toISOString(),
        submission_date: updatedMetadata.submission_date || now.toISOString(),
        submitted: true,
        completed: true,
        lastUpdated: now.toISOString()
      };

      // 3. Update the task with consistent values
      await db.update(tasks)
        .set({
          status: updatedStatus,
          progress: updatedProgress,
          completion_date: task.completion_date || now,
          updated_at: now,
          metadata: updatedMetadata
        })
        .where(eq(tasks.id, taskId));

      log(`Task updated successfully!`, colors.green);
      log(`  New Status: ${updatedStatus}`, colors.green);
      log(`  New Progress: ${updatedProgress}%`, colors.green);

      // 4. Broadcast update to connected clients
      try {
        await broadcastTaskUpdate({
          id: taskId,
          status: updatedStatus,
          progress: updatedProgress,
          metadata: {
            ...updatedMetadata,
            lastUpdated: now.toISOString()
          }
        });
        log(`Successfully broadcast task update to connected clients`, colors.green);
      } catch (broadcastError) {
        log(`Warning: Failed to broadcast update: ${broadcastError.message}`, colors.yellow);
        // Continue with success even if broadcast fails
      }

      return {
        success: true,
        message: 'Task status and progress synchronized successfully',
        task: {
          id: taskId,
          status: updatedStatus,
          progress: updatedProgress,
          metadata: updatedMetadata
        }
      };
    }

    // No updates needed
    log(`Task status and progress are already consistent`, colors.blue);
    return {
      success: true,
      message: 'Task status and progress are already consistent',
      task: {
        id: taskId,
        status: task.status,
        progress: task.progress,
        metadata: task.metadata
      }
    };
  } catch (error) {
    log(`Error fixing task status: ${error.message}`, colors.red);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, colors.red);
    }

    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Fix a batch of tasks with potential status/progress inconsistencies
 * 
 * @param {number[]} taskIds - Array of task IDs to fix
 * @returns {Promise<object[]>} Array of result objects for each task
 */
async function batchFixTasks(taskIds) {
  log(`Starting batch fix for ${taskIds.length} tasks...`, colors.cyan);
  
  const results = [];
  
  for (const taskId of taskIds) {
    const result = await fixTaskStatus(taskId);
    results.push({
      taskId,
      ...result
    });
  }
  
  log(`Batch fix complete. Fixed ${results.filter(r => r.success).length}/${taskIds.length} tasks.`, colors.green);
  
  return results;
}

/**
 * Main function to execute the task fix
 */
async function main() {
  try {
    // These are our known inconsistent tasks
    const tasksToFix = [883, 884];
    
    log('=====================================', colors.blue);
    log('🔧 Task Status/Progress Fix Utility', colors.blue);
    log('=====================================', colors.blue);
    
    // Run batch fix for both tasks
    const results = await batchFixTasks(tasksToFix);
    
    // Print summary
    log('\n📊 Results Summary:', colors.cyan);
    for (const result of results) {
      if (result.success) {
        if (result.message.includes('synchronized')) {
          log(`✓ Task ${result.taskId}: Fixed! Status=${result.task.status}, Progress=${result.task.progress}%`, colors.green);
        } else {
          log(`✓ Task ${result.taskId}: Already consistent (${result.task.status}, ${result.task.progress}%)`, colors.blue);
        }
      } else {
        log(`✗ Task ${result.taskId}: Error - ${result.error}`, colors.red);
      }
    }
    
    log('\nDone!', colors.green);
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  log(`Unhandled error: ${err.message}`, colors.red);
  process.exit(1);
});
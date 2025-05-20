/**
 * Direct script to fix task status/progress inconsistencies (CommonJS version)
 * 
 * This script uses a direct database access to ensure consistent status and progress
 * values for tasks. It fixes:
 * 1. Tasks with status="submitted" but progress < 100%
 * 2. Tasks with progress=100% but status != "submitted"
 */

const { Pool } = require('pg');
const { WebSocketServer } = require('ws');

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

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Fix a single task's status/progress inconsistency
 * 
 * @param {number} taskId - The ID of the task to fix
 * @returns {Promise<object>} Result object with success status and details
 */
async function fixTaskStatus(taskId) {
  log(`Fixing task status for task ${taskId}...`, colors.cyan);

  const client = await pool.connect();
  
  try {
    // 1. Get current task state
    const { rows } = await client.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );
    
    if (rows.length === 0) {
      log(`Task with ID ${taskId} not found`, colors.red);
      return { 
        success: false, 
        error: `Task with ID ${taskId} not found` 
      };
    }

    const task = rows[0];
    
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
      await client.query(
        `UPDATE tasks 
         SET status = $1, 
             progress = $2, 
             completion_date = COALESCE($3, $4),
             updated_at = $4,
             metadata = $5
         WHERE id = $6`,
        [
          updatedStatus,
          updatedProgress,
          task.completion_date,
          now,
          updatedMetadata,
          taskId
        ]
      );

      log(`Task updated successfully!`, colors.green);
      log(`  New Status: ${updatedStatus}`, colors.green);
      log(`  New Progress: ${updatedProgress}%`, colors.green);
      
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
  } finally {
    client.release();
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
 * Print a summary of task status
 */
async function checkTaskStatusInconsistencies() {
  const client = await pool.connect();
  
  try {
    log('Checking for task status/progress inconsistencies...', colors.cyan);
    
    // Find tasks with status = submitted but progress < 100
    const submittedNotComplete = await client.query(
      `SELECT id, title, status, progress, metadata
       FROM tasks 
       WHERE status = 'submitted' AND progress < 100
       ORDER BY id`
    );
    
    // Find tasks with progress = 100 but status != submitted
    const completeNotSubmitted = await client.query(
      `SELECT id, title, status, progress, metadata
       FROM tasks 
       WHERE progress = 100 AND status != 'submitted'
       ORDER BY id`
    );
    
    log('\n📊 Task Status Summary:', colors.blue);
    
    if (submittedNotComplete.rows.length === 0 && completeNotSubmitted.rows.length === 0) {
      log('✓ No task status inconsistencies found!', colors.green);
    } else {
      if (submittedNotComplete.rows.length > 0) {
        log(`\n${colors.yellow}Tasks with status='submitted' but progress < 100%:${colors.reset}`);
        submittedNotComplete.rows.forEach(task => {
          log(`  ⚠️ Task #${task.id}: "${task.title}" (status: ${task.status}, progress: ${task.progress}%)`, colors.yellow);
        });
      }
      
      if (completeNotSubmitted.rows.length > 0) {
        log(`\n${colors.yellow}Tasks with progress=100% but status != 'submitted':${colors.reset}`);
        completeNotSubmitted.rows.forEach(task => {
          log(`  ⚠️ Task #${task.id}: "${task.title}" (status: ${task.status}, progress: ${task.progress}%)`, colors.yellow);
        });
      }
      
      log(`\n${colors.cyan}Total: ${submittedNotComplete.rows.length + completeNotSubmitted.rows.length} inconsistent tasks found.${colors.reset}`);
    }
  } catch (error) {
    log(`Error checking task status: ${error.message}`, colors.red);
  } finally {
    client.release();
  }
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
    
    // Check for task status inconsistencies
    await checkTaskStatusInconsistencies();
    
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
    
    // Check again to verify fixes
    log('\nVerifying fixes...', colors.cyan);
    await checkTaskStatusInconsistencies();
    
    log('\nDone!', colors.green);
    
    // Close the database pool
    await pool.end();
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
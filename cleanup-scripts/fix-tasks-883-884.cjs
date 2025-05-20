/**
 * Fixed script to specifically fix tasks 883 and 884
 */

const { Pool } = require('pg');

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
 */
async function fixTask(taskId) {
  const client = await pool.connect();
  
  try {
    // Get current state
    const { rows } = await client.query(
      'SELECT id, title, status, progress, metadata FROM tasks WHERE id = $1',
      [taskId]
    );
    
    if (rows.length === 0) {
      log(`Task with ID ${taskId} not found`, colors.red);
      return false;
    }

    const task = rows[0];
    log(`\nTask #${taskId}: "${task.title}"`, colors.cyan);
    log(`Current Status: ${task.status}`, colors.yellow);
    log(`Current Progress: ${task.progress}%`, colors.yellow);
    
    // Determine what needs to be fixed
    const now = new Date();
    let updatedStatus = task.status;
    let updatedProgress = task.progress;
    let needsUpdate = false;
    
    // Fix submitted status with progress < 100
    if (task.status === 'submitted' && task.progress !== 100) {
      updatedProgress = 100;
      needsUpdate = true;
      log(`Task is marked as submitted but progress is not 100%`, colors.magenta);
      log(`Updating progress from ${task.progress}% to 100%`, colors.magenta);
    }
    
    // Fix 100% progress without submitted status
    if (task.progress === 100 && task.status !== 'submitted') {
      updatedStatus = 'submitted';
      needsUpdate = true;
      log(`Task is at 100% but not marked as submitted`, colors.magenta);
      log(`Updating status from "${task.status}" to "submitted"`, colors.magenta);
    }
    
    if (needsUpdate) {
      // Make sure metadata is updated properly
      let metadata = task.metadata || {};
      metadata = {
        ...metadata,
        submissionDate: metadata.submissionDate || now.toISOString(),
        submission_date: metadata.submission_date || now.toISOString(), 
        submitted: true,
        completed: true,
        lastUpdated: now.toISOString()
      };
      
      // Update the task
      await client.query(
        `UPDATE tasks 
         SET status = $1, 
             progress = $2, 
             completion_date = COALESCE(completion_date, $3),
             updated_at = $3,
             metadata = $4
         WHERE id = $5`,
        [
          updatedStatus,
          updatedProgress,
          now,
          metadata,
          taskId
        ]
      );
      
      log(`✓ Task #${taskId} fixed successfully!`, colors.green);
      return true;
    } else {
      log(`Task #${taskId} already has consistent values`, colors.blue);
      return false;
    }
  } catch (error) {
    log(`Error fixing task #${taskId}: ${error.message}`, colors.red);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Main function to fix our two specific tasks
 */
async function main() {
  log('======================================', colors.blue);
  log('🔧 Fixing Tasks 883 and 884', colors.blue);
  log('======================================', colors.blue);
  
  try {
    const task883Result = await fixTask(883);
    const task884Result = await fixTask(884);
    
    // Display summary
    log('\n📋 Summary:', colors.cyan);
    log(`Task #883: ${task883Result ? 'Fixed ✓' : 'No changes needed'}`, task883Result ? colors.green : colors.blue);
    log(`Task #884: ${task884Result ? 'Fixed ✓' : 'No changes needed'}`, task884Result ? colors.green : colors.blue);
    
    // Check the tasks after fixing
    log('\n🔍 Verifying fixes...', colors.cyan);
    const client = await pool.connect();
    
    try {
      const { rows } = await client.query(
        'SELECT id, title, status, progress FROM tasks WHERE id IN (883, 884)',
        []
      );
      
      for (const task of rows) {
        log(`Task #${task.id}: status="${task.status}", progress=${task.progress}%`, 
          (task.status === 'submitted' && task.progress === 100) ? colors.green : colors.red);
      }
    } finally {
      client.release();
    }
    
    log('\nAll done!', colors.green);
  } catch (error) {
    log(`Fatal error: ${error.message}`, colors.red);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  log(`Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
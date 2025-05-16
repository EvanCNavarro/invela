/**
 * Script to fix all inconsistent task status/progress relationships
 * 
 * This script identifies and fixes two types of inconsistencies:
 * 1. Tasks with status="submitted" but progress < 100%
 * 2. Tasks with progress=100% but status != "submitted"
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
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Fix inconsistent tasks
 * 
 * @param {Array<number>} taskIds - Array of task IDs to fix
 * @param {boolean} dryRun - If true, only simulate fixes without making changes
 * @returns {Promise<Array>} Results of fix operations
 */
async function fixInconsistentTasks(taskIds, dryRun = false) {
  const client = await pool.connect();
  const results = [];
  
  try {
    for (const taskId of taskIds) {
      try {
        // Get current state
        const { rows } = await client.query(
          'SELECT id, title, status, progress, metadata, completion_date FROM tasks WHERE id = $1',
          [taskId]
        );
        
        if (rows.length === 0) {
          results.push({
            taskId,
            success: false,
            error: `Task with ID ${taskId} not found`
          });
          continue;
        }

        const task = rows[0];
        
        // Determine what needs to be fixed
        const now = new Date();
        let updatedStatus = task.status;
        let updatedProgress = task.progress;
        let needsUpdate = false;
        let updateType = null;
        
        // Fix submitted status with progress < 100
        if (task.status === 'submitted' && task.progress !== 100) {
          updatedProgress = 100;
          needsUpdate = true;
          updateType = 'progress_updated';
        }
        
        // Fix 100% progress without submitted status
        if (task.progress === 100 && task.status !== 'submitted') {
          updatedStatus = 'submitted';
          needsUpdate = true;
          updateType = 'status_updated';
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
          
          if (!dryRun) {
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
          }
          
          results.push({
            taskId,
            title: task.title,
            success: true,
            updated: true,
            updateType,
            previous: {
              status: task.status,
              progress: task.progress
            },
            current: {
              status: updatedStatus,
              progress: updatedProgress
            },
            dryRun
          });
        } else {
          results.push({
            taskId,
            title: task.title,
            success: true,
            updated: false,
            status: task.status,
            progress: task.progress
          });
        }
      } catch (error) {
        results.push({
          taskId,
          success: false,
          error: error.message
        });
      }
    }
  } finally {
    client.release();
  }
  
  return results;
}

/**
 * Find all inconsistent tasks in the system
 * 
 * @returns {Promise<{submittedNotComplete: Array, completeNotSubmitted: Array}>}
 */
async function findInconsistentTasks() {
  const client = await pool.connect();
  
  try {
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
    
    return {
      submittedNotComplete: submittedNotComplete.rows,
      completeNotSubmitted: completeNotSubmitted.rows
    };
  } finally {
    client.release();
  }
}

/**
 * Print fix results in a readable format
 */
function printFixResults(results) {
  // Group by update type
  const updated = results.filter(r => r.success && r.updated);
  const notUpdated = results.filter(r => r.success && !r.updated);
  const failed = results.filter(r => !r.success);
  
  // Group updated tasks by update type
  const progressUpdated = updated.filter(r => r.updateType === 'progress_updated');
  const statusUpdated = updated.filter(r => r.updateType === 'status_updated');
  
  log('\n📊 Fix Results Summary:', colors.bold + colors.cyan);
  log(`  Total tasks processed: ${results.length}`, colors.cyan);
  log(`  Successfully updated: ${updated.length}`, colors.green);
  log(`  Already consistent: ${notUpdated.length}`, colors.blue);
  log(`  Failed to process: ${failed.length}`, colors.red);
  
  if (updated.length > 0) {
    log(`\n✅ Updated Task Breakdown:`, colors.bold + colors.green);
    log(`  Progress updated (submitted → 100%): ${progressUpdated.length}`, colors.green);
    log(`  Status updated (100% → submitted): ${statusUpdated.length}`, colors.green);
    
    if (progressUpdated.length > 0) {
      log(`\n🔄 Tasks with progress updated to 100%:`, colors.yellow);
      progressUpdated.forEach((result, i) => {
        log(`  ${i+1}. Task #${result.taskId}: "${result.title.substring(0, 50)}${result.title.length > 50 ? '...' : ''}"`, colors.yellow);
        log(`     Status: ${result.previous.status} (unchanged)`, colors.yellow);
        log(`     Progress: ${result.previous.progress}% → 100%`, colors.yellow);
      });
    }
    
    if (statusUpdated.length > 0) {
      log(`\n🔄 Tasks with status updated to "submitted":`, colors.yellow);
      statusUpdated.forEach((result, i) => {
        log(`  ${i+1}. Task #${result.taskId}: "${result.title.substring(0, 50)}${result.title.length > 50 ? '...' : ''}"`, colors.yellow);
        log(`     Status: ${result.previous.status} → submitted`, colors.yellow);
        log(`     Progress: 100% (unchanged)`, colors.yellow);
      });
    }
  }
  
  if (failed.length > 0) {
    log(`\n❌ Failed Updates:`, colors.bold + colors.red);
    failed.forEach((result, i) => {
      log(`  ${i+1}. Task #${result.taskId}: ${result.error}`, colors.red);
    });
  }
}

/**
 * Main function
 */
async function main() {
  log('=============================================', colors.blue);
  log('🔧 Task Status/Progress Consistency Fixer', colors.bold + colors.blue);
  log('=============================================', colors.blue);
  
  try {
    // Find all inconsistent tasks
    log('\nIdentifying inconsistent tasks...', colors.cyan);
    const { submittedNotComplete, completeNotSubmitted } = await findInconsistentTasks();
    
    const totalInconsistent = submittedNotComplete.length + completeNotSubmitted.length;
    
    if (totalInconsistent === 0) {
      log('\n✅ No inconsistent tasks found in the system!', colors.green);
      return;
    }
    
    log(`\nFound ${totalInconsistent} tasks with inconsistent status/progress values:`, colors.cyan);
    log(`- ${submittedNotComplete.length} tasks with status="submitted" but progress < 100%`, colors.yellow);
    log(`- ${completeNotSubmitted.length} tasks with progress=100% but status != "submitted"`, colors.yellow);
    
    // Combine all inconsistent task IDs
    const allTaskIds = [
      ...submittedNotComplete.map(t => t.id),
      ...completeNotSubmitted.map(t => t.id)
    ];
    
    // Perform a dry run first (simulation)
    log('\nPerforming simulation (dry run)...', colors.cyan);
    const dryRunResults = await fixInconsistentTasks(allTaskIds, true);
    printFixResults(dryRunResults);
    
    // Ask for confirmation before proceeding
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirm = await new Promise(resolve => {
      readline.question(`\n${colors.bold}Do you want to proceed with fixing all ${totalInconsistent} tasks? (y/n): ${colors.reset}`, answer => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        readline.close();
      });
    });
    
    if (!confirm) {
      log('\nOperation cancelled. No changes were made.', colors.yellow);
      return;
    }
    
    // Perform the actual fix
    log('\nProceeding with task fixes...', colors.cyan);
    const fixResults = await fixInconsistentTasks(allTaskIds, false);
    
    log('\n🎉 Task fix operations completed!', colors.bold + colors.green);
    printFixResults(fixResults);
    
    // Verify all tasks are now consistent
    const { submittedNotComplete: remaining1, completeNotSubmitted: remaining2 } = await findInconsistentTasks();
    const totalRemaining = remaining1.length + remaining2.length;
    
    if (totalRemaining === 0) {
      log('\n✅ Verification complete: All tasks are now consistent!', colors.bold + colors.green);
    } else {
      log(`\n⚠️ Verification warning: ${totalRemaining} tasks still have inconsistencies:`, colors.bold + colors.yellow);
      log(`- ${remaining1.length} tasks with status="submitted" but progress < 100%`, colors.yellow);
      log(`- ${remaining2.length} tasks with progress=100% but status != "submitted"`, colors.yellow);
    }
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    if (error.stack) {
      log(`\nStack trace: ${error.stack}`, colors.red);
    }
  } finally {
    await pool.end();
  }
  
  log('\nDone!', colors.green);
}

// Run the script
main().catch(error => {
  log(`Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
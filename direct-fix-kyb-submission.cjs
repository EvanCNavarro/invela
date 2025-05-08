/**
 * Direct Fix for KYB Form Submission
 * 
 * This script updates the KYB form task status to 'submitted'
 * and sets the appropriate metadata fields.
 */

const { Pool } = require('pg');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Fix the KYB form submission status
 */
async function fixKybSubmission(taskId, companyId) {
  const client = await pool.connect();
  
  try {
    console.log(`Examining KYB task ${taskId} for company ${companyId}...`);
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check the current state of the task
    const { rows: [task] } = await client.query(
      `SELECT id, title, status, progress, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (!task) {
      console.error(`${colors.red}Task ${taskId} not found!${colors.reset}`);
      return;
    }
    
    console.log(`Current task state:`);
    console.log(`- ID: ${task.id}`);
    console.log(`- Title: ${task.title}`);
    console.log(`- Status: ${task.status}`);
    console.log(`- Progress: ${task.progress}%`);
    
    // Update the task status to 'submitted'
    const metadata = task.metadata || {};
    metadata.submitted = true;
    metadata.submittedAt = new Date().toISOString();
    metadata.submissionDate = new Date().toISOString();
    
    if (task.status === 'ready_for_submission' && task.progress === 100) {
      console.log(`${colors.yellow}Task is ready for submission, updating status...${colors.reset}`);
      
      const { rows: [updatedTask] } = await client.query(
        `UPDATE tasks 
         SET status = 'submitted',
             metadata = $1
         WHERE id = $2
         RETURNING id, status, progress, metadata`,
        [metadata, taskId]
      );
      
      console.log(`${colors.green}✅ Task status updated to 'submitted'!${colors.reset}`);
      console.log(`Updated task state:`);
      console.log(`- ID: ${updatedTask.id}`);
      console.log(`- Status: ${updatedTask.status}`);
      console.log(`- Progress: ${updatedTask.progress}%`);
      
      // Broadcast the task update via WebSocket
      await broadcastTaskUpdate(client, taskId, companyId);
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log(`${colors.green}✅ Transaction committed!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Task is not in the expected state for submission.${colors.reset}`);
      console.log(`Expected: status='ready_for_submission', progress=100`);
      console.log(`Actual: status='${task.status}', progress=${task.progress}`);
      
      // Rollback the transaction
      await client.query('ROLLBACK');
      console.log(`Transaction rolled back`);
    }
    
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error(`${colors.red}Error fixing KYB submission:${colors.reset}`, error);
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

/**
 * Broadcast the task update via WebSocket
 */
async function broadcastTaskUpdate(client, taskId, companyId) {
  try {
    console.log(`${colors.blue}Broadcasting task update...${colors.reset}`);
    
    // Insert a broadcast message in the websocket_messages table
    const message = {
      type: 'task_update',
      payload: {
        taskId: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          submitted: true,
          submittedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    };
    
    await client.query(
      `INSERT INTO websocket_messages (type, message, created_at)
       VALUES ($1, $2, NOW())`,
      ['task_update', JSON.stringify(message)]
    );
    
    console.log(`${colors.green}✅ WebSocket broadcast message inserted!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error broadcasting task update:${colors.reset}`, error);
    throw error;
  }
}

// If this script is run directly, execute the fix function with the provided task ID
if (require.main === module) {
  const taskId = process.argv[2];
  const companyId = process.argv[3];
  
  if (!taskId || !companyId) {
    console.error(`${colors.red}Usage: node direct-fix-kyb-submission.cjs <taskId> <companyId>${colors.reset}`);
    process.exit(1);
  }
  
  fixKybSubmission(parseInt(taskId), parseInt(companyId))
    .then(() => {
      console.log(`${colors.green}✅ Fix completed!${colors.reset}`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`${colors.red}Error:${colors.reset}`, error);
      process.exit(1);
    });
}
/**
 * Fix for KYB Form Submission
 * 
 * This script updates the KYB form task status to 'submitted'
 * and broadcasts the update via WebSocket.
 */

const { Pool } = require('pg');
const http = require('http');
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
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`Current task state:`);
    console.log(`- ID: ${task.id}`);
    console.log(`- Title: ${task.title}`);
    console.log(`- Status: ${task.status}`);
    console.log(`- Progress: ${task.progress}%`);
    
    // Update the task status to 'submitted'
    let metadata = task.metadata || {};
    metadata.submitted = true;
    metadata.submittedAt = new Date().toISOString();
    metadata.submissionDate = new Date().toISOString();
    
    // Make sure metadata is converted to a proper object if it's not already
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        metadata = {};
      }
    }
    
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
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log(`${colors.green}✅ Transaction committed!${colors.reset}`);
      
      // Broadcast the update to WebSocket clients
      await broadcastTaskUpdate(taskId, companyId);
      
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
 * Broadcast the task update via WebSocket API
 */
async function broadcastTaskUpdate(taskId, companyId) {
  try {
    console.log(`${colors.blue}Broadcasting task update via API...${colors.reset}`);
    
    // Create the payload for the WebSocket broadcast
    const payload = {
      status: 'submitted',
      progress: 100,
      taskId: taskId,
      companyId: companyId
    };
    
    // Make a POST request to the broadcast task update endpoint
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      path: `/api/tasks/${taskId}/broadcast`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Send the broadcast request
    const req = http.request(options, (res) => {
      console.log(`${colors.blue}Broadcast response status: ${res.statusCode}${colors.reset}`);
      
      res.on('data', (chunk) => {
        console.log(`${colors.green}Response: ${chunk}${colors.reset}`);
      });
    });
    
    req.on('error', (error) => {
      console.error(`${colors.red}Error broadcasting task update:${colors.reset}`, error);
    });
    
    req.write(JSON.stringify(payload));
    req.end();
    
    // Use the existing WebSocket implementation to broadcast
    const wsMessage = {
      type: 'task_update',
      payload: {
        id: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          submitted: true,
          submittedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    };
    
    // If we don't want to use the API, we can try direct system calls
    const { spawn } = require('child_process');
    const node = spawn('node', [
      'broadcast-task-update.js',
      taskId,
      'submitted',
      '100',
      `{"submitted":true,"timestamp":"${new Date().toISOString()}"}`
    ]);
    
    node.stdout.on('data', (data) => {
      console.log(`${colors.green}Broadcast output: ${data}${colors.reset}`);
    });
    
    node.stderr.on('data', (data) => {
      console.error(`${colors.red}Broadcast error: ${data}${colors.reset}`);
    });
    
    console.log(`${colors.green}✅ WebSocket broadcast message sent!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error broadcasting task update:${colors.reset}`, error);
  }
}

// If this script is run directly, execute the fix function with the provided task ID
if (require.main === module) {
  const taskId = process.argv[2];
  const companyId = process.argv[3];
  
  if (!taskId || !companyId) {
    console.error(`${colors.red}Usage: node fix-kyb-submission.cjs <taskId> <companyId>${colors.reset}`);
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
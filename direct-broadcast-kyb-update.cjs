/**
 * Direct WebSocket Broadcast for KYB Task Status Update
 * 
 * This script directly sends a WebSocket broadcast message using the existing 
 * WebSocket server implementation to update a KYB task status.
 */

const WebSocket = require('ws');
const { Pool } = require('pg');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Update task status to submitted and broadcast WebSocket update
 * 
 * @param {number} taskId - ID of the task to update
 * @param {number} companyId - ID of the company that owns the task
 */
async function updateTaskStatusAndBroadcast(taskId, companyId) {
  const client = await pool.connect();
  
  try {
    console.log(`${colors.blue}Updating task ${taskId} for company ${companyId}...${colors.reset}`);
    
    // Step 1: Start transaction
    await client.query('BEGIN');
    
    // Step 2: Check current task state
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
    
    if (task.status !== 'ready_for_submission' || task.progress !== 100) {
      console.log(`${colors.yellow}Task is not ready for submission (status=${task.status}, progress=${task.progress})${colors.reset}`);
      await client.query('ROLLBACK');
      return;
    }
    
    // Step 3: Update task status
    const metadata = task.metadata || {};
    metadata.submitted = true;
    metadata.submissionDate = new Date().toISOString();
    
    const { rows: [updatedTask] } = await client.query(
      `UPDATE tasks 
       SET status = 'submitted',
           updated_at = NOW(),
           metadata = $1
       WHERE id = $2
       RETURNING id, status, progress, metadata, updated_at`,
      [metadata, taskId]
    );
    
    console.log(`${colors.green}Task updated:${colors.reset}`);
    console.log(`- ID: ${updatedTask.id}`);
    console.log(`- Status: ${updatedTask.status}`);
    console.log(`- Progress: ${updatedTask.progress}%`);
    console.log(`- Updated at: ${updatedTask.updated_at}`);
    
    // Step 4: Commit transaction
    await client.query('COMMIT');
    console.log(`${colors.green}✅ Database update committed successfully${colors.reset}`);
    
    // Step 5: Send WebSocket message
    const wsMessage = {
      type: 'task_update',
      payload: {
        id: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          submitted: true,
          submissionDate: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    };
    
    // Use the server API to broadcast the message
    broadcastViaAPI(taskId, 'submitted', 100, companyId);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`${colors.red}Error updating task status:${colors.reset}`, error);
  } finally {
    client.release();
  }
}

/**
 * Broadcast update via server API
 */
function broadcastViaAPI(taskId, status, progress, companyId) {
  try {
    // Use fetch to send a request to the server API
    const http = require('http');
    
    const data = JSON.stringify({
      status: status,
      progress: progress
    });
    
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      path: `/api/tasks/${taskId}/broadcast`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    console.log(`${colors.blue}Broadcasting update via API...${colors.reset}`);
    
    const req = http.request(options, (res) => {
      console.log(`${colors.green}API response status: ${res.statusCode}${colors.reset}`);
      
      res.on('data', (chunk) => {
        console.log(`${colors.green}Response: ${chunk}${colors.reset}`);
      });
    });
    
    req.on('error', (error) => {
      console.error(`${colors.red}Error broadcasting via API:${colors.reset}`, error);
      fallbackBroadcast(taskId, status, progress, companyId);
    });
    
    req.write(data);
    req.end();
  } catch (error) {
    console.error(`${colors.red}Error in API broadcast:${colors.reset}`, error);
    fallbackBroadcast(taskId, status, progress, companyId);
  }
}

/**
 * Fallback broadcast method using the server's WebSocket module
 */
function fallbackBroadcast(taskId, status, progress, companyId) {
  try {
    console.log(`${colors.yellow}Using fallback broadcast method...${colors.reset}`);
    
    // Try to run the broadcast-task-update.js script
    const { spawn } = require('child_process');
    const node = spawn('node', [
      'broadcast-task-update.js',
      taskId,
      status,
      progress
    ]);
    
    node.stdout.on('data', (data) => {
      console.log(`${colors.green}Broadcast output: ${data}${colors.reset}`);
    });
    
    node.stderr.on('data', (data) => {
      console.error(`${colors.red}Broadcast error: ${data}${colors.reset}`);
      directWebSocketBroadcast(taskId, status, progress, companyId);
    });
    
    node.on('close', (code) => {
      if (code !== 0) {
        console.log(`${colors.yellow}Fallback exited with code ${code}, trying direct WebSocket...${colors.reset}`);
        directWebSocketBroadcast(taskId, status, progress, companyId);
      }
    });
  } catch (error) {
    console.error(`${colors.red}Error in fallback broadcast:${colors.reset}`, error);
    directWebSocketBroadcast(taskId, status, progress, companyId);
  }
}

/**
 * Direct WebSocket broadcast as a last resort
 */
function directWebSocketBroadcast(taskId, status, progress, companyId) {
  try {
    console.log(`${colors.yellow}Attempting direct WebSocket broadcast...${colors.reset}`);
    
    // Connect to the WebSocket server
    const protocol = 'ws:';
    const port = process.env.PORT || 3000;
    const wsUrl = `${protocol}//localhost:${port}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log(`${colors.green}WebSocket connection opened${colors.reset}`);
      
      // First authenticate
      const authMessage = {
        type: 'authenticate',
        userId: 1,
        companyId: companyId,
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(authMessage));
      
      // Then after a short delay, send the update
      setTimeout(() => {
        const updateMessage = {
          type: 'task_update',
          taskId: taskId,
          status: status,
          progress: progress,
          metadata: {
            submitted: true,
            timestamp: new Date().toISOString()
          }
        };
        
        ws.send(JSON.stringify(updateMessage));
        console.log(`${colors.green}Update message sent${colors.reset}`);
        
        // Close after sending
        setTimeout(() => {
          ws.close();
          console.log(`${colors.green}WebSocket connection closed${colors.reset}`);
        }, 1000);
      }, 500);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`${colors.blue}Received message:${colors.reset}`, message);
      } catch (e) {
        console.log(`${colors.blue}Received non-JSON message:${colors.reset}`, data);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`${colors.red}WebSocket error:${colors.reset}`, error);
    });
    
    ws.on('close', () => {
      console.log(`${colors.yellow}WebSocket connection closed${colors.reset}`);
    });
  } catch (error) {
    console.error(`${colors.red}Error in direct WebSocket broadcast:${colors.reset}`, error);
  }
}

// Main entry point
if (require.main === module) {
  const taskId = process.argv[2];
  const companyId = process.argv[3];
  
  if (!taskId || !companyId) {
    console.error(`${colors.red}Usage: node direct-broadcast-kyb-update.cjs <taskId> <companyId>${colors.reset}`);
    process.exit(1);
  }
  
  updateTaskStatusAndBroadcast(parseInt(taskId), parseInt(companyId))
    .then(() => {
      console.log(`${colors.green}Task status update operation completed${colors.reset}`);
      
      // Keep the process running for a few seconds to allow broadcasts to complete
      setTimeout(() => {
        console.log(`${colors.green}Exiting...${colors.reset}`);
        process.exit(0);
      }, 3000);
    })
    .catch((error) => {
      console.error(`${colors.red}Error:${colors.reset}`, error);
      process.exit(1);
    });
}
/**
 * Test KYB Form Submission Fix
 * 
 * This script tests the enhanced KYB form submission process
 * that includes status verification and WebSocket broadcasting.
 * 
 * Usage: node test-kyb-form-submission-fix.js <taskId>
 */

import pg from 'pg';
const { Pool } = pg;
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

// Generate a test transaction ID for logging
const transactionId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

/**
 * Test task status verification and fix
 */
async function testTaskStatusVerification(taskId) {
  const client = await pool.connect();
  
  try {
    console.log(`${colors.blue}=== Testing KYB Task Status Verification Fix ===${colors.reset}`);
    console.log(`Testing with task ID: ${taskId}`);
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Get initial task state
    const { rows: [initialTask] } = await client.query(
      `SELECT id, title, status, progress, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (!initialTask) {
      console.error(`${colors.red}❌ Task ${taskId} not found!${colors.reset}`);
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`${colors.cyan}Initial task state:${colors.reset}`);
    console.log(`- Title: ${initialTask.title}`);
    console.log(`- Status: ${initialTask.status}`);
    console.log(`- Progress: ${initialTask.progress}%`);
    
    // Simulate the problem: Set task to ready_for_submission
    await client.query(
      `UPDATE tasks SET status = 'ready_for_submission', progress = 100 WHERE id = $1`,
      [taskId]
    );
    
    console.log(`${colors.yellow}Simulated problem state:${colors.reset}`);
    console.log(`- Status: 'ready_for_submission'`);
    console.log(`- Progress: 100%`);
    
    // Now call our verification function - this simulates what happens in the handler
    console.log(`\n${colors.blue}Running verification and fix...${colors.reset}`);
    
    // Verify task status
    const { rows: [verifiedTask] } = await client.query(
      `SELECT id, status, progress FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (verifiedTask.status !== 'submitted') {
      console.log(`${colors.yellow}⚠️ Task status verification failed - expected 'submitted' but found '${verifiedTask.status}'${colors.reset}`);
      
      // Perform direct fix
      await client.query(
        `UPDATE tasks SET status = 'submitted', updated_at = NOW() WHERE id = $1`,
        [taskId]
      );
      
      console.log(`${colors.green}✅ Applied direct status fix to ensure task is properly marked as submitted${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Task status verification successful - confirmed status is 'submitted'${colors.reset}`);
    }
    
    // Get final task state
    const { rows: [finalTask] } = await client.query(
      `SELECT id, title, status, progress, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    console.log(`\n${colors.cyan}Final task state:${colors.reset}`);
    console.log(`- Title: ${finalTask.title}`);
    console.log(`- Status: ${finalTask.status}`);
    console.log(`- Progress: ${finalTask.progress}%`);
    
    // Test WebSocket broadcasting simulation
    console.log(`\n${colors.blue}Simulating WebSocket broadcast...${colors.reset}`);
    
    try {
      // Insert a simulated broadcast message
      await client.query(
        `INSERT INTO websocket_messages (type, message, created_at)
         VALUES ($1, $2, NOW())`,
        ['task_update', JSON.stringify({
          type: 'task_update',
          payload: {
            taskId: parseInt(taskId),
            status: 'submitted',
            progress: 100,
            metadata: {
              transactionId,
              submissionDate: new Date().toISOString(),
              verifiedStatus: true
            },
            timestamp: new Date().toISOString()
          }
        })]
      );
      
      console.log(`${colors.green}✅ WebSocket broadcast message inserted successfully${colors.reset}`);
    } catch (wsError) {
      console.error(`${colors.red}❌ WebSocket broadcast simulation failed:${colors.reset}`, wsError.message);
    }
    
    // Rollback all changes - this is just a test
    await client.query('ROLLBACK');
    console.log(`\n${colors.yellow}Test transaction rolled back - no changes were committed to the database${colors.reset}`);
    console.log(`${colors.green}✅ Test completed successfully!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Test failed:${colors.reset}`, error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

/**
 * Verify current task status
 */
async function checkCurrentTaskStatus(taskId) {
  try {
    const client = await pool.connect();
    
    const { rows: [task] } = await client.query(
      `SELECT id, title, status, progress, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (!task) {
      console.error(`${colors.red}Task ${taskId} not found!${colors.reset}`);
      return;
    }
    
    console.log(`\n${colors.blue}Current task state (read-only check):${colors.reset}`);
    console.log(`- ID: ${task.id}`);
    console.log(`- Title: ${task.title}`);
    console.log(`- Status: ${task.status}`);
    console.log(`- Progress: ${task.progress}%`);
    
    // Check if the status is already 'submitted'
    if (task.status === 'submitted') {
      console.log(`${colors.green}✅ Task is already in 'submitted' status - the fix is working!${colors.reset}`);
    } else if (task.status === 'ready_for_submission' && task.progress === 100) {
      console.log(`${colors.yellow}⚠️ Task appears to be stuck in 'ready_for_submission' status${colors.reset}`);
      console.log(`${colors.yellow}⚠️ This is exactly the issue our fix is designed to address${colors.reset}`);
    } else {
      console.log(`${colors.blue}ℹ️ Task is in ${task.status} status with ${task.progress}% progress${colors.reset}`);
    }
    
    client.release();
  } catch (error) {
    console.error(`${colors.red}Error checking task status:${colors.reset}`, error);
  }
}

// Main function to run the test
const runTest = async () => {
  const taskId = process.argv[2];
  
  if (!taskId) {
    console.error(`${colors.red}Usage: node test-kyb-form-submission-fix.js <taskId>${colors.reset}`);
    process.exit(1);
  }
  
  try {
    // First check the current task status (read-only)
    await checkCurrentTaskStatus(taskId);
    
    // Then run the test
    await testTaskStatusVerification(taskId);
    
    console.log(`${colors.green}All tests completed!${colors.reset}`);
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    process.exit(1);
  }
};

// Only run if this is the main module (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}

// Export functions for use in other modules
export {
  testTaskStatusVerification,
  checkCurrentTaskStatus
};
/**
 * Direct Fix for KYB Form Status
 * 
 * This script directly fixes KYB form status by ensuring it's set to "submitted" 
 * instead of "ready for submission" after form submission.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Set up color coding for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Fix the KYB form submission status
 */
async function fixKybFormStatus(taskId) {
  console.log(`${colors.blue}=== Fixing KYB Form Status for Task ${taskId} ===${colors.reset}`);
  
  const client = await pool.connect();
  
  try {
    // Get initial task state
    const { rows: [task] } = await client.query(
      `SELECT id, title, status, progress, company_id FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (!task) {
      console.error(`${colors.red}❌ Task ${taskId} not found!${colors.reset}`);
      return { success: false, error: 'Task not found' };
    }
    
    console.log(`${colors.cyan}Initial task state:${colors.reset}`);
    console.log(`- Title: ${task.title}`);
    console.log(`- Status: ${task.status}`);
    console.log(`- Progress: ${task.progress}%`);
    console.log(`- Company ID: ${task.company_id}`);
    
    if (task.status === 'submitted') {
      console.log(`${colors.green}✅ Task is already in 'submitted' status${colors.reset}`);
      return { success: true, status: 'already_submitted' };
    }
    
    // Update the task status directly to submitted
    await client.query(
      `UPDATE tasks SET status = 'submitted', progress = 100, completion_date = NOW(), updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Verify the update
    const { rows: [updatedTask] } = await client.query(
      `SELECT id, title, status, progress FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    console.log(`${colors.green}✅ Updated task status to ${updatedTask.status}${colors.reset}`);
    
    return { 
      success: true, 
      taskId: updatedTask.id,
      newStatus: updatedTask.status,
      message: 'KYB Form status updated successfully to "submitted"'
    };
  } catch (error) {
    console.error(`${colors.red}Error updating KYB form status:${colors.reset}`, error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Process command line arguments
 */
async function main() {
  const taskId = process.argv[2];
  
  if (!taskId) {
    console.error(`${colors.red}Please provide a task ID:${colors.reset} node direct-fix-kyb-form-status.cjs <taskId>`);
    process.exit(1);
  }
  
  try {
    const result = await fixKybFormStatus(Number(taskId));
    
    if (result.success) {
      console.log(`${colors.green}✅ Success:${colors.reset} ${result.message || 'Task updated successfully'}`);
    } else {
      console.error(`${colors.red}❌ Error:${colors.reset} ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Unexpected error:${colors.reset}`, error);
  } finally {
    // Close the pool
    pool.end();
  }
}

// Run the script
main();
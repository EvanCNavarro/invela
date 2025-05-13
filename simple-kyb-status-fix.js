/**
 * Simple KYB Status Fix
 * 
 * A simplified version that focuses only on fixing the task status
 * without modifying company data.
 * 
 * Usage: node simple-kyb-status-fix.js <taskId>
 */

import pg from 'pg';
const { Pool } = pg;

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Fix the KYB form submission status
 */
async function fixKybStatus(taskId) {
  console.log(`${colors.blue}=== Fixing KYB Status for Task ${taskId} ===${colors.reset}`);
  
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
    
    // Update the task status directly
    await client.query(
      `UPDATE tasks SET status = 'submitted', updated_at = NOW() WHERE id = $1`,
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
      task: updatedTask, 
      companyId: task.company_id
    };
  } catch (error) {
    console.error(`${colors.red}❌ Fix failed:${colors.reset}`, error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Main function to run the script
const run = async () => {
  const taskId = process.argv[2];
  
  if (!taskId) {
    console.error(`${colors.red}Usage: node simple-kyb-status-fix.js <taskId>${colors.reset}`);
    process.exit(1);
  }
  
  try {
    const result = await fixKybStatus(taskId);
    
    if (result.success) {
      console.log(`${colors.green}✅ Fix completed successfully!${colors.reset}`);
    } else {
      console.error(`${colors.red}❌ Fix failed:${colors.reset}`, result.error);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
    process.exit(1);
  }
};

// Run the script if directly invoked
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

// Export for use in other modules
export { fixKybStatus };
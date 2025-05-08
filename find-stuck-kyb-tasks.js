/**
 * Find Stuck KYB Tasks
 * 
 * This script scans for KYB tasks that are stuck in 'ready_for_submission' status
 * with progress = 100%, which indicates they were not properly updated to 'submitted'.
 * 
 * Usage: node find-stuck-kyb-tasks.js [max-results]
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
 * Find KYB tasks that are stuck in 'ready_for_submission' status
 */
async function findStuckKybTasks(maxResults = 20) {
  console.log(`${colors.blue}=== Finding Stuck KYB Tasks ===${colors.reset}`);
  console.log(`Looking for KYB tasks with status='ready_for_submission' and progress=100`);
  
  try {
    const client = await pool.connect();
    
    // Query to find stuck KYB tasks
    const { rows: stuckTasks } = await client.query(
      `SELECT t.id, t.title, t.status, t.progress, t.company_id, c.name as company_name,
              t.updated_at, t.created_at
       FROM tasks t
       JOIN companies c ON t.company_id = c.id
       WHERE t.task_type = 'company_kyb'
         AND t.status = 'ready_for_submission'
         AND t.progress = 100
       ORDER BY t.updated_at DESC
       LIMIT $1`,
      [maxResults]
    );
    
    if (stuckTasks.length === 0) {
      console.log(`${colors.green}✅ No stuck KYB tasks found!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Found ${stuckTasks.length} stuck KYB task(s):${colors.reset}`);
      
      console.log(`\n${colors.cyan}========================================${colors.reset}`);
      console.log(`${colors.cyan}ID | Title | Company | Last Updated${colors.reset}`);
      console.log(`${colors.cyan}========================================${colors.reset}`);
      
      // Print the results in a tabular format
      stuckTasks.forEach((task, index) => {
        const formattedDate = new Date(task.updated_at).toLocaleString();
        console.log(`${index + 1}. [${colors.magenta}${task.id}${colors.reset}] ${task.title.substring(0, 30).padEnd(30)} | ${task.company_name.substring(0, 15).padEnd(15)} | ${formattedDate}`);
      });
      
      console.log(`\n${colors.yellow}To fix these tasks, run:${colors.reset}`);
      console.log(`node direct-fix-kyb-submission.js <taskId>`);
      
      // Provide script to fix all stuck tasks
      console.log(`\n${colors.blue}To fix all these tasks at once, you can use this command:${colors.reset}`);
      const fixCommands = stuckTasks.map(task => `node direct-fix-kyb-submission.js ${task.id}`).join(' && ');
      console.log(fixCommands);
    }
    
    // Also check for any tasks with progress = 100 but not submitted
    // This could indicate a more general issue with statuses
    const { rows: progressCompleteTasks } = await client.query(
      `SELECT t.id, t.title, t.status, t.progress, t.company_id, c.name as company_name,
              t.updated_at
       FROM tasks t
       JOIN companies c ON t.company_id = c.id
       WHERE t.task_type = 'company_kyb'
         AND t.status != 'submitted'
         AND t.progress = 100
       ORDER BY t.updated_at DESC
       LIMIT $1`,
      [maxResults]
    );
    
    if (progressCompleteTasks.length > 0 && progressCompleteTasks.length !== stuckTasks.length) {
      console.log(`\n${colors.yellow}Found ${progressCompleteTasks.length} KYB tasks with progress=100% but not submitted:${colors.reset}`);
      
      console.log(`\n${colors.cyan}========================================${colors.reset}`);
      console.log(`${colors.cyan}ID | Status | Title | Company | Last Updated${colors.reset}`);
      console.log(`${colors.cyan}========================================${colors.reset}`);
      
      // Print the results in a tabular format
      progressCompleteTasks.forEach((task, index) => {
        const formattedDate = new Date(task.updated_at).toLocaleString();
        console.log(`${index + 1}. [${colors.magenta}${task.id}${colors.reset}] ${task.status.padEnd(15)} | ${task.title.substring(0, 25).padEnd(25)} | ${task.company_name.substring(0, 15).padEnd(15)} | ${formattedDate}`);
      });
    }
    
    client.release();
    return stuckTasks;
  } catch (error) {
    console.error(`${colors.red}❌ Error finding stuck KYB tasks:${colors.reset}`, error);
    return [];
  }
}

// Main function to run the script
const run = async () => {
  const maxResults = process.argv[2] ? parseInt(process.argv[2]) : 20;
  
  try {
    await findStuckKybTasks(maxResults);
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Script failed:${colors.reset}`, error);
    process.exit(1);
  }
};

// Only run if this is the main module (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

// Export function for use in other modules
export { findStuckKybTasks };
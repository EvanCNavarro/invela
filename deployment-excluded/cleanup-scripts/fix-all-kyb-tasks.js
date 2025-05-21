/**
 * Fix All Stuck KYB Tasks
 * 
 * This script fixes all KYB tasks that are stuck in 'ready_for_submission' status.
 * It uses the simple-kyb-status-fix.js script to update each task.
 * 
 * Usage: node fix-all-kyb-tasks.js
 */

import pg from 'pg';
import { fixKybStatus } from './simple-kyb-status-fix.js';

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
 * Find and fix all stuck KYB tasks
 */
async function findAndFixStuckKybTasks() {
  console.log(`${colors.blue}=== Finding and Fixing All Stuck KYB Tasks ===${colors.reset}`);
  
  try {
    const client = await pool.connect();
    
    // Query to find stuck KYB tasks
    const { rows: stuckTasks } = await client.query(
      `SELECT id, title, status, progress, company_id, updated_at
       FROM tasks
       WHERE task_type = 'company_kyb'
         AND status = 'ready_for_submission'
         AND progress = 100
       ORDER BY updated_at DESC`
    );
    
    client.release();
    
    if (stuckTasks.length === 0) {
      console.log(`${colors.green}✅ No stuck KYB tasks found!${colors.reset}`);
      return { success: true, count: 0 };
    }
    
    console.log(`${colors.yellow}Found ${stuckTasks.length} stuck KYB task(s):${colors.reset}`);
    
    // Print the tasks that will be fixed
    stuckTasks.forEach((task, index) => {
      const formattedDate = new Date(task.updated_at).toLocaleString();
      console.log(`${index + 1}. [${colors.magenta}${task.id}${colors.reset}] ${task.title} (${formattedDate})`);
    });
    
    console.log(`\n${colors.blue}Starting to fix tasks...${colors.reset}`);
    
    // Track success and failures
    const results = {
      success: [],
      failure: []
    };
    
    // Fix each task
    for (const task of stuckTasks) {
      try {
        console.log(`\n${colors.yellow}Fixing task ${task.id}: ${task.title}${colors.reset}`);
        const result = await fixKybStatus(task.id);
        
        if (result.success) {
          results.success.push({ id: task.id, title: task.title });
          console.log(`${colors.green}✅ Successfully fixed task ${task.id}${colors.reset}`);
        } else {
          results.failure.push({ id: task.id, title: task.title, error: result.error });
          console.log(`${colors.red}❌ Failed to fix task ${task.id}: ${result.error}${colors.reset}`);
        }
      } catch (error) {
        results.failure.push({ id: task.id, title: task.title, error: error.message });
        console.log(`${colors.red}❌ Error fixing task ${task.id}: ${error.message}${colors.reset}`);
      }
    }
    
    // Print summary
    console.log(`\n${colors.blue}=== Fix Summary ===${colors.reset}`);
    console.log(`${colors.green}✅ Successfully fixed: ${results.success.length} tasks${colors.reset}`);
    console.log(`${colors.red}❌ Failed to fix: ${results.failure.length} tasks${colors.reset}`);
    
    if (results.failure.length > 0) {
      console.log(`\n${colors.yellow}Failed tasks:${colors.reset}`);
      results.failure.forEach(task => {
        console.log(`- [${colors.magenta}${task.id}${colors.reset}] ${task.title}: ${task.error}`);
      });
    }
    
    return {
      success: true,
      totalTasks: stuckTasks.length,
      fixed: results.success.length,
      failed: results.failure.length,
      failures: results.failure
    };
  } catch (error) {
    console.error(`${colors.red}❌ Error finding or fixing tasks:${colors.reset}`, error);
    return { success: false, error: error.message };
  }
}

// Main function to run the script
const run = async () => {
  try {
    await findAndFixStuckKybTasks();
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Script failed:${colors.reset}`, error);
    process.exit(1);
  }
};

// Run the script if directly invoked
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

// Export for use in other modules
export { findAndFixStuckKybTasks };
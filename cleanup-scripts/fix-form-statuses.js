/**
 * Fix Form Statuses
 * 
 * This script corrects inconsistent form statuses for KY3P and Open Banking forms.
 * It specifically fixes:
 * 1. KY3P tasks with "submitted" status but 0% progress (sets to 100%)
 * 2. Open Banking tasks with "ready_for_submission" status when they should be "submitted"
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
 * Fix KY3P tasks with submitted status but 0% progress
 */
async function fixKy3pProgress() {
  console.log(`${colors.blue}=== Fixing KY3P Tasks with Submitted Status but 0% Progress ===${colors.reset}`);
  
  const client = await pool.connect();
  
  try {
    // Find KY3P tasks with submitted status but 0% progress
    const { rows: tasks } = await client.query(`
      SELECT id, title, task_type, status, progress, metadata
      FROM tasks
      WHERE task_type = 'ky3p'
        AND status = 'submitted'
        AND progress = 0
        AND metadata->>'submitted' = 'true'
    `);
    
    if (tasks.length === 0) {
      console.log(`${colors.green}✅ No KY3P tasks found with incorrect progress${colors.reset}`);
      return { success: true, count: 0 };
    }
    
    console.log(`${colors.yellow}Found ${tasks.length} KY3P task(s) with incorrect progress:${colors.reset}`);
    
    // Print the tasks that will be fixed
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. [${colors.magenta}${task.id}${colors.reset}] ${task.title} (${task.status}, ${task.progress}%)`);
    });
    
    // Fix each task
    for (const task of tasks) {
      // Start a transaction
      await client.query('BEGIN');
      
      try {
        // Update the progress to 100%
        await client.query(`
          UPDATE tasks
          SET progress = 100,
              updated_at = NOW()
          WHERE id = $1
        `, [task.id]);
        
        // Log the successful update
        console.log(`${colors.green}✅ Updated KY3P task ${task.id} progress to 100%${colors.reset}`);
        
        // Commit the transaction
        await client.query('COMMIT');
      } catch (error) {
        // Rollback the transaction
        await client.query('ROLLBACK');
        console.error(`${colors.red}❌ Error updating KY3P task ${task.id}:${colors.reset}`, error);
      }
    }
    
    console.log(`${colors.green}✅ KY3P task fix completed${colors.reset}`);
    
    return { success: true, count: tasks.length };
  } catch (error) {
    console.error(`${colors.red}❌ Error fixing KY3P tasks:${colors.reset}`, error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Fix Open Banking tasks with ready_for_submission status that should be submitted
 */
async function fixOpenBankingStatus() {
  console.log(`${colors.blue}=== Fixing Open Banking Tasks with Incorrect Status ===${colors.reset}`);
  
  const client = await pool.connect();
  
  try {
    // Find Open Banking tasks with ready_for_submission status but submitted:true in metadata
    const { rows: tasks } = await client.query(`
      SELECT id, title, task_type, status, progress, metadata
      FROM tasks
      WHERE task_type = 'open_banking'
        AND status = 'ready_for_submission'
        AND progress = 100
        AND metadata->>'submitted' = 'true'
    `);
    
    if (tasks.length === 0) {
      console.log(`${colors.green}✅ No Open Banking tasks found with incorrect status${colors.reset}`);
      return { success: true, count: 0 };
    }
    
    console.log(`${colors.yellow}Found ${tasks.length} Open Banking task(s) with incorrect status:${colors.reset}`);
    
    // Print the tasks that will be fixed
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. [${colors.magenta}${task.id}${colors.reset}] ${task.title} (${task.status}, ${task.progress}%)`);
    });
    
    // Fix each task
    for (const task of tasks) {
      // Start a transaction
      await client.query('BEGIN');
      
      try {
        // Update the status to submitted
        await client.query(`
          UPDATE tasks
          SET status = 'submitted',
              updated_at = NOW()
          WHERE id = $1
        `, [task.id]);
        
        // Log the successful update
        console.log(`${colors.green}✅ Updated Open Banking task ${task.id} status to 'submitted'${colors.reset}`);
        
        // Commit the transaction
        await client.query('COMMIT');
      } catch (error) {
        // Rollback the transaction
        await client.query('ROLLBACK');
        console.error(`${colors.red}❌ Error updating Open Banking task ${task.id}:${colors.reset}`, error);
      }
    }
    
    console.log(`${colors.green}✅ Open Banking task fix completed${colors.reset}`);
    
    return { success: true, count: tasks.length };
  } catch (error) {
    console.error(`${colors.red}❌ Error fixing Open Banking tasks:${colors.reset}`, error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Run both fixes
 */
async function runFixes() {
  console.log(`${colors.blue}=== Starting Form Status Fix Script ===${colors.reset}`);
  
  try {
    // Fix KY3P progress first
    const ky3pResult = await fixKy3pProgress();
    
    // Then fix Open Banking status
    const openBankingResult = await fixOpenBankingStatus();
    
    // Print summary
    console.log(`\n${colors.blue}=== Fix Summary ===${colors.reset}`);
    console.log(`${colors.green}✅ Fixed ${ky3pResult.count} KY3P task(s)${colors.reset}`);
    console.log(`${colors.green}✅ Fixed ${openBankingResult.count} Open Banking task(s)${colors.reset}`);
    
    return { 
      success: true, 
      ky3pFixed: ky3pResult.count, 
      openBankingFixed: openBankingResult.count 
    };
  } catch (error) {
    console.error(`${colors.red}❌ Script failed:${colors.reset}`, error);
    return { success: false, error: error.message };
  }
}

// Main function to run the script
const main = async () => {
  try {
    const result = await runFixes();
    
    if (result.success) {
      console.log(`${colors.green}✅ Form status fix completed successfully!${colors.reset}`);
    } else {
      console.error(`${colors.red}❌ Form status fix failed:${colors.reset}`, result.error);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Unexpected error:${colors.reset}`, error);
    process.exit(1);
  }
};

// Run the script if directly invoked
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for use in other modules
export { fixKy3pProgress, fixOpenBankingStatus, runFixes };
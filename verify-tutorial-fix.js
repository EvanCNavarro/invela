/**
 * Verification script for tutorial fix
 * 
 * This script helps reset and verify our tutorial data to test that
 * the fix we've implemented is working correctly.
 * 
 * Usage: node verify-tutorial-fix.js <tab-name>
 */

const { Pool } = require('pg');
require('dotenv').config();

// Color formatting for better readability
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Initialize DB connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Reset the tutorial progress for a specific tab
 * 
 * @param {string} tabName - The name of the tab to reset
 * @param {number} userId - The user ID (defaults to 8)
 */
async function resetTutorialForTab(tabName, userId = 8) {
  const client = await pool.connect();
  
  try {
    log(`Resetting tutorial progress for tab "${tabName}" for user ID ${userId}...`, colors.cyan);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if tutorial entry exists
    const checkResult = await client.query(
      `SELECT * FROM user_tab_tutorials 
       WHERE user_id = $1 AND tab_name = $2`,
      [userId, tabName]
    );
    
    if (checkResult.rows.length === 0) {
      log(`No tutorial entry found for tab "${tabName}" and user ${userId}. Creating new entry...`, colors.yellow);
      
      // Insert new entry with completed = false and currentStep = 0
      await client.query(
        `INSERT INTO user_tab_tutorials 
         (user_id, tab_name, completed, current_step) 
         VALUES ($1, $2, $3, $4)`,
        [userId, tabName, false, 0]
      );
      
      log(`Created new tutorial entry with completed = false and currentStep = 0`, colors.green);
    } else {
      // Update existing entry
      await client.query(
        `UPDATE user_tab_tutorials 
         SET completed = $1, current_step = $2 
         WHERE user_id = $3 AND tab_name = $4`,
        [false, 0, userId, tabName]
      );
      
      log(`Reset existing tutorial entry to completed = false and currentStep = 0`, colors.green);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    log(`Successfully reset tutorial progress for tab "${tabName}" for user ID ${userId}`, colors.green);
    
    // Return the updated state
    return {
      userId,
      tabName,
      completed: false,
      currentStep: 0
    };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    log(`Error resetting tutorial progress: ${error.message}`, colors.red);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check the current tutorial status
 * 
 * @param {string} tabName - The name of the tab to check
 * @param {number} userId - The user ID (defaults to 8)
 */
async function checkTutorialStatus(tabName, userId = 8) {
  const client = await pool.connect();
  
  try {
    // Get current tutorial status
    const result = await client.query(
      `SELECT * FROM user_tab_tutorials 
       WHERE user_id = $1 AND tab_name = $2`,
      [userId, tabName]
    );
    
    if (result.rows.length === 0) {
      log(`No tutorial entry found for tab "${tabName}" and user ${userId}.`, colors.yellow);
      return null;
    } else {
      const tutorialData = result.rows[0];
      log(`Current tutorial status for tab "${tabName}":`, colors.cyan);
      console.log({
        tabName: tutorialData.tab_name,
        userId: tutorialData.user_id,
        completed: tutorialData.completed,
        currentStep: tutorialData.current_step,
        lastSeenAt: tutorialData.last_seen_at
      });
      return tutorialData;
    }
  } catch (error) {
    log(`Error checking tutorial status: ${error.message}`, colors.red);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Simulate completing a tutorial
 * 
 * @param {string} tabName - The name of the tab to complete
 * @param {number} userId - The user ID (defaults to 8)
 * @param {number} finalStep - The final step to set (defaults to 3)
 */
async function completeTutorial(tabName, userId = 8, finalStep = 3) {
  const client = await pool.connect();
  
  try {
    log(`Marking tutorial as completed for tab "${tabName}" for user ID ${userId}...`, colors.cyan);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Update tutorial to completed state
    await client.query(
      `UPDATE user_tab_tutorials 
       SET completed = true, current_step = $1 
       WHERE user_id = $2 AND tab_name = $3`,
      [finalStep, userId, tabName]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    log(`Successfully marked tutorial as completed for tab "${tabName}"`, colors.green);
    
    // Return the updated state
    return {
      userId,
      tabName,
      completed: true,
      currentStep: finalStep
    };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    log(`Error completing tutorial: ${error.message}`, colors.red);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const tabName = args[0] || 'dashboard';
  const userId = args[1] ? parseInt(args[1], 10) : 8;
  
  try {
    log(`=== TUTORIAL VERIFICATION TOOL ===`, colors.blue);
    log(`Tab: ${tabName}, User ID: ${userId}`, colors.blue);
    log(`=================================`, colors.blue);
    
    // First, check current status
    log(`\nCHECK 1: Current tutorial status`, colors.magenta);
    await checkTutorialStatus(tabName, userId);
    
    // Reset the tutorial
    log(`\nSTEP 1: Resetting tutorial`, colors.magenta);
    await resetTutorialForTab(tabName, userId);
    
    // Verify reset was successful
    log(`\nCHECK 2: Verifying reset`, colors.magenta);
    await checkTutorialStatus(tabName, userId);
    
    // Complete the tutorial
    log(`\nSTEP 2: Simulating completion`, colors.magenta);
    await completeTutorial(tabName, userId);
    
    // Final verification
    log(`\nCHECK 3: Verifying completion`, colors.magenta);
    await checkTutorialStatus(tabName, userId);
    
    log(`\nVERIFICATION COMPLETE!`, colors.green);
    log(`Please navigate to the ${tabName} tab in the UI to confirm that:`, colors.green);
    log(`1. The tutorial should NOT show (since it's marked as completed)`, colors.green);
    log(`2. If you reset again, the tutorial SHOULD show`, colors.green);
    log(`3. After completing all steps, it should mark as completed and not show again`, colors.green);
    
  } catch (error) {
    log(`\nVERIFICATION FAILED: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    // Close the pool
    pool.end();
  }
}

// Execute main function
main();
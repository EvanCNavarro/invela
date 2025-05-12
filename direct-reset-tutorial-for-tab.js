/**
 * Direct script to reset tutorial progress for a specific tab
 * 
 * This script allows you to reset the tutorial progress for a specific tab
 * to test the tutorial flow without having to clear all user data.
 * 
 * Usage:
 * node direct-reset-tutorial-for-tab.js <tabName> [userId]
 * 
 * Example:
 * node direct-reset-tutorial-for-tab.js dashboard 8
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
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const tabName = args[0];
  const userId = args[1] ? parseInt(args[1], 10) : 8;
  
  if (!tabName) {
    log('Usage: node direct-reset-tutorial-for-tab.js <tabName> [userId]', colors.yellow);
    log('Example: node direct-reset-tutorial-for-tab.js dashboard 8', colors.yellow);
    process.exit(1);
  }
  
  try {
    const result = await resetTutorialForTab(tabName, userId);
    log('Tutorial reset complete:', colors.green);
    console.log(result);
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    // Close the pool
    pool.end();
  }
}

// Execute main function
main();
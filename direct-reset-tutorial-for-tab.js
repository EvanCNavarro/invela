/**
 * Reset Tutorial for a Specific Tab
 * 
 * This script allows direct resetting of a tutorial status for a given tab.
 * Use it to test tutorial functionality by marking the tutorial as not completed
 * and setting the current step back to 0.
 * 
 * Usage: node direct-reset-tutorial-for-tab.js <tabName> [userId]
 * Example: node direct-reset-tutorial-for-tab.js dashboard 8
 */

require('dotenv').config();
const { Pool } = require('pg');

// ANSI color codes for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * Enhanced logging function to make the script output more readable
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Reset a tutorial entry for a specific tab and user
 * 
 * @param {string} tabName - The name of the tab
 * @param {number} userId - User ID (defaults to 8)
 * @returns {Promise<boolean>} - Success status
 */
async function resetTutorialForTab(tabName, userId = 8) {
  log(`Resetting tutorial status for tab: ${colors.cyan}${tabName}${colors.reset} and user ID: ${colors.cyan}${userId}${colors.reset}`, colors.yellow);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  const client = await pool.connect();
  
  try {
    // First check if an entry exists
    const checkQuery = `
      SELECT id, tab_name, current_step, completed
      FROM user_tab_tutorials
      WHERE user_id = $1 AND tab_name = $2
    `;
    
    const checkResult = await client.query(checkQuery, [userId, tabName]);
    
    if (checkResult.rows.length === 0) {
      log(`No tutorial entry found for tab: ${colors.cyan}${tabName}${colors.reset}. Creating one...`, colors.yellow);
      
      // Create a new entry that's not completed
      const insertQuery = `
        INSERT INTO user_tab_tutorials (user_id, tab_name, current_step, completed)
        VALUES ($1, $2, 0, false)
        RETURNING id
      `;
      
      const insertResult = await client.query(insertQuery, [userId, tabName]);
      log(`Created new tutorial entry with ID: ${colors.green}${insertResult.rows[0].id}${colors.reset}`, colors.green);
      return true;
    } else {
      // Update the existing entry
      const tutorialId = checkResult.rows[0].id;
      const currentStatus = checkResult.rows[0];
      
      log(`Existing tutorial status:`, colors.magenta);
      log(`  Tab: ${currentStatus.tab_name}`, colors.magenta);
      log(`  Current Step: ${currentStatus.current_step}`, colors.magenta);
      log(`  Completed: ${currentStatus.completed}`, colors.magenta);
      
      const updateQuery = `
        UPDATE user_tab_tutorials
        SET current_step = 0, completed = false
        WHERE id = $1
        RETURNING id, current_step, completed
      `;
      
      const updateResult = await client.query(updateQuery, [tutorialId]);
      log(`Reset tutorial status for entry ID: ${colors.green}${updateResult.rows[0].id}${colors.reset}`, colors.green);
      log(`New Status: Step=${colors.cyan}${updateResult.rows[0].current_step}${colors.reset}, Completed=${colors.cyan}${updateResult.rows[0].completed}${colors.reset}`, colors.green);
      
      return true;
    }
  } catch (error) {
    log(`Error resetting tutorial entry: ${error.message}`, colors.red);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Main function
 */
async function main() {
  // Get command line arguments
  const tabName = process.argv[2];
  const userId = process.argv[3] ? parseInt(process.argv[3], 10) : 8;
  
  if (!tabName) {
    log('Error: Tab name is required.', colors.red);
    log('Usage: node direct-reset-tutorial-for-tab.js <tabName> [userId]', colors.yellow);
    log('Example: node direct-reset-tutorial-for-tab.js dashboard 8', colors.yellow);
    process.exit(1);
  }
  
  const success = await resetTutorialForTab(tabName, userId);
  
  if (success) {
    log(`Successfully reset tutorial for tab: ${colors.cyan}${tabName}${colors.reset}`, colors.green);
    
    // Now broadcast this update via WebSocket to notify clients
    log('\nTo broadcast this update, you can run:', colors.yellow);
    log(`node direct-broadcast-tutorial-update.js ${tabName} ${userId} 0 false`, colors.yellow);
    
    log('\nTo see this tutorial, navigate to the ${tabName} tab in the application.', colors.yellow);
  } else {
    log(`Failed to reset tutorial for tab: ${colors.red}${tabName}${colors.reset}`, colors.red);
  }
}

main();
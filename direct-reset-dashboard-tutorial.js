/**
 * Reset Dashboard Tutorial Script
 * 
 * This script resets the dashboard tutorial for all users to step 0 and marks it as incomplete,
 * allowing users to see the new dashboard tutorial with updated content and images.
 */

import pg from 'pg';
const { Pool } = pg;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Reset the dashboard tutorial progress for all users
 */
async function resetDashboardTutorial() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    log('Connecting to database...', colors.blue);
    const client = await pool.connect();
    
    try {
      log('Resetting dashboard tutorial progress for all users...', colors.yellow);
      
      // Get current state first (for logging)
      const { rows: beforeRows } = await client.query(
        `SELECT * FROM user_tab_tutorials WHERE tab_name = 'dashboard'`
      );
      
      log(`Found ${beforeRows.length} dashboard tutorial entries:`, colors.blue);
      beforeRows.forEach(row => {
        log(`  - User ${row.user_id}: step ${row.current_step}, completed: ${row.completed}`, 
          row.completed ? colors.green : colors.yellow);
      });
      
      // Update all dashboard tutorials to reset their progress
      const updateResult = await client.query(
        `UPDATE user_tab_tutorials 
         SET current_step = 0, 
             completed = FALSE 
         WHERE tab_name = 'dashboard'
         RETURNING *`
      );
      
      // Notify about the result
      log(`✅ Successfully reset ${updateResult.rowCount} dashboard tutorial entries!`, colors.green);
      
      // Show the updated state
      const { rows: afterRows } = await client.query(
        `SELECT * FROM user_tab_tutorials WHERE tab_name = 'dashboard'`
      );
      
      log('Updated dashboard tutorial entries:', colors.blue);
      afterRows.forEach(row => {
        log(`  - User ${row.user_id}: step ${row.current_step}, completed: ${row.completed}`, colors.cyan);
      });
      
      // Reminder about WebSocket broadcast
      log('\n📣 NOTE: Users will need to refresh their browser to see the updates. For immediate updates,', colors.yellow);
      log('      consider broadcasting a tutorial_update event via WebSocket.', colors.yellow);
      
    } finally {
      client.release();
    }
  } catch (err) {
    log(`Error: ${err.message}`, colors.red);
    log(err.stack, colors.dim);
  } finally {
    await pool.end();
  }
}

// Run the reset function
resetDashboardTutorial().catch(err => {
  log(`Unhandled error: ${err.message}`, colors.red);
  process.exit(1);
});
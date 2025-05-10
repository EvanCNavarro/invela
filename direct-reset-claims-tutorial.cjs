/**
 * Direct script to reset the claims tab tutorial
 * 
 * This script creates or resets the claims tab tutorial for user ID 8
 * by directly inserting into the database. It works even if the user
 * is not authenticated by using the fallback user ID.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

// Enhanced logging
function log(message, color = colors.reset) {
  console.log(`${color}[ClaimsTutorialReset] ${message}${colors.reset}`);
}

/**
 * Reset claims tutorial for the default user
 */
async function resetClaimsTutorial() {
  const client = await pool.connect();
  try {
    // User ID 8 is the default fallback user in the tutorial system
    const userId = 8;
    const tabName = 'claims';
    
    log('Starting claims tutorial reset process', colors.bright + colors.blue);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // First check if a tutorial entry exists
    const checkQuery = `
      SELECT * FROM user_tab_tutorials
      WHERE user_id = $1 AND tab_name = $2
    `;
    
    const result = await client.query(checkQuery, [userId, tabName]);
    
    if (result.rows.length > 0) {
      // Entry exists - delete it to create fresh
      log(`Tutorial entry for ${tabName} exists - deleting for fresh start`, colors.yellow);
      
      await client.query(
        'DELETE FROM user_tab_tutorials WHERE user_id = $1 AND tab_name = $2',
        [userId, tabName]
      );
    }
    
    // Now create a fresh tutorial entry
    log(`Creating new tutorial entry for ${tabName}`, colors.green);
    
    // Set a future date for completed_at as it's NOT NULL in schema
    const futureDate = new Date('2099-12-31'); 
    
    const insertQuery = `
      INSERT INTO user_tab_tutorials 
      (user_id, tab_name, current_step, completed, created_at, updated_at, last_seen_at, completed_at)
      VALUES ($1, $2, 0, false, NOW(), NOW(), NULL, $3)
    `;
    
    await client.query(insertQuery, [userId, tabName, futureDate]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    log(`Claims tutorial successfully reset for user ${userId}`, colors.bright + colors.green);
    log('This tab tutorial should now display when navigating to the Claims page', colors.cyan);
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    log(`Error resetting claims tutorial: ${error.message}`, colors.red);
    console.error(error.stack);
    return false;
  } finally {
    client.release();
  }
}

// Run the script
resetClaimsTutorial()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
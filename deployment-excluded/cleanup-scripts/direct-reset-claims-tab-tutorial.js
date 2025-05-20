/**
 * Direct script to reset the claims tab tutorial for user ID 8
 * 
 * This script ensures that the claims tab tutorial entry exists in the database
 * and is properly set up to show the tutorial on the claims page.
 */
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set up terminal colors for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Enhanced logging function
function log(message, color = colors.reset) {
  console.log(`${color}[Claims Tutorial Reset] ${message}${colors.reset}`);
}

/**
 * Reset claims tutorial for the default user
 */
async function resetClaimsTutorial() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Connect to the database
    log('Connecting to database...', colors.blue);
    await client.connect();
    
    // Check if there's an existing entry
    log('Checking for existing entry...', colors.blue);
    const checkQuery = `
      SELECT * FROM user_tab_tutorials 
      WHERE user_id = 8 AND tab_name = 'claims';
    `;
    
    const existingResult = await client.query(checkQuery);
    const existingEntry = existingResult.rows[0];
    
    if (existingEntry) {
      log(`Found existing entry: ${JSON.stringify(existingEntry)}`, colors.yellow);
      
      // Reset the existing entry to not completed
      log('Resetting entry to show tutorial...', colors.blue);
      const updateQuery = `
        UPDATE user_tab_tutorials
        SET 
          completed = false,
          current_step = 0,
          last_seen_at = NULL,
          completed_at = '2099-12-31',
          updated_at = NOW()
        WHERE 
          user_id = 8 AND tab_name = 'claims'
        RETURNING *;
      `;
      
      const updateResult = await client.query(updateQuery);
      log(`Entry updated: ${JSON.stringify(updateResult.rows[0])}`, colors.green);
    } else {
      // Create a new entry from scratch
      log('No existing entry found. Creating new entry...', colors.yellow);
      const insertQuery = `
        INSERT INTO user_tab_tutorials (
          user_id, tab_name, completed, current_step, 
          last_seen_at, completed_at, created_at, updated_at
        ) VALUES (
          8, 'claims', false, 0,
          NULL, '2099-12-31', NOW(), NOW()
        )
        RETURNING *;
      `;
      
      const insertResult = await client.query(insertQuery);
      log(`New entry created: ${JSON.stringify(insertResult.rows[0])}`, colors.green);
    }
    
    // Verify the entry is set correctly
    const verifyQuery = `
      SELECT * FROM user_tab_tutorials 
      WHERE user_id = 8 AND tab_name = 'claims';
    `;
    
    const verifyResult = await client.query(verifyQuery);
    log(`Final entry state: ${JSON.stringify(verifyResult.rows[0])}`, colors.cyan);
    
    log('Claims tutorial reset successfully!', colors.bright + colors.green);
    
    // Get a list of all user tutorials for comparison
    const allTutorialsQuery = `
      SELECT id, user_id, tab_name, completed, current_step, last_seen_at
      FROM user_tab_tutorials 
      WHERE user_id = 8
      ORDER BY tab_name;
    `;
    
    const allTutorials = await client.query(allTutorialsQuery);
    log('All tutorials for user 8:', colors.blue);
    allTutorials.rows.forEach(tutorial => {
      const status = tutorial.completed ? 'Completed' : 'Not completed';
      const lastSeen = tutorial.last_seen_at ? new Date(tutorial.last_seen_at).toLocaleString() : 'Never';
      log(`- ${tutorial.tab_name}: ${status}, Step ${tutorial.current_step}, Last seen: ${lastSeen}`, colors.reset);
    });
    
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    log(error.stack, colors.red);
  } finally {
    // Close the database connection
    await client.end();
    log('Database connection closed.', colors.blue);
  }
}

// Execute the function
resetClaimsTutorial();
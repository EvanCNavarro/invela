/**
 * Broadcast Dashboard Tutorial Update
 * 
 * This script broadcasts a WebSocket message to notify all connected clients
 * that the dashboard tutorial has been updated and should be reshown.
 */

import pg from 'pg';
import fetch from 'node-fetch';
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
 * Broadcast a tutorial update to all connected WebSocket clients
 * 
 * @param {string} tabName - The name of the tab that was updated
 * @param {number} userId - The user ID
 * @param {number} currentStep - The current step index
 * @param {boolean} completed - Whether the tutorial is completed
 */
async function broadcastTutorialUpdate(tabName, userId, currentStep, completed) {
  try {
    // Update the tutorial using the API endpoint
    log(`Updating tutorial via API for tab ${tabName}, user ${userId}`, colors.blue);
    
    // Use the current host domain instead of localhost
    const host = 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co';
    const endpoint = `${host}/api/user-tab-tutorials/${tabName}/update`;
    
    log(`Using API endpoint: ${endpoint}`, colors.blue);
    
    // Create the request payload
    const payload = {
      currentStep,
      completed
    };
    
    // Make the API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      log(`✅ Tutorial update API response: ${JSON.stringify(result)}`, colors.green);
    } else {
      const errorText = await response.text();
      log(`❌ Tutorial update failed: ${response.status} ${response.statusText}`, colors.red);
      log(`Error details: ${errorText}`, colors.red);
    }
  } catch (err) {
    log(`Error updating tutorial: ${err.message}`, colors.red);
  }
}

/**
 * Main function to get dashboard tutorial details and broadcast the update
 */
async function broadcastDashboardTutorialUpdate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    log('Connecting to database...', colors.blue);
    const client = await pool.connect();
    
    try {
      // Get the updated dashboard tutorial entry
      const { rows } = await client.query(
        `SELECT * FROM user_tab_tutorials WHERE tab_name = 'dashboard'`
      );
      
      if (rows.length === 0) {
        log('No dashboard tutorial entries found', colors.yellow);
        return;
      }
      
      log(`Found ${rows.length} dashboard tutorial entries:`, colors.blue);
      
      // Broadcast update for each tutorial entry
      for (const row of rows) {
        log(`Broadcasting update for User ${row.user_id}: step ${row.current_step}, completed: ${row.completed}`, colors.yellow);
        broadcastTutorialUpdate('dashboard', row.user_id, row.current_step, row.completed);
      }
      
      log('✅ Broadcast complete', colors.green);
      
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

// Run the broadcast function
broadcastDashboardTutorialUpdate().catch(err => {
  log(`Unhandled error: ${err.message}`, colors.red);
  process.exit(1);
});
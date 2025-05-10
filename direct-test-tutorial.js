/**
 * Direct Test Tutorial Script
 * 
 * This script tests if tutorials are properly appearing on all tabs.
 * It queries the database to check if tutorial entries exist and are
 * properly configured for all tabs except task-center.
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Configure environment
dotenv.config();
const { Pool } = pg;

// Connect to the database using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Colors for console logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
};

// Log with colors for better readability
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// List of tabs that should have tutorials
// These should match the TUTORIAL_CONTENT in TutorialManager.tsx
const EXPECTED_TABS = [
  'risk-score',
  'claims-risk',
  'network-view',
  'dashboard', 
  'file-vault',
  'claims',
  'insights',
  'network',
  'company-profile',
  'playground'
];

/**
 * Test if tutorials are properly configured for a user
 */
async function testTutorialConfiguration() {
  // Default user ID is 8 as this matches our logs
  const userId = process.argv[2] ? parseInt(process.argv[2]) : 8;
  
  log(`🔍 Testing tutorial configuration for user ID: ${userId}`, colors.bright);
  
  const client = await pool.connect();
  
  try {
    // Get all tutorial entries for the user
    const query = {
      text: 'SELECT tab_name, completed, current_step FROM user_tab_tutorials WHERE user_id = $1',
      values: [userId]
    };
    
    const result = await client.query(query);
    log(`\n📋 Found ${result.rows.length} tutorial entries for user ${userId}:`, colors.bright);
    
    // Print all found tutorial entries
    result.rows.forEach(row => {
      log(`  • ${row.tab_name} (Step: ${row.current_step}, Completed: ${row.completed})`, 
          row.completed ? colors.dim : colors.cyan);
    });
    
    // Check which expected tabs are missing
    const foundTabs = result.rows.map(row => row.tab_name);
    const missingTabs = EXPECTED_TABS.filter(tab => !foundTabs.includes(tab));
    
    if (missingTabs.length > 0) {
      log(`\n⚠️ Missing tutorial entries for the following tabs:`, colors.yellow);
      missingTabs.forEach(tab => {
        log(`  • ${tab}`, colors.yellow);
      });
    } else {
      log(`\n✅ All expected tabs have tutorial entries!`, colors.green);
    }
    
    // Count tutorials by completion status
    const completedCount = result.rows.filter(row => row.completed).length;
    const pendingCount = result.rows.filter(row => !row.completed).length;
    
    log(`\n📊 Tutorial Status Summary:`, colors.bright);
    log(`  • Total tutorial entries: ${result.rows.length}`, colors.bright);
    log(`  • Completed tutorials: ${completedCount}`, colors.bright);
    log(`  • Pending tutorials: ${pendingCount}`, colors.bright);
    log(`  • Missing tutorials: ${missingTabs.length}`, colors.bright);
    
    // Recommendations
    if (missingTabs.length > 0) {
      log(`\n🛠️ Recommendation: Run direct-create-current-user-tutorials.mjs to create missing entries.`, colors.yellow);
    } else if (completedCount === result.rows.length) {
      log(`\n🛠️ Recommendation: All tutorials are completed. Run direct-create-current-user-tutorials.mjs to reset them.`, colors.yellow);
    } else {
      log(`\n👍 Tutorials are properly set up. You should see tutorial modals when you visit each tab.`, colors.green);
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
  } finally {
    // Release client back to the pool
    client.release();
  }
}

// Run the main function
testTutorialConfiguration().catch(error => {
  log(`❌ Fatal error: ${error.message}`, colors.red);
  process.exit(1);
}).finally(() => {
  // Close the pool and exit when done
  pool.end().then(() => {
    log('Database connection closed.', colors.dim);
  });
});
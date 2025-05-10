/**
 * Direct Create Current User Tutorials
 * 
 * This script directly creates tutorial entries for the currently logged-in user
 * (default user ID 8) for all tabs except task-center.
 * 
 * Uses ES modules syntax for compatibility with the project settings.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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
const TABS_TO_CREATE = [
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

// Tab name variations for consistent normalization
const TAB_VARIATIONS = {
  'risk-score-configuration': 'risk-score',
  'claims-risk-analysis': 'claims-risk',
  'network-visualization': 'network-view',
  'company-profile-page': 'company-profile',
  'file-vault-page': 'file-vault',
  'FileVault': 'file-vault',
  'dashboard-page': 'dashboard'
};

/**
 * Create or update a tutorial entry for a specific tab and user
 * 
 * @param {*} client - Database client
 * @param {number} userId - User ID
 * @param {string} tabName - Tab name
 * @returns {Promise<boolean>} - Success status
 */
async function createTutorialEntry(client, userId, tabName) {
  try {
    // First check if the entry already exists
    const existingQuery = {
      text: 'SELECT * FROM user_tab_tutorials WHERE user_id = $1 AND tab_name = $2',
      values: [userId, tabName]
    };
    
    const existingResult = await client.query(existingQuery);
    
    if (existingResult.rows.length > 0) {
      // Update existing entry
      const updateQuery = {
        text: `
          UPDATE user_tab_tutorials 
          SET completed = false, 
              current_step = 0, 
              last_seen_at = NOW(), 
              updated_at = NOW(),
              completed_at = '2099-12-31 00:00:00'
          WHERE user_id = $1 AND tab_name = $2
        `,
        values: [userId, tabName]
      };
      
      await client.query(updateQuery);
      log(`  ✓ Updated existing tutorial for tab: ${tabName}`, colors.green);
      return true;
    } else {
      // Create new entry
      const insertQuery = {
        text: `
          INSERT INTO user_tab_tutorials (
            user_id, tab_name, completed, current_step, 
            last_seen_at, completed_at, created_at, updated_at
          ) 
          VALUES ($1, $2, false, 0, NOW(), '2099-12-31 00:00:00', NOW(), NOW())
        `,
        values: [userId, tabName]
      };
      
      await client.query(insertQuery);
      log(`  ✓ Created new tutorial for tab: ${tabName}`, colors.green);
      return true;
    }
  } catch (error) {
    log(`  ✗ Error creating tutorial for tab ${tabName}: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Main function to create all needed tutorial entries
 */
async function createAllTutorials() {
  // Default user ID is 8 as this matches our logs
  const userId = process.argv[2] ? parseInt(process.argv[2]) : 8;
  
  log(`🔄 Creating tutorial entries for user ID: ${userId}`, colors.bright);
  log('This will ensure tutorials appear on every tab except task-center', colors.bright);
  
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Create entries for main tabs
    log('\nCreating entries for primary tabs...', colors.bright);
    let successCount = 0;
    
    for (const tabName of TABS_TO_CREATE) {
      // Skip task-center as requested
      if (tabName === 'task-center') {
        log(`  ↷ Skipping task-center tab as requested`, colors.yellow);
        continue;
      }
      
      const success = await createTutorialEntry(client, userId, tabName);
      if (success) successCount++;
    }
    
    // Create entries for tab variations
    log('\nCreating entries for tab variations...', colors.bright);
    let variationCount = 0;
    
    for (const [variation, normalizedName] of Object.entries(TAB_VARIATIONS)) {
      // Skip if the normalized name is task-center
      if (normalizedName === 'task-center') {
        log(`  ↷ Skipping ${variation} as it normalizes to task-center`, colors.yellow);
        continue;
      }
      
      const success = await createTutorialEntry(client, userId, variation);
      if (success) variationCount++;
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    log(`\n✅ Successfully created ${successCount} primary tabs and ${variationCount} variations.`, colors.green);
    
    // Verify the entries
    const verifyQuery = {
      text: 'SELECT tab_name, completed, current_step FROM user_tab_tutorials WHERE user_id = $1',
      values: [userId]
    };
    
    const verification = await client.query(verifyQuery);
    log(`\n📋 Current tutorial entries for user ${userId}:`, colors.bright);
    
    verification.rows.forEach(row => {
      log(`  • ${row.tab_name} (Step: ${row.current_step}, Completed: ${row.completed})`, colors.cyan);
    });
    
    log(`\n✨ All done! The tutorials should now appear on all tabs.`, colors.bright);
    log(`   Please refresh the application to see the changes.`, colors.bright);
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    log(`❌ Error: ${error.message}`, colors.red);
    log(`Transaction rolled back to prevent partial updates.`, colors.red);
  } finally {
    // Release client back to the pool
    client.release();
  }
}

// Run the main function
createAllTutorials().catch(error => {
  log(`❌ Fatal error: ${error.message}`, colors.red);
  process.exit(1);
}).finally(() => {
  // Close the pool and exit when done
  pool.end().then(() => {
    log('Database connection closed.', colors.dim);
  });
});
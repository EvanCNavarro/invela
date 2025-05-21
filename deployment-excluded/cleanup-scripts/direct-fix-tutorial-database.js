/**
 * Direct Fix Tutorial Database Script
 * 
 * This script normalizes all tutorial entries in the database to use canonical tab names
 * and consolidates duplicate entries (different variants of the same tab).
 * 
 * Based on our analysis, it will:
 * 1. Keep entries with the highest progress
 * 2. Normalize tab names to canonical form
 * 3. Delete duplicate entries
 */

import pg from 'pg';
import * as dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

const { Client } = pg;

// ANSI color codes for pretty logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Pretty logging function with color support
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Main function to fix the database with known issues
 */
async function fixTutorialDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Connect to the database
    await client.connect();
    log('Connected to the database', colors.green);
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Fix Group 1: User evan.navarro@invela.com (ID: 8), Tab "file-vault"
    // Keep ID 19, normalize tab_name, delete IDs 9, 18
    log('\nFixing Group 1: file-vault duplicates for user ID 8', colors.yellow);
    await client.query('DELETE FROM user_tab_tutorials WHERE id IN (9, 18)');
    await client.query('UPDATE user_tab_tutorials SET tab_name = $1 WHERE id = $2', ['file-vault', 19]);
    log('  ✓ Kept ID 19, normalized to "file-vault", deleted IDs 9, 18', colors.green);
    
    // Fix Group 2: User evan.navarro@invela.com (ID: 8), Tab "claims"
    // Keep ID 22, delete IDs 2, 15
    log('\nFixing Group 2: claims duplicates for user ID 8', colors.yellow);
    await client.query('DELETE FROM user_tab_tutorials WHERE id IN (2, 15)');
    log('  ✓ Kept ID 22 (already normalized), deleted IDs 2, 15', colors.green);
    
    // Fix Group 3: User evan.navarro@invela.com (ID: 8), Tab "company-profile"
    // Keep ID 13, delete ID 17
    log('\nFixing Group 3: company-profile duplicates for user ID 8', colors.yellow);
    await client.query('DELETE FROM user_tab_tutorials WHERE id = 17');
    log('  ✓ Kept ID 13 (already normalized), deleted ID 17', colors.green);
    
    // Fix Group 4: User evan.navarro@invela.com (ID: 8), Tab "dashboard"
    // Keep ID 8, delete ID 20
    log('\nFixing Group 4: dashboard duplicates for user ID 8', colors.yellow);
    await client.query('DELETE FROM user_tab_tutorials WHERE id = 20');
    log('  ✓ Kept ID 8 (already normalized), deleted ID 20', colors.green);
    
    // Fix Group 5: User evan.navarro@invela.com (ID: 8), Tab "network"
    // Keep ID 12, delete IDs 3, 16
    log('\nFixing Group 5: network duplicates for user ID 8', colors.yellow);
    await client.query('DELETE FROM user_tab_tutorials WHERE id IN (3, 16)');
    log('  ✓ Kept ID 12 (already normalized), deleted IDs 3, 16', colors.green);
    
    // Commit the transaction
    await client.query('COMMIT');
    log('\nDatabase cleanup completed successfully! Tutorial entries have been normalized.', colors.green);
    
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    log(`\n${colors.bright}${colors.red}ERROR: ${error.message}`, colors.red);
    log(error.stack, colors.dim);
  } finally {
    // Close the database connection
    await client.end();
    log('\nDatabase connection closed.', colors.dim);
  }
}

// Run the main function
fixTutorialDatabase().catch(error => {
  log(`Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
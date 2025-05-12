/**
 * Direct Check Tutorial Entries Script
 * 
 * This script checks the tutorial entries in the database and identifies which ones
 * need to be normalized without making any changes. It shows what would happen if
 * the normalization script were run.
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
  underscore: '\x1b[4m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

/**
 * Pretty logging function with color support
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Normalizes tab names to a consistent format
 * This should be identical to the normalization function in the application
 * 
 * @param {string} inputTabName The tab name to normalize
 * @returns {string} The normalized (canonical) tab name
 */
function normalizeTabName(inputTabName) {
  // First, convert to lowercase and trim to handle case variations
  const cleanedTabName = inputTabName.toLowerCase().trim();
  
  // Define canonical names for each tab
  // This mapping ensures all variations of a tab name resolve to a single canonical name
  const tabMappings = {
    // Network tab variations
    'network-view': 'network',
    'network-visualization': 'network',
    
    // Claims tab variations
    'claims-risk': 'claims',
    'claims-risk-analysis': 'claims',
    
    // File vault tab variations
    'file-manager': 'file-vault',
    'filevault': 'file-vault',  // Handle PascalCase version
    'file-vault-page': 'file-vault',
    
    // Dashboard variations
    'dashboard-page': 'dashboard',
    
    // Company profile variations
    'company-profile-page': 'company-profile',
  };
  
  // Return the canonical version or the original cleaned name
  const canonicalName = tabMappings[cleanedTabName] || cleanedTabName;
  
  return canonicalName;
}

/**
 * Fetch all tutorial entries from the database
 */
async function fetchAllTutorialEntries(client) {
  log('Fetching all tutorial entries...', colors.cyan);
  
  const result = await client.query(`
    SELECT 
      id, 
      user_id, 
      tab_name, 
      completed, 
      current_step, 
      created_at, 
      updated_at, 
      completed_at, 
      last_seen_at
    FROM user_tab_tutorials
    ORDER BY user_id, tab_name, updated_at DESC
  `);
  
  log(`Found ${result.rows.length} tutorial entries in the database`, colors.green);
  return result.rows;
}

/**
 * Group entries by user ID and normalized tab name
 */
function groupEntriesByUserAndTab(entries) {
  const grouped = {};
  
  // Process each entry
  entries.forEach(entry => {
    const userId = entry.user_id;
    const originalTabName = entry.tab_name;
    const normalizedTabName = normalizeTabName(originalTabName);
    
    // Add metadata about normalization
    entry.original_tab_name = originalTabName;
    entry.normalized_tab_name = normalizedTabName;
    entry.needs_normalization = originalTabName !== normalizedTabName;
    
    // Create user object if it doesn't exist
    if (!grouped[userId]) {
      grouped[userId] = {};
    }
    
    // Create array for this normalized tab if it doesn't exist
    if (!grouped[userId][normalizedTabName]) {
      grouped[userId][normalizedTabName] = [];
    }
    
    // Add this entry to the appropriate group
    grouped[userId][normalizedTabName].push(entry);
  });
  
  return grouped;
}

/**
 * Find entries that need consolidation (more than one entry per normalized tab)
 */
function findDuplicatesNeedingConsolidation(groupedEntries) {
  const duplicates = [];
  
  Object.keys(groupedEntries).forEach(userId => {
    const userTabs = groupedEntries[userId];
    
    Object.keys(userTabs).forEach(tabName => {
      const entries = userTabs[tabName];
      
      // If there are multiple entries for this tab, it needs consolidation
      if (entries.length > 1) {
        duplicates.push({
          userId,
          tabName,
          entries
        });
      }
    });
  });
  
  return duplicates;
}

/**
 * Find entries that need normalization (tab_name is not in canonical form)
 */
function findEntriesNeedingNormalization(entries) {
  return entries.filter(entry => {
    return entry.original_tab_name !== entry.normalized_tab_name;
  });
}

/**
 * Main function to check tutorial entries
 */
async function checkTutorialEntries() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Connect to the database
    await client.connect();
    log('Connected to the database', colors.green);
    
    // Fetch all tutorial entries
    const entries = await fetchAllTutorialEntries(client);
    
    // Get user emails for better identification
    const userIdMap = {};
    const userResult = await client.query(`
      SELECT id, email FROM users WHERE id IN (
        SELECT DISTINCT user_id FROM user_tab_tutorials
      )
    `);
    userResult.rows.forEach(user => {
      userIdMap[user.id] = user.email;
    });
    
    // Group entries by user ID and normalized tab name
    const groupedEntries = groupEntriesByUserAndTab(entries);
    
    // Find duplicate entries needing consolidation
    const duplicateGroups = findDuplicatesNeedingConsolidation(groupedEntries);
    
    // Find single entries that just need their tab_name normalized
    const allDuplicateEntryIds = duplicateGroups.flatMap(group => group.entries.map(entry => entry.id));
    const nonDuplicateEntries = entries.filter(entry => !allDuplicateEntryIds.includes(entry.id));
    const normalizationNeededEntries = findEntriesNeedingNormalization(nonDuplicateEntries);
    
    // Log summary
    log(`\n${colors.bright}${colors.bgBlue}${colors.white} TUTORIAL ENTRIES ANALYSIS ${colors.reset}\n`);
    log(`Total tutorial entries: ${entries.length}`, colors.white);
    log(`Duplicate groups found: ${duplicateGroups.length}`, colors.yellow);
    log(`Entries needing tab name normalization only: ${normalizationNeededEntries.length}`, colors.cyan);
    
    if (duplicateGroups.length === 0 && normalizationNeededEntries.length === 0) {
      log('\nNo changes needed! Database is already normalized.', colors.green);
      return;
    }
    
    // Show details of duplicate groups
    if (duplicateGroups.length > 0) {
      log(`\n${colors.bright}${colors.bgMagenta}${colors.white} DUPLICATE TUTORIAL ENTRIES ${colors.reset}\n`);
      
      duplicateGroups.forEach((group, groupIndex) => {
        const { userId, tabName, entries } = group;
        const userEmail = userIdMap[userId] || 'Unknown';
        
        log(`Group ${groupIndex + 1}: User ${userEmail} (ID: ${userId}), Tab "${tabName}" has ${entries.length} duplicate entries:`, colors.yellow);
        
        // Print all duplicate entries
        entries.forEach((entry, index) => {
          const normalizationNeeded = entry.needs_normalization ? ` (needs normalization to "${entry.normalized_tab_name}")` : '';
          log(`  ${index + 1}. ID: ${entry.id}, Tab: "${entry.original_tab_name}"${normalizationNeeded}, Step: ${entry.current_step}, Completed: ${entry.completed}`, 
            entry.needs_normalization ? colors.red : colors.white);
        });
        
        // Find the entry with the highest progress that would be kept
        const sortedEntries = [...entries].sort((a, b) => {
          // First prioritize completed entries
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          
          // Then prioritize by current_step
          return b.current_step - a.current_step;
        });
        
        const entryToKeep = sortedEntries[0];
        const entriesToDelete = sortedEntries.slice(1).map(entry => entry.id);
        
        log(`  Would keep entry ID ${entryToKeep.id} (highest progress: step ${entryToKeep.current_step}, completed: ${entryToKeep.completed})`, colors.green);
        
        if (entryToKeep.needs_normalization) {
          log(`  Would normalize tab_name from "${entryToKeep.original_tab_name}" to "${entryToKeep.normalized_tab_name}"`, colors.cyan);
        }
        
        if (entriesToDelete.length > 0) {
          log(`  Would delete ${entriesToDelete.length} duplicate entries: ${entriesToDelete.join(', ')}`, colors.magenta);
        }
        
        log(''); // Add empty line for readability
      });
    }
    
    // Show details of entries needing normalization
    if (normalizationNeededEntries.length > 0) {
      log(`\n${colors.bright}${colors.bgCyan}${colors.white} ENTRIES NEEDING NORMALIZATION ${colors.reset}\n`);
      
      normalizationNeededEntries.forEach((entry, index) => {
        const userEmail = userIdMap[entry.user_id] || 'Unknown';
        
        log(`${index + 1}. ID: ${entry.id}, User: ${userEmail} (ID: ${entry.user_id})`, colors.yellow);
        log(`   Tab: "${entry.original_tab_name}" → "${entry.normalized_tab_name}", Step: ${entry.current_step}, Completed: ${entry.completed}`, colors.cyan);
      });
    }
    
    log('\nNote: No changes have been made. This is only a simulation.', colors.yellow);
    log('To apply these changes, run the normalization script: node direct-normalize-tutorial-database.js', colors.yellow);
    
  } catch (error) {
    log(`\n${colors.bright}${colors.bgRed}${colors.white} ERROR ${colors.reset} ${error.message}`, colors.red);
    log(error.stack, colors.dim);
  } finally {
    // Close the database connection
    await client.end();
    log('\nDatabase connection closed.', colors.dim);
  }
}

// Run the main function
checkTutorialEntries().catch(error => {
  log(`Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
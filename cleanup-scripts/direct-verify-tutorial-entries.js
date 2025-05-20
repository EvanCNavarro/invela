/**
 * Tutorial Entry Verification Script
 * 
 * This script verifies that tutorial entries exist for all tabs in the application
 * and provides a summary of tutorial entry status including completion states.
 */

import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;

// Load environment variables from .env file
dotenv.config();

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
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

// Enhanced logging function for better readability
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Main verification function
async function verifyTutorialEntries() {
  // Define all tab names that should have tutorial entries
  const expectedTabs = [
    'dashboard',
    'risk-score',
    'claims-risk',
    'network',
    'file-vault',
    'claims',
    'insights',
    'company-profile',
    'playground'
  ];
  
  // Connect to the database
  log(`Connecting to database...`, colors.cyan);
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    log(`Connected to database.`, colors.green);
    
    // Query for all tab tutorial entries
    const result = await client.query(`
      SELECT tab_name, completed, current_step, created_at, completed_at 
      FROM user_tab_tutorials
      ORDER BY tab_name, created_at
    `);
    
    // Show summary of existing entries
    log(`\n${colors.bright}${colors.bgBlue}${colors.white} TUTORIAL ENTRIES SUMMARY ${colors.reset}\n`);
    
    const allTabs = new Set(result.rows.map(row => row.tab_name));
    
    // Check for missing tabs
    const missingTabs = expectedTabs.filter(tab => !allTabs.has(tab));
    if (missingTabs.length > 0) {
      log(`${colors.red}Missing tutorial entries for tabs:${colors.reset}`, colors.red);
      missingTabs.forEach(tab => log(`  - ${tab}`, colors.red));
    } else {
      log(`${colors.green}✓ All expected tabs have tutorial entries.${colors.reset}`, colors.green);
    }
    
    // Group entries by tab name
    const entriesByTab = {};
    result.rows.forEach(row => {
      if (!entriesByTab[row.tab_name]) {
        entriesByTab[row.tab_name] = [];
      }
      entriesByTab[row.tab_name].push(row);
    });
    
    // Print details for each tab
    log(`\n${colors.bright}Details by tab:${colors.reset}`);
    Object.keys(entriesByTab).sort().forEach(tabName => {
      const entries = entriesByTab[tabName];
      const completedEntries = entries.filter(e => e.completed);
      const completionRate = (completedEntries.length / entries.length * 100).toFixed(0);
      
      // Determine status color
      let statusColor = colors.yellow;
      if (completionRate === '100') statusColor = colors.green;
      if (completionRate === '0') statusColor = colors.red;
      
      log(`\n${colors.cyan}${tabName}${colors.reset} (${entries.length} entries, ${statusColor}${completionRate}% completed${colors.reset}):`);
      
      // Show details for each entry
      entries.forEach((entry, index) => {
        const completionStatus = entry.completed 
          ? `${colors.green}Completed${colors.reset} on ${new Date(entry.completed_at).toLocaleString()}`
          : `${colors.yellow}In Progress${colors.reset} (step ${entry.current_step})`;
        
        log(`  ${index + 1}. Created: ${new Date(entry.created_at).toLocaleString()} - ${completionStatus}`);
      });
    });
    
    // Print overall stats
    const totalEntries = result.rows.length;
    const completedEntries = result.rows.filter(e => e.completed).length;
    const overallCompletionRate = (completedEntries / totalEntries * 100).toFixed(0);
    
    log(`\n${colors.bright}${colors.bgBlue}${colors.white} OVERALL STATS ${colors.reset}`);
    log(`Total tutorial entries: ${totalEntries}`);
    log(`Completed entries: ${completedEntries} (${overallCompletionRate}%)`);
    log(`Distinct tabs: ${Object.keys(entriesByTab).length}`);
    
    // Print tabs with the most entries (might indicate duplicate or test entries)
    const tabCounts = Object.entries(entriesByTab)
      .map(([tab, entries]) => ({ tab, count: entries.length }))
      .sort((a, b) => b.count - a.count);
    
    log(`\n${colors.bright}Tabs with most entries:${colors.reset}`);
    tabCounts.slice(0, 5).forEach(({ tab, count }) => {
      log(`  - ${tab}: ${count} entries`);
    });
    
  } catch (error) {
    log(`Error verifying tutorial entries: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Close database connection
    await client.end();
    log(`Database connection closed.`, colors.cyan);
  }
}

// Run the verification as a self-executing async function
(async () => {
  try {
    await verifyTutorialEntries();
  } catch (error) {
    console.error(error);
  }
})();
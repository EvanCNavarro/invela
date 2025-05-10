/**
 * Create Tab Tutorials Script
 * 
 * This script creates tutorial entries for all tabs in the application
 * (except task-center as requested) to ensure each tab shows the appropriate
 * tutorial modal when a user visits it for the first time.
 * 
 * It uses the existing API endpoints to create consistent entries in the database,
 * ensuring that the tutorial system works across all tabs with a single source of truth.
 */

const fetch = require('node-fetch');
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

// List of all tabs that should have tutorials
// This list matches the TUTORIAL_CONTENT object in TutorialManager.tsx
// The task-center tab is intentionally excluded as requested
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

// These are additional mappings to ensure all variations of tab names work
// This matches the normalizeTabName function in TutorialManager.tsx
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
 * Enhanced logging function to make the script output more readable
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Create a tutorial entry for a specific tab
 * 
 * @param {string} tabName - The name of the tab
 * @param {boolean} shouldForce - Force creation even if entry exists
 * @returns {Promise<boolean>} - Success status
 */
async function createTutorialEntry(tabName, shouldForce = false) {
  try {
    log(`Creating tutorial entry for tab: ${tabName}`, colors.cyan);
    
    // First check if the entry already exists
    const statusResponse = await fetch(`http://localhost:3000/api/user-tab-tutorials/${encodeURIComponent(tabName)}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const statusData = await statusResponse.json();
    
    // If entry exists and we're not forcing recreation, skip it
    if (statusData.exists && !shouldForce) {
      log(`  ✓ Tutorial entry already exists for ${tabName}`, colors.green);
      return true;
    }
    
    // Create or update the tutorial entry
    const response = await fetch('http://localhost:3000/api/user-tab-tutorials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tabName: tabName,
        completed: false,
        currentStep: 0,
        totalSteps: tabName === 'claims-risk' ? 4 : 5 // claims-risk has 4 steps, others default to 5
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      log(`  ✗ Error creating tutorial for ${tabName}: ${errorData}`, colors.red);
      return false;
    }
    
    const data = await response.json();
    log(`  ✓ Successfully created tutorial entry for ${tabName}`, colors.green);
    return true;
  } catch (error) {
    log(`  ✗ Exception while creating tutorial for ${tabName}: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Create all tab variations to ensure consistent behavior
 */
async function createTabVariations() {
  log('\nCreating entries for tab variations...', colors.bright);
  
  for (const [variation, normalizedName] of Object.entries(TAB_VARIATIONS)) {
    // Skip if the variation is 'task-center' related
    if (variation.includes('task-center')) continue;
    
    await createTutorialEntry(variation);
  }
}

/**
 * Main function to create all tutorial entries
 */
async function createAllTutorials() {
  log('🔄 Starting tutorial entry creation process...', colors.bright);
  
  // Create entries for primary tab names
  log('\nCreating entries for primary tabs...', colors.bright);
  let successCount = 0;
  
  for (const tab of TABS_TO_CREATE) {
    // Skip if the tab is 'task-center'
    if (tab === 'task-center') continue;
    
    const success = await createTutorialEntry(tab);
    if (success) successCount++;
  }
  
  // Create entries for tab variations
  await createTabVariations();
  
  // Verify tutorial entries
  log('\nVerifying tutorial entries...', colors.bright);
  const allEntries = await fetch('http://localhost:3000/api/user-tab-tutorials', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!allEntries.ok) {
    log('  ✗ Error verifying tutorial entries', colors.red);
  } else {
    const entriesData = await allEntries.json();
    log(`  ✓ Found ${entriesData.tutorials.length} tutorial entries in the database`, colors.green);
    
    // List all tutorial entries
    entriesData.tutorials.forEach(tutorial => {
      log(`    - ${tutorial.tabName} (step: ${tutorial.currentStep}, completed: ${tutorial.completed})`, colors.dim);
    });
  }
  
  log(`\n✅ Tutorial entries creation complete. Created ${successCount}/${TABS_TO_CREATE.length} entries.`, colors.bright);
}

// Run the script
createAllTutorials().catch(error => {
  log(`❌ Script execution failed: ${error.message}`, colors.red);
  process.exit(1);
});
/**
 * Enhanced Direct Database Tutorial Entry Creation
 * 
 * This script creates tutorial entries in the database for all main navigation tabs
 * It bypasses the API for direct database access, ensuring a consistent state
 * across the application for tutorials.
 * 
 * Each entry is configured with a consistent future completion date (to avoid NULL)
 * which helps maintain proper state display in the UI.
 * 
 * Note: This script uses CommonJS module format instead of ESM to avoid import errors
 */

// Use CommonJS requires instead of ESM imports for compatibility
const { db } = require('./db/index');
const { userTabTutorials } = require('./db/schema');

// Logger utility for better diagnostics
const logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}${data ? ': ' + JSON.stringify(data) : ''}`);
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}:`, error);
  },
  success: (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SUCCESS] ${message}`);
  },
  warning: (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [WARNING] ${message}`);
  }
};

const USER_ID = 8; // Target user ID

// Comprehensive list of tabs to create entries for
// This matches all main navigation tabs and includes proper normalization mapping
const tabs = [
  // Main navigation tabs - with both original and normalized names
  { name: 'dashboard', normalizedName: 'dashboard', steps: 4 },
  { name: 'network', normalizedName: 'network', steps: 4 },
  { name: 'task-center', normalizedName: 'task-center', steps: 5 },
  { name: 'file-vault', normalizedName: 'file-vault', steps: 4 },
  { name: 'insights', normalizedName: 'insights', steps: 4 },
  
  // Risk scoring tabs - matching the tab normalization in TutorialManager.tsx
  { name: 'risk-score', normalizedName: 'risk-score', steps: 5 },
  { name: 'risk-score-configuration', normalizedName: 'risk-score', steps: 5 },
  { name: 'claims-risk', normalizedName: 'claims-risk', steps: 4 },
  { name: 'claims-risk-analysis', normalizedName: 'claims-risk', steps: 4 },
  { name: 'network-view', normalizedName: 'network-view', steps: 4 },
  { name: 'network-visualization', normalizedName: 'network-view', steps: 4 },
  
  // Claims-related tabs
  { name: 'claims', normalizedName: 'claims', steps: 4 },
  
  // Other tabs that might need tutorials
  { name: 'company-profile', normalizedName: 'company-profile', steps: 4 },
  { name: 'playground', normalizedName: 'playground', steps: 3 }
];

/**
 * Creates tutorial entries for all tabs in the database
 * Ensures proper completion date handling and consistent state
 */
async function createTutorialEntries() {
  logger.info(`Creating tutorial entries for user ID: ${USER_ID}`);
  
  try {
    // Check if any entries already exist
    const existing = await db.query.userTabTutorials.findMany({
      where: (table) => table.user_id.equals(USER_ID)
    });
    
    logger.info(`Found ${existing.length} existing entries`, existing.map(e => e.tab_name));
    
    // Insert entries for each tab
    const results = {
      created: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const tab of tabs) {
      try {
        // Check if an entry already exists for this tab
        const existingTab = existing.find(e => e.tab_name === tab.name);
        
        if (existingTab) {
          logger.warning(`Entry already exists for tab "${tab.name}". Skipping.`);
          results.skipped++;
          continue;
        }
        
        // Create a new entry
        // Use a far-future date for completed_at to avoid NULL (helps with NOT NULL constraint)
        const now = new Date();
        const futureDate = new Date('2099-12-31');
        
        await db.insert(userTabTutorials).values({
          user_id: USER_ID,
          tab_name: tab.name,
          completed: false,
          current_step: 0,
          last_seen_at: now,
          completed_at: futureDate, // Important - prevents NULL in completed_at column
          created_at: now,
          updated_at: now
        });
        
        logger.success(`Created tutorial entry for tab "${tab.name}" (normalized: ${tab.normalizedName})`);
        results.created++;
      } catch (tabError) {
        logger.error(`Error creating tutorial entry for tab "${tab.name}"`, tabError);
        results.errors++;
      }
    }
    
    // Verify entries were created
    const afterEntries = await db.query.userTabTutorials.findMany({
      where: (table) => table.user_id.equals(USER_ID)
    });
    
    logger.info(`Results summary:`, results);
    logger.info(`Final count: ${afterEntries.length} entries`);
    
    // Print detailed results
    const tabDetails = afterEntries.map(entry => ({
      tabName: entry.tab_name,
      currentStep: entry.current_step,
      completed: entry.completed,
      lastSeenAt: entry.last_seen_at,
      completedAt: entry.completed_at
    }));
    
    logger.info('Tutorial entries details:', tabDetails);
    
    return { success: true, results, entries: tabDetails };
  } catch (error) {
    logger.error('Error creating tutorial entries', error);
    return { success: false, error: error.message };
  }
}

// Execute the function and handle errors
createTutorialEntries()
  .then(result => {
    if (result.success) {
      logger.success(`Tutorial entry creation completed. Created ${result.results.created} entries.`);
    } else {
      logger.error('Tutorial entry creation failed', result.error);
    }
  })
  .catch(error => {
    logger.error('Unhandled error in script execution', error);
  });
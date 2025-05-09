/**
 * Direct Database Tutorial Entry Creation
 * 
 * This script directly creates tutorial entries in the database
 * bypassing the API to diagnose issues with the tutorial system.
 */

import { db } from './db/index.js';
import { userTabTutorials } from './db/schema.js';

const USER_ID = 8; // Target user ID

// Tabs to create entries for
const tabs = [
  { name: 'risk-score', steps: 5 },
  { name: 'claims-risk', steps: 4 },
  { name: 'network-view', steps: 4 }
];

async function createTutorialEntries() {
  console.log(`Creating tutorial entries for user ID: ${USER_ID}`);
  
  try {
    // Check if any entries already exist
    const existing = await db.query.userTabTutorials.findMany({
      where: (table) => table.user_id.equals(USER_ID)
    });
    
    console.log(`Found ${existing.length} existing entries`);
    
    // Insert entries for each tab
    for (const tab of tabs) {
      // Check if an entry already exists for this tab
      const existingTab = existing.find(e => e.tab_name === tab.name);
      
      if (existingTab) {
        console.log(`Entry already exists for tab "${tab.name}". Skipping.`);
        continue;
      }
      
      // Create a new entry
      const now = new Date();
      await db.insert(userTabTutorials).values({
        user_id: USER_ID,
        tab_name: tab.name,
        completed: false,
        current_step: 0,
        last_seen_at: now,
        created_at: now,
        updated_at: now
      });
      
      console.log(`Created tutorial entry for tab "${tab.name}"`);
    }
    
    // Verify entries were created
    const afterEntries = await db.query.userTabTutorials.findMany({
      where: (table) => table.user_id.equals(USER_ID)
    });
    
    console.log(`Final count: ${afterEntries.length} entries`);
    console.log('Tutorial entries:', afterEntries);
    
    console.log('Successfully created tutorial entries');
  } catch (error) {
    console.error('Error creating tutorial entries:', error);
  }
}

// Execute the function
createTutorialEntries().catch(console.error);
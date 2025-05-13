/**
 * Force unlock file vault for a specific company
 * 
 * This script directly updates the company record in the database
 * and broadcasts a WebSocket event to update the UI
 */

import { db } from './db/index.js';
import { companies } from './db/schema.js';
import { eq } from 'drizzle-orm';

// Import the WebSocket broadcast function
import { broadcastMessage } from './server/services/websocket.js';

// Company ID to update (from the screenshots and logs)
const COMPANY_ID = 191; // DevelopmentTestingK company ID

async function unlockFileVault(companyId) {
  console.log(`[UNLOCK] Starting file vault unlock for company ID ${companyId}...`);
  
  try {
    // 1. Get the current company data
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      console.error(`[UNLOCK] ERROR: Company ID ${companyId} not found`);
      return false;
    }
    
    console.log(`[UNLOCK] Found company: ${company.name} (ID: ${company.id})`);
    
    // 2. Check if file-vault is already in available_tabs
    const currentTabs = company.available_tabs || ['task-center'];
    console.log(`[UNLOCK] Current tabs: ${JSON.stringify(currentTabs)}`);
    
    if (currentTabs.includes('file-vault')) {
      console.log(`[UNLOCK] File vault already unlocked for company ${company.name}`);
      
      // But let's force a WebSocket update anyway to test the client handling
      console.log(`[UNLOCK] Force broadcasting tab update event...`);
      await broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs: currentTabs,
        timestamp: new Date().toISOString()
      });
      
      return true;
    }
    
    // 3. Update the company with file-vault tab
    const updatedTabs = [...currentTabs, 'file-vault'];
    
    const [updatedCompany] = await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();
    
    console.log(`[UNLOCK] Successfully updated company tabs:`, {
      company: updatedCompany.name,
      previousTabs: currentTabs,
      newTabs: updatedTabs
    });
    
    // 4. Broadcast WebSocket event for this update
    console.log(`[UNLOCK] Broadcasting WebSocket event for tab update...`);
    await broadcastMessage('company_tabs_updated', {
      companyId,
      availableTabs: updatedTabs,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[UNLOCK] File vault successfully unlocked for company ${company.name}`);
    return true;
  } catch (error) {
    console.error(`[UNLOCK] ERROR unlocking file vault:`, error);
    return false;
  }
}

// Run the unlock function
unlockFileVault(COMPANY_ID)
  .then(success => {
    if (success) {
      console.log(`[UNLOCK] Unlock operation completed successfully`);
    } else {
      console.log(`[UNLOCK] Unlock operation failed`);
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`[UNLOCK] Unhandled error:`, error);
    process.exit(1);
  });
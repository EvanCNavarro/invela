/**
 * Emergency Fix: Force unlock File Vault for company ID 204
 * 
 * This script directly updates the company record in the database
 * and broadcasts a critical WebSocket message to update the UI
 */

const { db } = require('./db');
const { companies } = require('./db/schema');
const { eq } = require('drizzle-orm');

const COMPANY_ID = 204;

async function unlockFileVault() {
  console.log(`🔐 Attempting to unlock file vault for company ID ${COMPANY_ID}`);
  
  try {
    // Step 1: Get the current company data to check if the tab already exists
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, COMPANY_ID));
    
    if (!company) {
      console.error(`❌ Company with ID ${COMPANY_ID} not found`);
      return;
    }
    
    console.log(`📊 Current company details:`, {
      id: company.id,
      name: company.name, 
      tabs: company.available_tabs
    });
    
    // Step 2: Check if file-vault is already in the list
    const currentTabs = company.available_tabs || ['task-center'];
    
    if (currentTabs.includes('file-vault')) {
      console.log(`✅ File vault is already enabled for company ${COMPANY_ID}`);
      broadcastUpdate(company);
      return;
    }
    
    // Step 3: Add file-vault to the list of available tabs
    const updatedTabs = [...currentTabs, 'file-vault'];
    console.log(`🔄 Updating tabs from ${JSON.stringify(currentTabs)} to ${JSON.stringify(updatedTabs)}`);
    
    // Step 4: Update the database
    const [updatedCompany] = await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, COMPANY_ID))
      .returning();
    
    if (!updatedCompany) {
      console.error(`❌ Failed to update company ${COMPANY_ID} - no record returned`);
      return;
    }
    
    console.log(`✅ Successfully updated company ${COMPANY_ID}:`, {
      id: updatedCompany.id,
      name: updatedCompany.name,
      tabs: updatedCompany.available_tabs
    });
    
    // Step 5: Broadcast WebSocket event for immediate UI update
    broadcastUpdate(updatedCompany);
    
  } catch (error) {
    console.error(`❌ Error unlocking file vault:`, error);
  }
}

async function broadcastUpdate(company) {
  try {
    // Import WebSocket service
    const { broadcastMessage } = require('./server/services/websocket');
    
    // Clear any cache
    try {
      const { invalidateCompanyCache } = require('./server/routes');
      const invalidated = invalidateCompanyCache(COMPANY_ID);
      console.log(`🧹 Cache invalidation result:`, invalidated);
    } catch (cacheError) {
      console.error(`⚠️ Error invalidating cache:`, cacheError);
    }
    
    console.log(`📢 Broadcasting WebSocket update for company ${COMPANY_ID}`);
    
    // Send with cache_invalidation flag to force refresh
    broadcastMessage('company_tabs_updated', {
      companyId: COMPANY_ID,
      availableTabs: company.available_tabs,
      timestamp: new Date().toISOString(),
      source: 'emergency_fix_script',
      cache_invalidation: true
    });
    
    console.log(`📢 Sent WebSocket broadcast with cache_invalidation flag`);
    
    // Schedule multiple delayed broadcasts for reliability
    const delays = [500, 1500, 3000];
    for (const delay of delays) {
      setTimeout(() => {
        try {
          console.log(`📢 Sending delayed (${delay}ms) broadcast`);
          broadcastMessage('company_tabs_updated', {
            companyId: COMPANY_ID,
            availableTabs: company.available_tabs,
            timestamp: new Date().toISOString(),
            source: 'emergency_fix_script_delayed',
            delay,
            cache_invalidation: true
          });
        } catch (e) {
          console.error(`⚠️ Error in delayed broadcast:`, e);
        }
      }, delay);
    }
    
    console.log(`✅ Broadcasts scheduled`);
    
  } catch (error) {
    console.error(`❌ Error broadcasting update:`, error);
  }
}

// Run the script
unlockFileVault().then(() => {
  // Keep the script running for a few seconds to allow broadcasts to complete
  console.log(`🕒 Keeping script alive for broadcasts to complete...`);
  setTimeout(() => {
    console.log(`✅ Script execution complete`);
    process.exit(0);
  }, 5000);
}).catch(error => {
  console.error(`❌ Script execution failed:`, error);
  process.exit(1);
});
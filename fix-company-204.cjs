/**
 * Emergency Fix: Directly update company 204 to add file-vault tab
 */

// Fixed import paths
const { db } = require('./server/db');
const { companies } = require('./server/db/schema');
const { eq } = require('drizzle-orm');

const COMPANY_ID = 204;

async function fixCompany() {
  console.log(`[FIX] Starting emergency fix for company ID ${COMPANY_ID}`);
  
  try {
    // First get the current company data
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, COMPANY_ID));
      
    if (!company) {
      console.error(`[FIX] Company with ID ${COMPANY_ID} not found`);
      return false;
    }
    
    console.log(`[FIX] Current company data:`, {
      id: company.id,
      name: company.name,
      available_tabs: company.available_tabs
    });
    
    // Ensure we have the available_tabs array
    const currentTabs = company.available_tabs || ['task-center'];
    
    // Check if file-vault is already included
    if (currentTabs.includes('file-vault')) {
      console.log(`[FIX] File vault already enabled for company ${COMPANY_ID}`);
      
      // Even if it's already enabled, force a broadcast to refresh client caches
      try {
        const { broadcastMessage } = require('./server/services/websocket');
        broadcastMessage('company_tabs_updated', {
          companyId: COMPANY_ID,
          availableTabs: currentTabs,
          timestamp: new Date().toISOString(),
          source: 'emergency_fix_script',
          cache_invalidation: true
        });
        console.log(`[FIX] Forced WebSocket broadcast for company ${COMPANY_ID}`);
      } catch (wsError) {
        console.error(`[FIX] Failed to broadcast:`, wsError);
      }
      
      return true;
    }
    
    // Add file-vault to the tabs
    const updatedTabs = [...currentTabs, 'file-vault'];
    console.log(`[FIX] Updating tabs from ${JSON.stringify(currentTabs)} to ${JSON.stringify(updatedTabs)}`);
    
    // Update in the database
    const [updatedCompany] = await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, COMPANY_ID))
      .returning();
      
    if (!updatedCompany) {
      console.error(`[FIX] Failed to update company ${COMPANY_ID}`);
      return false;
    }
    
    console.log(`[FIX] Successfully updated company:`, {
      id: updatedCompany.id,
      name: updatedCompany.name,
      available_tabs: updatedCompany.available_tabs
    });
    
    // Broadcast WebSocket event to update clients
    try {
      const { broadcastMessage } = require('./server/services/websocket');
      
      // Important: Send with cache_invalidation flag
      broadcastMessage('company_tabs_updated', {
        companyId: COMPANY_ID,
        availableTabs: updatedCompany.available_tabs,
        timestamp: new Date().toISOString(),
        source: 'emergency_fix_script',
        cache_invalidation: true
      });
      
      console.log(`[FIX] WebSocket broadcast sent for company ${COMPANY_ID}`);
      
      // Clear any server-side cache
      try {
        const { invalidateCompanyCache } = require('./server/routes');
        invalidateCompanyCache(COMPANY_ID);
        console.log(`[FIX] Company cache invalidated for ID ${COMPANY_ID}`);
      } catch (cacheError) {
        console.error(`[FIX] Error invalidating cache:`, cacheError);
      }
      
      // Send additional delayed broadcasts for reliability
      setTimeout(() => {
        try {
          broadcastMessage('company_tabs_updated', {
            companyId: COMPANY_ID,
            availableTabs: updatedCompany.available_tabs,
            timestamp: new Date().toISOString(),
            source: 'emergency_fix_script_delayed',
            cache_invalidation: true
          });
          console.log(`[FIX] Delayed WebSocket broadcast sent`);
        } catch (e) {
          console.error(`[FIX] Error sending delayed broadcast:`, e);
        }
      }, 2000);
      
    } catch (wsError) {
      console.error(`[FIX] Failed to broadcast WebSocket message:`, wsError);
    }
    
    return true;
  } catch (error) {
    console.error(`[FIX] Error fixing company:`, error);
    return false;
  }
}

// Run the fix
fixCompany().then(success => {
  console.log(`[FIX] Fix operation complete, success: ${success}`);
  
  // Keep the script running long enough for delayed broadcasts
  setTimeout(() => {
    console.log(`[FIX] Exiting...`);
    process.exit(success ? 0 : 1);
  }, 3000);
}).catch(error => {
  console.error(`[FIX] Unexpected error:`, error);
  process.exit(1);
});
/**
 * Emergency Fix: Force unlock File Vault for company ID 204
 * 
 * This script directly updates the company record in the database
 * and broadcasts a critical WebSocket message to update the UI
 */

import { db } from './server/db/index.js';
import { companies } from './server/db/schema.js';
import { eq } from 'drizzle-orm';

// The company ID that needs fixing
const COMPANY_ID = 204;

async function unlockFileVault() {
  console.log(`[CRITICAL FIX] Starting file vault unlock for company ${COMPANY_ID}`);
  
  try {
    // First, get the current company data
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, COMPANY_ID));
      
    if (!company) {
      console.error(`[CRITICAL FIX] Company with ID ${COMPANY_ID} not found`);
      return false;
    }
    
    console.log(`[CRITICAL FIX] Current company data:`, {
      id: company.id,
      name: company.name,
      available_tabs: company.available_tabs
    });
    
    // Check current tabs
    const currentTabs = company.available_tabs || ['task-center'];
    
    // Check if file-vault is already in the tabs
    if (currentTabs.includes('file-vault')) {
      console.log(`[CRITICAL FIX] File vault already included in tabs for company ${COMPANY_ID}`);
      
      // Even if already included, we still want to force a WebSocket broadcast
      await broadcastUpdate(company);
      return true;
    }
    
    // Add file-vault to the tabs
    const updatedTabs = [...currentTabs, 'file-vault'];
    
    console.log(`[CRITICAL FIX] Updating tabs from ${JSON.stringify(currentTabs)} to ${JSON.stringify(updatedTabs)}`);
    
    // Update the company record
    const [updatedCompany] = await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, COMPANY_ID))
      .returning();
      
    if (!updatedCompany) {
      console.error(`[CRITICAL FIX] Failed to update company ${COMPANY_ID}`);
      return false;
    }
    
    console.log(`[CRITICAL FIX] Successfully updated company:`, {
      id: updatedCompany.id,
      name: updatedCompany.name,
      available_tabs: updatedCompany.available_tabs
    });
    
    // Broadcast the update to all connected clients
    await broadcastUpdate(updatedCompany);
    
    return true;
  } catch (error) {
    console.error('[CRITICAL FIX] Error unlocking file vault:', error);
    return false;
  }
}

async function broadcastUpdate(company) {
  try {
    // Import the WebSocket service
    const websocketModule = await import('./server/services/websocket.js');
    const { broadcastMessage } = websocketModule;
    
    // Broadcast the update with cache_invalidation flag to force client cache refresh
    broadcastMessage('company_tabs_updated', {
      companyId: company.id,
      availableTabs: company.available_tabs,
      timestamp: new Date().toISOString(),
      source: 'critical_fix_script',
      cache_invalidation: true,
      operation: 'unlock_file_vault_emergency'
    });
    
    console.log(`[CRITICAL FIX] WebSocket broadcast sent for company ${company.id}`);
    
    // Clear any server-side cache
    try {
      const routesModule = await import('./server/routes.js');
      const { invalidateCompanyCache } = routesModule;
      invalidateCompanyCache(company.id);
      console.log(`[CRITICAL FIX] Company cache invalidated for ID ${company.id}`);
    } catch (cacheError) {
      console.error(`[CRITICAL FIX] Error invalidating cache:`, cacheError);
    }
    
    // Schedule additional broadcasts to ensure clients receive the update
    setTimeout(async () => {
      try {
        // Re-import the module to ensure we have the latest reference
        const delayedModule = await import('./server/services/websocket.js');
        delayedModule.broadcastMessage('company_tabs_updated', {
          companyId: company.id,
          availableTabs: company.available_tabs,
          timestamp: new Date().toISOString(),
          source: 'critical_fix_script_delayed',
          cache_invalidation: true,
          operation: 'unlock_file_vault_emergency'
        });
        console.log(`[CRITICAL FIX] Delayed broadcast sent for company ${company.id}`);
      } catch (e) {
        console.error(`[CRITICAL FIX] Error in delayed broadcast:`, e);
      }
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('[CRITICAL FIX] Error broadcasting update:', error);
    return false;
  }
}

// Execute the fix
unlockFileVault().then(success => {
  console.log(`[CRITICAL FIX] Operation completed with status: ${success ? 'SUCCESS' : 'FAILURE'}`);
  
  // Keep process alive for delayed broadcasts
  setTimeout(() => {
    console.log(`[CRITICAL FIX] Exiting...`);
    process.exit(success ? 0 : 1);
  }, 3000);
}).catch(error => {
  console.error('[CRITICAL FIX] Unhandled error:', error);
  process.exit(1);
});
/**
 * Force unlock file vault for a specific company
 * 
 * This script directly updates the company record in the database
 * and broadcasts a WebSocket event to update the UI
 */

// Import required modules
const { db } = require('./db/index.js');
const { eq } = require('drizzle-orm');
const { companies } = require('./db/schema.js');

// Configuration - Set the company ID
const COMPANY_ID = process.argv[2] ? parseInt(process.argv[2]) : 203;

async function unlockFileVault(companyId) {
  console.log(`[Unlock] Force unlocking file vault for company ${companyId}...`);
  
  try {
    // Get the current company record
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      console.error(`[Unlock] Company ${companyId} not found!`);
      return null;
    }
    
    console.log(`[Unlock] Current company: ${company.name}`);
    console.log(`[Unlock] Current tabs: ${company.available_tabs?.join(', ') || 'none'}`);
    
    // Check if file-vault is already in available_tabs
    const hasFileVault = company.available_tabs && 
                         company.available_tabs.includes('file-vault');
    
    if (hasFileVault) {
      console.log(`[Unlock] File vault tab already exists for company ${companyId}`);
      
      // Even though tab already exists, invalidate cache and broadcast event
      // This helps with "stuck" UIs that might not be showing the tab
      console.log(`[Unlock] Forcing cache invalidation and WebSocket broadcast...`);
    } else {
      // Add file-vault to available_tabs
      const newTabs = company.available_tabs 
        ? [...company.available_tabs, 'file-vault'] 
        : ['task-center', 'file-vault'];
      
      // Update the company record
      const startTime = new Date();
      await db.update(companies)
        .set({ 
          available_tabs: newTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
      
      const endTime = new Date();
      const updateDuration = endTime - startTime;
      
      console.log(`[Unlock] Added file-vault tab to company ${companyId} (took ${updateDuration}ms)`);
      
      // Get the updated company record
      const [updatedCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
      
      console.log(`[Unlock] Updated tabs: ${updatedCompany.available_tabs?.join(', ') || 'none'}`);
    }
    
    // Invalidate the company cache
    try {
      const { invalidateCompanyCache } = require('./server/routes.js');
      const invalidated = invalidateCompanyCache(companyId);
      console.log(`[Unlock] Company cache invalidation result: ${invalidated}`);
    } catch (cacheError) {
      console.error(`[Unlock] Error invalidating company cache:`, cacheError);
    }
    
    // Broadcast WebSocket event
    try {
      const { broadcastMessage } = require('./server/services/websocket.js');
      
      broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs: hasFileVault ? company.available_tabs : [...(company.available_tabs || []), 'file-vault'],
        timestamp: new Date().toISOString(),
        source: 'force-unlock-file-vault-direct',
        cache_invalidation: true,
        operation: 'force_unlock_file_vault'
      });
      
      console.log(`[Unlock] WebSocket broadcast sent successfully`);
      
      // Send delayed broadcasts to ensure clients receive the update
      const delayTimes = [500, 1500, 3000]; // 0.5s, 1.5s, 3s delays
      
      for (const delay of delayTimes) {
        setTimeout(() => {
          try {
            console.log(`[Unlock] Sending delayed (${delay}ms) websocket broadcast`);
            broadcastMessage('company_tabs_updated', {
              companyId,
              availableTabs: hasFileVault ? company.available_tabs : [...(company.available_tabs || []), 'file-vault'],
              timestamp: new Date().toISOString(),
              source: 'force-unlock-file-vault-direct.delayed',
              delay,
              cache_invalidation: true,
              operation: 'force_unlock_file_vault'
            });
          } catch (e) {
            console.error(`[Unlock] Error in delayed WebSocket broadcast (${delay}ms):`, e);
          }
        }, delay);
      }
      
      return true;
    } catch (wsError) {
      console.error(`[Unlock] Error broadcasting WebSocket event:`, wsError);
      return false;
    }
  } catch (error) {
    console.error(`[Unlock] Error:`, error);
    return false;
  }
}

// Execute the script
unlockFileVault(COMPANY_ID)
  .then(result => {
    console.log(`[Unlock] ${result ? 'SUCCESS' : 'FAILED'}: File vault unlocking operation`);
    
    // Give time for the delayed broadcasts to complete before exiting
    setTimeout(() => {
      console.log(`[Unlock] Script completed.`);
      process.exit(0);
    }, 3500);
  })
  .catch(error => {
    console.error(`[Unlock] Unexpected error:`, error);
    process.exit(1);
  });
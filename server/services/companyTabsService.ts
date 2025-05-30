/**
 * Service for managing company tabs and permissions
 * This service provides utilities for updating company available_tabs
 * in a safe and consistent manner.
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastTaskUpdate } from "../utils/unified-websocket";
import { invalidateCompanyCache } from '../routes';

export const CompanyTabsService = {
  /**
   * Adds specified tabs to a company if not already present
   * Returns the updated company record with new tabs
   */
  async addTabsToCompany(companyId: number, tabsToAdd: string[]) {
    if (!companyId || !tabsToAdd.length) {
      console.warn('[CompanyTabsService] Invalid parameters for addTabsToCompany');
      return null;
    }

    try {
      // Get current company data
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        console.error(`[CompanyTabsService] Company with ID ${companyId} not found`);
        return null;
      }

      // Get current tabs or default to task-center
      const currentTabs = company.available_tabs || ['task-center'];
      
      // Check which tabs need to be added
      const tabsToActuallyAdd = tabsToAdd.filter(tab => !currentTabs.includes(tab));
      
      // If no new tabs to add, return the existing company data
      if (tabsToActuallyAdd.length === 0) {
        console.log(`[CompanyTabsService] Company ${companyId} already has all requested tabs`);
        return company;
      }
      
      // Add new tabs
      const updatedTabs = [...currentTabs, ...tabsToActuallyAdd];
      
      console.log(`[CompanyTabsService] Adding tabs to company ${companyId}:`, {
        tabsAdded: tabsToActuallyAdd,
        previousTabs: currentTabs,
        newTabs: updatedTabs
      });
      
      // Update the company record
      const [updatedCompany] = await db.update(companies)
        .set({
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
        
      console.log(`[CompanyTabsService] Successfully updated company tabs for ${companyId}`);
      
      // Broadcast a WebSocket event to notify all clients of the tab update
      try {
        // Use the imported WebSocketService
        WebSocketService.broadcastCompanyTabsUpdate(companyId, updatedCompany.available_tabs);
        
        console.log(`[CompanyTabsService] Broadcasted company_tabs_updated event via WebSocket for company ${companyId}`);
      } catch (wsError) {
        console.error(`[CompanyTabsService] Failed to broadcast WebSocket event:`, wsError);
      }
      
      return updatedCompany;
    } catch (error) {
      console.error('[CompanyTabsService] Error updating company tabs:', error);
      return null;
    }
  },

  /**
   * Safely unlocks the file vault for a company
   * This should be called after form submission to ensure
   * users can access the file vault.
   * 
   * PERFORMANCE CRITICAL: This must execute quickly to ensure
   * users see the file vault tab immediately after submission.
   */
  async unlockFileVault(companyId: number) {
    if (!companyId) {
      console.warn('[CompanyTabsService] Invalid company ID provided for file vault unlock');
      return null;
    }

    try {
      // Enhanced logging to track exact execution timing
      const operationStartTime = new Date();
      console.log(`[CompanyTabsService] ⚡ CRITICAL TIMING: File vault unlock operation started for company ${companyId} at ${operationStartTime.toISOString()}`);
      
      // DEBUGGING: First fetch the company to check current state
      const [currentCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
        
      if (!currentCompany) {
        console.error(`[CompanyTabsService] Company with ID ${companyId} not found`);
        return null;
      }
      
      console.log(`[CompanyTabsService] Current company state before unlock:`, {
        companyId,
        name: currentCompany.name,
        available_tabs: currentCompany.available_tabs,
        timestamp: new Date().toISOString()
      });
      
      // Ensure we have a proper available_tabs array to work with
      const currentTabs = currentCompany.available_tabs || ['task-center'];
      
      // Check if file-vault is already in the array
      if (currentTabs.includes('file-vault')) {
        console.log(`[CompanyTabsService] File vault tab already enabled for company ${companyId}`);
        return currentCompany;
      }
      
      // BUGFIX: Use both SQL and object based approach for maximum compatibility
      const timestamp = new Date();
      console.log(`[CompanyTabsService] Directly updating company ${companyId} with file-vault tab at ${timestamp.toISOString()}`);
      
      // Update with both SQL and standard object approach
      try {
        // First try with simpler approach - add file-vault to the array directly
        const updatedTabs = [...currentTabs, 'file-vault'];
        console.log(`[CompanyTabsService] Updating company ${companyId} tabs from ${JSON.stringify(currentTabs)} to ${JSON.stringify(updatedTabs)}`);
        
        const [updatedCompany] = await db.update(companies)
          .set({
            available_tabs: updatedTabs,
            updated_at: timestamp
          })
          .where(eq(companies.id, companyId))
          .returning();
          
        if (updatedCompany) {
          console.log(`[CompanyTabsService] Successfully updated using direct array approach:`, {
            companyId,
            newTabs: updatedCompany.available_tabs,
            timestamp: new Date().toISOString()
          });
          
          // If we got here, the update succeeded
          return updatedCompany;
        }
      } catch (directUpdateError) {
        console.error(`[CompanyTabsService] Error updating with direct array approach:`, directUpdateError);
      }
      
      // Fallback to SQL expression approach if the direct update failed
      console.log(`[CompanyTabsService] Falling back to SQL expression approach for company ${companyId}`);
      
      // Use a SQL expression to conditionally add file-vault if it doesn't exist
      const [updatedCompany] = await db.update(companies)
        .set({
          // PERFORMANCE: Use raw SQL with a case statement for conditional array update
          // This avoids needing to fetch the current array first
          available_tabs: db.sql`
            CASE 
              WHEN 'file-vault' = ANY(${companies.available_tabs}) THEN ${companies.available_tabs}
              WHEN ${companies.available_tabs} IS NULL THEN array['task-center', 'file-vault']
              ELSE array_append(${companies.available_tabs}, 'file-vault')
            END
          `,
          updated_at: timestamp
        })
        .where(eq(companies.id, companyId))
        .returning();
        
      if (!updatedCompany) {
        console.error(`[CompanyTabsService] Failed to update company ${companyId} - no record returned`);
        return null;
      }
        
      // Log the completion time of the database update
      const dbUpdateCompleteTime = new Date();
      const dbUpdateTime = dbUpdateCompleteTime.getTime() - operationStartTime.getTime();
      console.log(`[CompanyTabsService] ⚡ CRITICAL TIMING: Database update completed in ${dbUpdateTime}ms at ${dbUpdateCompleteTime.toISOString()}`);
      console.log(`[CompanyTabsService] Successfully unlocked file vault for company ${companyId}:`, {
        newTabs: updatedCompany.available_tabs,
        timestamp: timestamp.toISOString()
      });
      
      // CRITICAL: Invalidate the company cache
      try {
        // Use the imported invalidateCompanyCache function directly
        const cacheInvalidated = invalidateCompanyCache(companyId);
        
        if (cacheInvalidated) {
          console.log(`[CompanyTabsService] ⚡ CRITICAL: Successfully invalidated company ${companyId} cache`);
        } else {
          console.log(`[CompanyTabsService] Company ${companyId} not found in cache, no invalidation needed`);
        }
      } catch (cacheError) {
        console.error(`[CompanyTabsService] Error invalidating company cache:`, cacheError);
      }
      
      // CRITICAL: Broadcast the WebSocket event immediately
      let broadcastSuccess = false;
      try {
        // Use the imported WebSocketService directly
        
        // Use both broadcast methods for redundancy
        // 1. Use the specific company tabs update method 
        WebSocketService.broadcastCompanyTabsUpdate(companyId, updatedCompany.available_tabs);
        
        // 2. Also use the generic broadcast method as backup with cache_invalidation flag
        WebSocketService.broadcastMessage('company_tabs_updated', {
          companyId,
          availableTabs: updatedCompany.available_tabs,
          timestamp: new Date().toISOString(),
          source: 'companyTabsService.unlockFileVault',
          cache_invalidation: true,  // Critical flag to force client cache refresh
          operation: 'unlock_file_vault'
        });
        
        broadcastSuccess = true;
        console.log(`[CompanyTabsService] ✅ Broadcasted company_tabs_updated event via WebSocket for company ${companyId} with cache_invalidation flag`);
        
        // 3. Schedule additional delayed broadcasts to ensure clients receive the update
        // This helps with clients that might be reconnecting due to network issues
        const delayTimes = [500, 1500, 3000]; // 0.5s, 1.5s, 3s delays
        for (const delay of delayTimes) {
          setTimeout(() => {
            try {
              console.log(`[CompanyTabsService] Sending delayed (${delay}ms) websocket broadcast for file vault unlock, company ${companyId}`);
              WebSocketService.broadcastMessage('company_tabs_updated', {
                companyId,
                availableTabs: updatedCompany.available_tabs,
                timestamp: new Date().toISOString(),
                source: 'companyTabsService.unlockFileVault.delayed',
                delay,
                cache_invalidation: true,  // Critical flag to force client cache refresh
                operation: 'unlock_file_vault'
              });
            } catch (e) {
              console.error(`[CompanyTabsService] Error in delayed WebSocket broadcast (${delay}ms):`, e);
            }
          }, delay);
        }
      } catch (wsError) {
        console.error(`[CompanyTabsService] Failed to broadcast WebSocket event:`, wsError);
      }
      
      // Log total operation time
      const totalTime = new Date().getTime() - operationStartTime.getTime();
      console.log(`[CompanyTabsService] ⚡ CRITICAL TIMING: File vault unlock operation completed in ${totalTime}ms, broadcast success: ${broadcastSuccess}`);
      
      return updatedCompany;
    } catch (error) {
      console.error('[CompanyTabsService] Error unlocking file vault:', error);
      return null;
    }
  }
};
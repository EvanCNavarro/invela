/**
 * Service for managing company tabs and permissions
 * This service provides utilities for updating company available_tabs
 * in a safe and consistent manner.
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';

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
        // Import the correct WebSocket service functions from our implementation
        const { broadcastCompanyTabsUpdate } = require('../services/websocket');
        
        // Call the specific broadcast function we created for company tabs
        broadcastCompanyTabsUpdate(companyId, updatedCompany.available_tabs);
        
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
      // OPTIMIZATION: Use a direct update instead of select-then-update
      // This reduces round-trips and transaction time
      
      // Directly update the company record with a SQL expression that safely adds
      // 'file-vault' to the available_tabs array if it's not already there
      // Using SQL concatenation is faster than the previous JavaScript approach
      const timestamp = new Date();
      console.log(`[CompanyTabsService] Directly updating company ${companyId} with file-vault tab at ${timestamp.toISOString()}`);
      
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
        
      console.log(`[CompanyTabsService] Successfully unlocked file vault for company ${companyId}:`, {
        newTabs: updatedCompany.available_tabs,
        timestamp: timestamp.toISOString()
      });
      
      // CRITICAL: Broadcast a WebSocket event to notify all clients of the tab update
      // This needs to happen immediately to ensure real-time updates
      try {
        // Import the WebSocket service and broadcast right away
        const { broadcastCompanyTabsUpdate } = require('../services/websocket');
        broadcastCompanyTabsUpdate(companyId, updatedCompany.available_tabs);
        
        console.log(`[CompanyTabsService] Broadcasted company_tabs_updated event via WebSocket for company ${companyId}`);
      } catch (wsError) {
        console.error(`[CompanyTabsService] Failed to broadcast WebSocket event:`, wsError);
      }
      
      return updatedCompany;
    } catch (error) {
      console.error('[CompanyTabsService] Error unlocking file vault:', error);
      return null;
    }
  }
};
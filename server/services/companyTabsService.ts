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
   */
  async unlockFileVault(companyId: number) {
    if (!companyId) {
      console.warn('[CompanyTabsService] Invalid company ID provided for file vault unlock');
      return null;
    }

    try {
      // Get current company data
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        console.error(`[CompanyTabsService] Company with ID ${companyId} not found for file vault unlock`);
        return null;
      }

      // Get current tabs or default to task-center
      const currentTabs = company.available_tabs || ['task-center'];
      
      // Check if file-vault is already present
      if (currentTabs.includes('file-vault')) {
        console.log(`[CompanyTabsService] Company ${companyId} already has file-vault tab`);
        return company;
      }
      
      // Add file-vault tab
      const updatedTabs = [...currentTabs, 'file-vault'];
      
      console.log(`[CompanyTabsService] Adding file-vault tab to company ${companyId}`);
      
      // Update the company record
      const [updatedCompany] = await db.update(companies)
        .set({
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
        
      console.log(`[CompanyTabsService] Successfully unlocked file vault for company ${companyId}:`, {
        previousTabs: currentTabs,
        newTabs: updatedCompany.available_tabs
      });
      
      // Broadcast a WebSocket event to notify all clients of the tab update
      try {
        const { wsService } = require('./websocket');
        wsService.broadcast('company_tabs_updated', {
          companyId,
          availableTabs: updatedCompany.available_tabs,
          timestamp: new Date().toISOString()
        });
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
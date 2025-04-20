import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';

/**
 * Service for managing company tabs and permissions
 * This service provides utilities for updating company available_tabs
 * in a safe and consistent manner.
 */
export const CompanyTabsService = {
  /**
   * Adds specified tabs to a company if not already present
   * Returns the updated company record with new tabs
   */
  async addTabsToCompany(companyId: number, tabsToAdd: string[]) {
    if (!companyId || !Array.isArray(tabsToAdd) || tabsToAdd.length === 0) {
      console.warn('[CompanyTabsService] Invalid parameters for addTabsToCompany', {
        companyId,
        tabsToAdd,
        timestamp: new Date().toISOString()
      });
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
      let updatedTabs = [...currentTabs];
      let tabsChanged = false;

      // Add each tab that's not already present
      for (const tab of tabsToAdd) {
        if (!currentTabs.includes(tab)) {
          updatedTabs.push(tab);
          tabsChanged = true;
          console.log(`[CompanyTabsService] Adding tab ${tab} to company ${company.id} available tabs`);
        }
      }

      // Only update if tabs were actually changed
      if (tabsChanged) {
        const [updatedCompany] = await db.update(companies)
          .set({
            available_tabs: updatedTabs,
            updated_at: new Date()
          })
          .where(eq(companies.id, companyId))
          .returning();

        console.log('[CompanyTabsService] Successfully updated company tabs:', {
          companyId,
          previousTabs: currentTabs,
          newTabs: updatedCompany.available_tabs,
          timestamp: new Date().toISOString()
        });

        return updatedCompany;
      } else {
        console.log('[CompanyTabsService] No tab changes needed for company:', {
          companyId,
          currentTabs,
          timestamp: new Date().toISOString()
        });

        return company; // Return original company since no changes made
      }
    } catch (error) {
      console.error('[CompanyTabsService] Error updating company tabs:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        companyId,
        tabsToAdd,
        timestamp: new Date().toISOString()
      });
      
      return null;
    }
  },

  /**
   * Safely unlocks the file vault for a company
   * This should be called after form submission to ensure
   * users can access the file vault.
   */
  async unlockFileVault(companyId: number) {
    return this.addTabsToCompany(companyId, ['file-vault']);
  }
};

export default CompanyTabsService;
/**
 * Company Tabs Service
 * 
 * This service handles unlocking and managing company tabs/features
 * throughout the application. It ensures consistent tab state management
 * and proper unlocking of features based on completed tasks.
 */

import { sql } from 'drizzle-orm';
import { db } from '@db';
import { companies } from '@db/schema';
import { logger } from '../utils/logger';
import { broadcastMessage } from '../websocket';

const tabsLogger = logger.child({ module: 'CompanyTabsService' });

/**
 * Service for managing company tabs
 */
export class CompanyTabsService {
  /**
   * Unlock specific tabs for a company
   * 
   * @param companyId The ID of the company
   * @param tabsToUnlock The tab names to unlock
   * @returns True if successful, false otherwise
   */
  static async unlockCompanyTabs(
    companyId: number,
    tabsToUnlock: string[]
  ): Promise<boolean> {
    if (!companyId || !tabsToUnlock.length) {
      tabsLogger.warn('Invalid parameters for unlockCompanyTabs', { companyId, tabsToUnlock });
      return false;
    }

    tabsLogger.info(`Unlocking tabs for company ${companyId}`, { tabs: tabsToUnlock });
    
    try {
      // Get current company data
      const company = await db.query.companies.findFirst({
        where: sql`id = ${companyId}`,
        columns: {
          id: true,
          available_tabs: true,
        },
      });
      
      if (!company) {
        tabsLogger.error(`Company ${companyId} not found`);
        return false;
      }
      
      // Parse available tabs or create empty array if none
      let availableTabs: string[] = [];
      try {
        availableTabs = company.available_tabs ? JSON.parse(company.available_tabs as string) : [];
      } catch (e) {
        tabsLogger.warn(`Failed to parse available_tabs for company ${companyId}, using empty array`);
      }
      
      // Add the new tabs without duplicates
      const newTabs = [...new Set([...availableTabs, ...tabsToUnlock])];
      
      // Update the company record
      await db.update(companies)
        .set({
          available_tabs: JSON.stringify(newTabs),
          updated_at: new Date(),
        })
        .where(sql`id = ${companyId}`);
      
      // Broadcast the update via WebSocket
      broadcastMessage('company_tabs_updated', {
        companyId,
        tabs: newTabs,
        addedTabs: tabsToUnlock,
        timestamp: new Date().toISOString(),
      });
      
      tabsLogger.info(`Successfully unlocked tabs for company ${companyId}`, { tabs: tabsToUnlock });
      return true;
    } catch (error) {
      tabsLogger.error(`Error unlocking tabs for company ${companyId}:`, error);
      return false;
    }
  }

  /**
   * Add tabs to a company
   * 
   * @param companyId The ID of the company
   * @param tabsToAdd The tabs to add
   * @returns Updated company or null if operation failed
   */
  static async addTabsToCompany(companyId: number, tabsToAdd: string[]): Promise<any> {
    if (!companyId || !tabsToAdd.length) {
      tabsLogger.warn('Invalid parameters for addTabsToCompany', { companyId, tabsToAdd });
      return null;
    }

    try {
      // First, unlock the tabs
      const unlockSuccess = await CompanyTabsService.unlockCompanyTabs(companyId, tabsToAdd);
      if (!unlockSuccess) {
        return null;
      }

      // Then fetch the updated company
      const company = await db.query.companies.findFirst({
        where: sql`id = ${companyId}`,
      });

      return company;
    } catch (error) {
      tabsLogger.error(`Error adding tabs to company ${companyId}:`, error);
      return null;
    }
  }

  /**
   * Unlock the file vault tab for a company
   * 
   * @param companyId The ID of the company
   * @returns Updated company or null if operation failed
   */
  static async unlockFileVault(companyId: number): Promise<any> {
    if (!companyId) {
      tabsLogger.warn('Invalid company ID for unlockFileVault', { companyId });
      return null;
    }

    try {
      // First, unlock the file-vault tab
      const unlockSuccess = await CompanyTabsService.unlockCompanyTabs(companyId, ['file-vault']);
      if (!unlockSuccess) {
        return null;
      }

      // Then fetch the updated company
      const company = await db.query.companies.findFirst({
        where: sql`id = ${companyId}`,
      });

      return company;
    } catch (error) {
      tabsLogger.error(`Error unlocking file vault for company ${companyId}:`, error);
      return null;
    }
  }

  /**
   * Get available tabs for a company
   * 
   * @param companyId The ID of the company
   * @returns Array of available tab names
   */
  static async getCompanyTabs(companyId: number): Promise<string[]> {
    if (!companyId) {
      tabsLogger.warn('Invalid company ID for getCompanyTabs', { companyId });
      return [];
    }
    
    try {
      const company = await db.query.companies.findFirst({
        where: sql`id = ${companyId}`,
        columns: {
          available_tabs: true,
        },
      });
      
      if (!company) {
        tabsLogger.error(`Company ${companyId} not found for getCompanyTabs`);
        return [];
      }
      
      // Parse available tabs or return empty array
      try {
        return company.available_tabs ? JSON.parse(company.available_tabs as string) : [];
      } catch (e) {
        tabsLogger.warn(`Failed to parse available_tabs for company ${companyId}`);
        return [];
      }
    } catch (error) {
      tabsLogger.error(`Error getting tabs for company ${companyId}:`, error);
      return [];
    }
  }
}

// For backward compatibility
export const unlockCompanyTabs = CompanyTabsService.unlockCompanyTabs;
export const getCompanyTabs = CompanyTabsService.getCompanyTabs;

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
 * Get available tabs for a company
 * 
 * @param companyId The ID of the company
 * @returns Array of available tab names
 */
export async function getCompanyTabs(companyId: number): Promise<string[]> {
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

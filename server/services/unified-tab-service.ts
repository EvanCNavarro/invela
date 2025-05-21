import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { tabLogger } from '../utils/tab-access-logger';
import { broadcast } from '../utils/websocket';


/**
 * Unified Tab Service
 * 
 * Central service for managing tabs access across the application.
 * Follows the Single Responsibility Principle by handling all tab operations.
 */
export class UnifiedTabService {
  /**
   * Add tabs to a company
   * @param companyId Company ID
   * @param tabs Array of tab identifiers to add
   * @param source Source of the tab update (for logging)
   */
  static async addTabsToCompany(
    companyId: number, 
    tabs: string[], 
    source: string = 'api'
  ): Promise<string[]> {
    tabLogger.info('Adding tabs to company', { companyId, tabs, source });
    
    try {
      // Get current company data
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (!company) {
        tabLogger.error('Company not found when adding tabs', { companyId });
        return [];
      }
      
      // Normalize existing tabs
      const currentTabs = Array.isArray(company.available_tabs) 
        ? company.available_tabs 
        : ['task-center'];
      
      // Add new tabs (if not already present)
      const updatedTabs = [...new Set([...currentTabs, ...tabs])];
      
      // Only update if there are actual changes
      if (updatedTabs.length === currentTabs.length && 
          updatedTabs.every(tab => currentTabs.includes(tab))) {
        tabLogger.debug('No new tabs to add, skipping update', { 
          companyId, 
          currentTabs 
        });
        return currentTabs;
      }
      
      // Update company record
      await db.update(companies)
        .set({ 
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
      
      // Broadcast update to all connected clients
      this.broadcastTabUpdate(companyId, updatedTabs, source);
      
      tabLogger.info('Successfully added tabs to company', {
        companyId,
        addedTabs: tabs,
        allTabs: updatedTabs,
        source
      });
      
      return updatedTabs;
    } catch (error) {
      tabLogger.error('Error adding tabs to company', {
        companyId,
        tabs,
        error,
        source
      });
      throw error;
    }
  }
  
  /**
   * Remove tabs from a company
   * @param companyId Company ID 
   * @param tabs Array of tab identifiers to remove
   * @param source Source of the tab update (for logging)
   */
  static async removeTabsFromCompany(
    companyId: number, 
    tabs: string[],
    source: string = 'api'
  ): Promise<string[]> {
    tabLogger.info('Removing tabs from company', { companyId, tabs, source });
    
    try {
      // Get current company data
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (!company) {
        tabLogger.error('Company not found when removing tabs', { companyId });
        return [];
      }
      
      // Normalize existing tabs
      const currentTabs = Array.isArray(company.available_tabs) 
        ? company.available_tabs 
        : ['task-center'];
      
      // Remove specified tabs
      const updatedTabs = currentTabs.filter((tab: string) => !tabs.includes(tab));
      
      // Only update if there are actual changes
      if (updatedTabs.length === currentTabs.length) {
        tabLogger.debug('No tabs to remove, skipping update', { 
          companyId, 
          currentTabs 
        });
        return currentTabs;
      }
      
      // Update company record
      await db.update(companies)
        .set({ 
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
      
      // Broadcast update to all connected clients
      this.broadcastTabUpdate(companyId, updatedTabs, source);
      
      tabLogger.info('Successfully removed tabs from company', {
        companyId,
        removedTabs: tabs,
        remainingTabs: updatedTabs,
        source
      });
      
      return updatedTabs;
    } catch (error) {
      tabLogger.error('Error removing tabs from company', {
        companyId,
        tabs,
        error,
        source
      });
      throw error;
    }
  }
  
  /**
   * Set available tabs for a company (replaces all existing tabs)
   * @param companyId Company ID
   * @param tabs Complete array of available tabs
   * @param source Source of the tab update (for logging)
   */
  static async setCompanyTabs(
    companyId: number, 
    tabs: string[],
    source: string = 'api'
  ): Promise<string[]> {
    tabLogger.info('Setting company tabs', { companyId, tabs, source });
    
    try {
      // Always ensure task-center is present
      const normalizedTabs = ['task-center', ...tabs.filter(tab => tab !== 'task-center')];
      
      // Update company record
      await db.update(companies)
        .set({ 
          available_tabs: normalizedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
      
      // Broadcast update to all connected clients
      this.broadcastTabUpdate(companyId, normalizedTabs, source);
      
      tabLogger.info('Successfully set company tabs', {
        companyId,
        tabs: normalizedTabs,
        source
      });
      
      return normalizedTabs;
    } catch (error) {
      tabLogger.error('Error setting company tabs', {
        companyId,
        tabs,
        error,
        source
      });
      throw error;
    }
  }
  
  /**
   * Broadcast tab updates via WebSocket
   * @param companyId Company ID
   * @param availableTabs Updated available tabs
   * @param source Source of the update (for tracking)
   */
  static broadcastTabUpdate(
    companyId: number, 
    availableTabs: string[], 
    source: string = 'api'
  ): void {
    // Use a single standardized event type
    broadcast('company_tabs_updated', {
      companyId,
      availableTabs,
      cache_invalidation: true,
      timestamp: new Date().toISOString(),
      source
    });
    
    tabLogger.debug('Broadcast company tabs update via WebSocket', {
      companyId,
      availableTabs,
      source
    });
  }
  
  /**
   * Unlocks appropriate tabs based on form submission type
   * @param companyId Company ID
   * @param formType Type of form being submitted
   * @param options Additional options
   * @returns Object with unlocked tabs information
   */
  static async unlockTabsForFormSubmission(
    companyId: number,
    formType: string,
    options: { broadcast?: boolean } = {}
  ): Promise<{ availableTabs: string[] }> {
    tabLogger.info('Unlocking tabs for form submission', { companyId, formType });
    
    try {
      // Determine which tabs to unlock based on form type
      let tabsToUnlock: string[] = [];
      
      if (formType === 'kyb' || formType === 'company_kyb') {
        // KYB unlocks the File Vault tab
        tabsToUnlock = ['file-vault'];
      } else if (formType === 'open_banking' || formType === 'open_banking_survey') {
        // Open Banking unlocks dashboard and insights
        tabsToUnlock = ['dashboard', 'insights'];
      } else if (formType === 'card' || formType === 'company_card') {
        // Card industry forms unlock dashboard
        tabsToUnlock = ['dashboard'];
      }
      // KY3P doesn't unlock any tabs
      
      // Only proceed if there are tabs to unlock
      if (tabsToUnlock.length > 0) {
        const updatedTabs = await this.addTabsToCompany(companyId, tabsToUnlock, 'form_submission');
        return { availableTabs: updatedTabs };
      }
      
      // Return current tabs if no changes needed
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      const currentTabs = company?.available_tabs || [];
      return { availableTabs: currentTabs };
    } catch (error) {
      tabLogger.error('Error unlocking tabs for form submission', {
        companyId,
        formType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}

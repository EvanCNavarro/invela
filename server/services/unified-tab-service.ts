/**
 * Unified Tab Service
 * 
 * This service provides a single, reliable mechanism for unlocking tabs
 * for a company based on form submissions. It ensures that tab updates
 * are properly persisted and broadcast to clients in real-time.
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import getLogger from '../utils/logger';

// Get a dedicated logger for this service
const logger = getLogger('UnifiedTabService');

/**
 * Tab unlocking service with standardized approach for all form types
 */
export class UnifiedTabService {
  /**
   * Unlock specific tabs for a company
   * 
   * @param companyId - The company ID
   * @param tabsToUnlock - Array of tabs to unlock
   * @returns Promise resolving to true if successful, false otherwise
   */
  static async unlockTabs(companyId: number, tabsToUnlock: string[]): Promise<boolean> {
    if (!companyId) {
      logger.error('Invalid company ID provided for tab unlock');
      return false;
    }
    
    if (!tabsToUnlock || tabsToUnlock.length === 0) {
      logger.info(`No tabs to unlock for company ${companyId}`);
      return true; // No tabs to unlock is considered successful
    }
    
    const startTime = Date.now();
    logger.info(`Starting tab unlock for company ${companyId}`, {
      companyId,
      tabsToUnlock,
      timestamp: new Date().toISOString()
    });
    
    try {
      // 1. Get the company's current tabs
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
        
      if (!company) {
        logger.error(`Company with ID ${companyId} not found`);
        return false;
      }
      
      // 2. Process the tabs to unlock
      const currentTabs = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
      
      // Check if all tabs are already unlocked
      const tabsToAdd = tabsToUnlock.filter(tab => !currentTabs.includes(tab));
      
      if (tabsToAdd.length === 0) {
        logger.info(`All requested tabs already unlocked for company ${companyId}`, {
          companyId,
          currentTabs,
          duration: Date.now() - startTime
        });
        return true;
      }
      
      // 3. Update the company record with the new tabs
      const updatedTabs = [...currentTabs, ...tabsToAdd];
      
      await db.update(companies)
        .set({
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
      
      logger.info(`Successfully unlocked tabs for company ${companyId}`, {
        companyId,
        addedTabs: tabsToAdd,
        allTabs: updatedTabs,
        duration: Date.now() - startTime
      } as any);
      
      // 4. Broadcast the update
      await this.broadcastTabUpdate(companyId, updatedTabs);
      
      return true;
    } catch (error) {
      logger.error(`Error unlocking tabs for company ${companyId}:`, error as any);
      return false;
    }
  }
  
  /**
   * Special utility method for unlocking file vault tab
   * Maintained for backward compatibility with existing code
   * 
   * @param companyId - The company ID
   * @returns Promise resolving to true if successful, false otherwise
   */
  static async unlockFileVault(companyId: number): Promise<boolean> {
    return this.unlockTabs(companyId, ['file-vault']);
  }
  
  /**
   * Broadcast tab update to connected clients via WebSocket
   * 
   * @param companyId - The company ID
   * @param availableTabs - The updated available tabs
   */
  private static async broadcastTabUpdate(companyId: number, availableTabs: string[]): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { broadcastCompanyTabsUpdate, broadcastMessage } = await import('../services/websocket');
      
      // Send the update via both legacy and new methods for maximum compatibility
      broadcastCompanyTabsUpdate(companyId, availableTabs);
      
      // Also send a more detailed message with cache invalidation flag
      broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs,
        cache_invalidation: true,
        timestamp: new Date().toISOString(),
        source: 'unified_tab_service'
      });
      
      logger.info(`WebSocket broadcast sent for company ${companyId} tab update`, {
        companyId,
        availableTabs
      } as any);
    } catch (error) {
      logger.error(`Failed to broadcast tab update for company ${companyId}:`, error as any);
      // Don't throw - we still succeeded in updating the database
    }
  }
}

// Export a default instance for backwards compatibility
export default UnifiedTabService;

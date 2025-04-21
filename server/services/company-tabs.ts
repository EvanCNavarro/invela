/**
 * Company Tabs Service
 * 
 * This service manages company tabs and provides utility functions
 * for unlocking the file vault and other tabs.
 */

import { companies } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { broadcastMessage } from './websocket';
import { Logger } from '../utils/logger';

const logger = new Logger('CompanyTabsService');

/**
 * Service class for managing company tabs
 */
export class CompanyTabsService {
  /**
   * Unlock file vault for a specific company
   * This method adds ONLY the 'file-vault' tab to the company's available tabs
   * and broadcasts a WebSocket message to notify clients
   * @param companyId The company ID
   * @returns The updated company record
   */
  static async unlockFileVault(companyId: number) {
    logger.info(`Unlocking file vault for company ${companyId}`);
    
    try {
      // Get current company to check existing tabs
      const [currentCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
        
      if (!currentCompany) {
        logger.error(`Company not found: ${companyId}`);
        return null;
      }
      
      // Define tabs that should be available after KYB form submission
      // Only add file-vault, not dashboard or insights yet
      const desiredTabs = ['task-center', 'file-vault'];
      
      // Check which tabs need to be added
      const currentTabs = currentCompany.available_tabs || ['task-center'];
      const tabsToAdd = desiredTabs.filter(tab => !currentTabs.includes(tab));
      
      // If no new tabs to add, return current company
      if (tabsToAdd.length === 0) {
        logger.info(`File vault already unlocked for company ${companyId}`, {
          availableTabs: currentTabs
        });
        return currentCompany;
      }
      
      // Update available tabs
      const updatedTabs = [...currentTabs, ...tabsToAdd];
      
      const [updatedCompany] = await db.update(companies)
        .set({
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
      
      logger.info(`Updated company tabs - File Vault unlocked`, {
        companyId,
        previousTabs: currentTabs,
        updatedTabs
      });
      
      // Broadcast the update via WebSocket
      broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs: updatedTabs,
        timestamp: new Date().toISOString(),
        cache_invalidation: true // Important flag to ensure client cache is invalidated
      });
      
      return updatedCompany;
    } catch (error) {
      logger.error(`Error unlocking file vault`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId
      });
      return null;
    }
  }
  
  /**
   * Unlock dashboard and insights tabs for a specific company
   * This method is specifically called after Open Banking Survey submission
   * @param companyId The company ID
   * @returns The updated company record
   */
  static async unlockDashboardAndInsights(companyId: number) {
    logger.info(`Unlocking dashboard and insights for company ${companyId}`);
    
    try {
      // Get current company to check existing tabs
      const [currentCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
        
      if (!currentCompany) {
        logger.error(`Company not found: ${companyId}`);
        return null;
      }
      
      // Define all tabs that should be available after Open Banking submission
      const desiredTabs = ['task-center', 'file-vault', 'dashboard', 'insights'];
      
      // Check which tabs need to be added
      const currentTabs = currentCompany.available_tabs || ['task-center'];
      const tabsToAdd = desiredTabs.filter(tab => !currentTabs.includes(tab));
      
      // If no new tabs to add, return current company
      if (tabsToAdd.length === 0) {
        logger.info(`Dashboard tabs already unlocked for company ${companyId}`, {
          availableTabs: currentTabs
        });
        return currentCompany;
      }
      
      // Update available tabs
      const updatedTabs = [...currentTabs, ...tabsToAdd];
      
      const [updatedCompany] = await db.update(companies)
        .set({
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
      
      logger.info(`Updated company tabs - Dashboard and Insights unlocked`, {
        companyId,
        previousTabs: currentTabs,
        updatedTabs
      });
      
      // Broadcast the update via WebSocket
      broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs: updatedTabs,
        timestamp: new Date().toISOString(),
        cache_invalidation: true // Important flag to ensure client cache is invalidated
      });
      
      return updatedCompany;
    } catch (error) {
      logger.error(`Error unlocking dashboard tabs`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId
      });
      return null;
    }
  }
  
  /**
   * Update company available tabs
   * @param companyId The company ID 
   * @param tabs The tabs to set
   * @returns The updated company record
   */
  static async updateTabs(companyId: number, tabs: string[]) {
    logger.info(`Updating tabs for company ${companyId}`, {
      tabs
    });
    
    try {
      const [updatedCompany] = await db.update(companies)
        .set({
          available_tabs: tabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
      
      // Broadcast the update via WebSocket
      broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs: tabs,
        timestamp: new Date().toISOString(),
        cache_invalidation: true
      });
      
      return updatedCompany;
    } catch (error) {
      logger.error(`Error updating company tabs`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId
      });
      return null;
    }
  }
}
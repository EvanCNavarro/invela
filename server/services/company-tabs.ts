/**
 * Company Tabs Management
 * 
 * This service handles WebSocket broadcasting for company tab updates
 * and unlocking specific tabs based on form submission types.
 * 
 * Functions included:
 * - broadcastCompanyTabsUpdate: Broadcast tab updates via WebSocket
 * - unlockDashboardAndInsightsTabs: Unlock dashboard and insights tabs
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { broadcastCompanyTabsUpdate as wsBroadcastCompanyTabsUpdate } from '../utils/unified-websocket';
import { logger } from '../utils/logger';

// Logger is already initialized in the imported module

/**
 * Broadcast company tabs update via WebSocket
 * 
 * @param companyId The company ID
 * @param availableTabs The list of available tabs or null to read from database
 */
export async function broadcastCompanyTabsUpdate(
  companyId: number,
  availableTabs?: string[]
): Promise<boolean> {
  try {
    // If tabs not provided, get them from the database
    if (!availableTabs) {
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
      
      if (!company || !company.metadata) {
        logger.error('Company not found or no metadata available', { companyId });
        return false;
      }
      
      availableTabs = company.metadata.availableTabs as string[] || [];
    }
    
    // Broadcast the update
    wsBroadcastCompanyTabsUpdate(companyId, availableTabs);
    
    logger.info('Company tabs update broadcasted', { 
      companyId, 
      tabsCount: availableTabs.length,
      tabs: availableTabs
    });
    
    return true;
  } catch (error) {
    logger.error('Error broadcasting company tabs update', {
      companyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return false;
  }
}

/**
 * Unlock dashboard and insights tabs after Open Banking form submission
 * 
 * @param companyId The company ID
 * @returns Promise<boolean> Whether the operation was successful
 */
export async function unlockDashboardAndInsightsTabs(companyId: number): Promise<boolean> {
  logger.info('Unlocking dashboard and insights tabs', { companyId });
  
  try {
    // Get current company data
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      logger.error('Company not found', { companyId });
      return false;
    }
    
    // Extract current available tabs or initialize empty array
    const currentTabs = ((company.metadata?.availableTabs as string[]) || []).slice();
    
    // Add dashboard and insights tabs if not already present
    let tabsChanged = false;
    const tabsToAdd = ['dashboard', 'insights'];
    
    for (const tab of tabsToAdd) {
      if (!currentTabs.includes(tab)) {
        currentTabs.push(tab);
        tabsChanged = true;
      }
    }
    
    if (!tabsChanged) {
      logger.info('Dashboard and insights tabs already unlocked', { companyId });
      return true;
    }
    
    // Update company metadata with new tabs
    await db.update(companies)
      .set({
        metadata: sql`jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{availableTabs}',
          ${JSON.stringify(currentTabs)}::jsonb
        )`,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    logger.info('Dashboard and insights tabs unlocked successfully', { 
      companyId,
      availableTabs: currentTabs
    });
    
    // Broadcast the update
    await broadcastCompanyTabsUpdate(companyId, currentTabs);
    
    return true;
  } catch (error) {
    logger.error('Error unlocking dashboard and insights tabs', {
      companyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return false;
  }
}

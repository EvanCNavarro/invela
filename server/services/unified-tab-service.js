/**
 * Unified Tab Service
 * 
 * This module provides functions for unlocking company tabs in a consistent way.
 * It handles both transactional and non-transactional operations.
 */

const { db } = require('../db');
const { companies } = require('../../db/schema');
const { eq } = require('drizzle-orm');
const { logger } = require('../utils/logger');
const { broadcast } = require('../utils/unified-websocket');

/**
 * Unlock tabs for a company
 * 
 * @param {number} companyId The company ID
 * @param {string[]} tabNames Array of tab names to unlock
 * @param {string} [transactionId] Optional transaction ID for logging
 * @returns {Promise<string[]>} Array of all available tabs after update
 */
async function unlockTabs(companyId, tabNames, transactionId) {
  const tabsLogContext = { 
    namespace: 'UnlockTabs', 
    companyId,
    transactionId
  };
  
  if (!tabNames || tabNames.length === 0) {
    logger.info('No tabs to unlock', {
      ...tabsLogContext,
      timestamp: new Date().toISOString()
    });
    return [];
  }
  
  logger.info('Unlocking tabs for company', { 
    ...tabsLogContext, 
    tabNames,
    timestamp: new Date().toISOString() 
  });
  
  try {
    // Get current company tabs from database
    const [company] = await db.select({ available_tabs: companies.available_tabs })
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      logger.error('Company not found when unlocking tabs', tabsLogContext);
      throw new Error(`Company ${companyId} not found`);
    }
    
    // Ensure available_tabs is an array
    const currentTabs = Array.isArray(company.available_tabs) 
      ? company.available_tabs 
      : ['task-center'];
    
    // Add new tabs if not already present
    const updatedTabs = [...new Set([...currentTabs, ...tabNames])];
    
    // Update company tabs
    await db.update(companies)
      .set({ 
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    // Broadcast update via WebSocket
    await broadcast('company_tabs_updated', {
      companyId,
      availableTabs: updatedTabs,
      timestamp: new Date().toISOString()
    });
    
    logger.info('Company tabs updated and broadcast sent', {
      ...tabsLogContext,
      updatedTabs,
      timestamp: new Date().toISOString()
    });
    
    return updatedTabs;
  } catch (error) {
    logger.error('Error unlocking tabs for company', {
      ...tabsLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Unlock tabs for a company within a transaction
 * 
 * @param {any} trx The transaction object
 * @param {number} companyId The company ID
 * @param {string[]} tabNames Array of tab names to unlock
 * @param {string} [transactionId] Optional transaction ID for logging
 * @returns {Promise<string[]>} Array of all available tabs after update
 */
async function unlockTabsForCompany(trx, companyId, tabNames, transactionId) {
  const tabsLogContext = { 
    namespace: 'UnlockTabsTransaction', 
    companyId,
    transactionId 
  };
  
  if (!tabNames || tabNames.length === 0) {
    logger.info('No tabs to unlock within transaction', {
      ...tabsLogContext,
      timestamp: new Date().toISOString()
    });
    return [];
  }
  
  logger.info('Unlocking tabs for company within transaction', { 
    ...tabsLogContext, 
    tabNames,
    timestamp: new Date().toISOString() 
  });
  
  try {
    // Get current company tabs from database within transaction
    const [company] = await trx.select({ available_tabs: companies.available_tabs })
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      logger.error('Company not found when unlocking tabs within transaction', tabsLogContext);
      throw new Error(`Company ${companyId} not found`);
    }
    
    // Ensure available_tabs is an array
    const currentTabs = Array.isArray(company.available_tabs) 
      ? company.available_tabs 
      : ['task-center'];
    
    // Add new tabs if not already present
    const updatedTabs = [...new Set([...currentTabs, ...tabNames])];
    
    // Update company tabs within transaction
    await trx.update(companies)
      .set({ 
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    logger.info('Company tabs updated within transaction', {
      ...tabsLogContext,
      updatedTabs,
      timestamp: new Date().toISOString()
    });
    
    return updatedTabs;
  } catch (error) {
    logger.error('Error unlocking tabs for company within transaction', {
      ...tabsLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Export public functions
module.exports = {
  unlockTabs,
  unlockTabsForCompany
};
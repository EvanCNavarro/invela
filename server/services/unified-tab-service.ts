/**
 * Unified Tab Service
 * 
 * This service provides a standardized approach to handling tab management
 * across different form types, ensuring consistent tab unlocking and avoiding
 * race conditions.
 * 
 * @module unified-tab-service
 */

import getLogger from '../utils/logger';
// Import the database connection
let db: { query: (sql: string, params?: any[]) => Promise<any> };

try {
  db = require('../db').db;
} catch (error) {
  console.error('Database module not found, creating a mock implementation');
  // Create a mock implementation for development/testing
  db = {
    query: async () => ({ rows: [] })
  };
}
import { withTransaction } from './transaction-manager';
import * as WebSocketService from './websocket';

const logger = getLogger('UnifiedTabService');

/**
 * Available tab types in the application
 */
export enum TabType {
  DASHBOARD = 'dashboard',
  FILE_VAULT = 'file_vault',
  NETWORK_MAP = 'network_map',
  TASK_CENTER = 'task_center',
  BENCHMARKING = 'benchmarking',
  RISK_ASSESSMENT = 'risk_assessment',
  CLAIMS_DATABASE = 'claims_database',
  ADMIN = 'admin'
}

/**
 * Options for tab operations
 */
interface TabOperationOptions {
  /** Whether to broadcast WebSocket updates about tab changes */
  broadcast?: boolean;
  /** Context information for logging purposes */
  context?: Record<string, any>;
  /** Force update even if tabs are already unlocked */
  force?: boolean;
}

/**
 * Default options for tab operations
 */
const defaultTabOperationOptions: Required<TabOperationOptions> = {
  broadcast: true,
  context: {},
  force: false
};

/**
 * Check if a company has a tab unlocked
 * 
 * @param companyId The company ID to check
 * @param tabName The name of the tab to check
 * @returns True if the tab is unlocked, false otherwise
 */
export async function isTabUnlocked(companyId: number, tabName: TabType | string): Promise<boolean> {
  try {
    // Get the company's available tabs from the database
    const result = await db.query(
      'SELECT available_tabs FROM companies WHERE id = $1',
      [companyId]
    );
    
    // If the company isn't found, the tab is not unlocked
    if (result.rows.length === 0) {
      return false;
    }
    
    // Get the available tabs array
    const availableTabs: string[] = result.rows[0].available_tabs || [];
    
    // Check if the tab is in the list
    return availableTabs.includes(tabName);
  } catch (error) {
    logger.error('Error checking if tab is unlocked', { 
      companyId, 
      tabName, 
      error 
    });
    
    // Default to false in case of an error
    return false;
  }
}

/**
 * Unlock one or more tabs for a company
 * 
 * This function adds tabs to the company's available_tabs array,
 * ensuring that the tabs are only added if they don't already exist.
 * 
 * @param companyId The company ID to unlock tabs for
 * @param tabs The tabs to unlock (can be a single tab or an array of tabs)
 * @param options Options for the tab unlocking operation
 * @returns An object containing the updated available tabs
 */
export async function unlockTabs(
  companyId: number,
  tabs: TabType | string | (TabType | string)[],
  options: TabOperationOptions = {}
): Promise<{ availableTabs: string[] }> {
  // Merge options with defaults
  const opts: Required<TabOperationOptions> = { ...defaultTabOperationOptions, ...options };
  
  // Convert single tab to array
  const tabsToUnlock = Array.isArray(tabs) ? tabs : [tabs];
  
  // Skip empty tab arrays
  if (tabsToUnlock.length === 0) {
    logger.info('No tabs to unlock', { companyId, ...opts.context });
    return { availableTabs: [] };
  }
  
  // Log the operation
  logger.info(`Unlocking tabs for company ${companyId}`, {
    companyId,
    tabs: tabsToUnlock,
    ...opts.context
  });
  
  try {
    // Use a transaction to ensure atomicity
    return await withTransaction(async (client) => {
      // Get the company's current available tabs
      const result = await client.query(
        'SELECT available_tabs FROM companies WHERE id = $1 FOR UPDATE',
        [companyId]
      );
      
      // If the company isn't found, return an empty array
      if (result.rows.length === 0) {
        logger.warn(`Company ${companyId} not found`, { companyId });
        return { availableTabs: [] };
      }
      
      // Get the available tabs array, defaulting to an empty array if null
      let availableTabs: string[] = result.rows[0].available_tabs || [];
      
      // Check if any of the tabs need to be unlocked
      const tabsToAdd = tabsToUnlock.filter(tab => !availableTabs.includes(tab));
      
      // If no new tabs need to be added and we're not forcing an update, return the current tabs
      if (tabsToAdd.length === 0 && !opts.force) {
        logger.info(`All tabs already unlocked for company ${companyId}`, {
          companyId,
          availableTabs
        });
        return { availableTabs };
      }
      
      // Add the new tabs to the available tabs array
      availableTabs = [...availableTabs, ...tabsToAdd];
      
      // Update the company's available tabs in the database
      await client.query(
        'UPDATE companies SET available_tabs = $1 WHERE id = $2',
        [availableTabs, companyId]
      );
      
      logger.info(`Successfully unlocked tabs for company ${companyId}`, {
        companyId,
        newTabs: tabsToAdd,
        allTabs: availableTabs
      });
      
      // Broadcast the tab update via WebSocket if requested
      if (opts.broadcast) {
        try {
          await WebSocketService.broadcastCompanyTabsUpdate(companyId, availableTabs);
          logger.info(`Broadcast tab update for company ${companyId}`, { companyId });
        } catch (broadcastError) {
          logger.error(`Error broadcasting tab update for company ${companyId}`, {
            companyId,
            error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error'
          });
          // Continue execution even if broadcasting fails
        }
      }
      
      // Return the updated available tabs
      return { availableTabs };
    });
  } catch (error) {
    logger.error(`Error unlocking tabs for company ${companyId}`, {
      companyId,
      tabs: tabsToUnlock,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...opts.context
    });
    
    // Return an empty array in case of an error
    return { availableTabs: [] };
  }
}

/**
 * Lock one or more tabs for a company
 * 
 * This function removes tabs from the company's available_tabs array.
 * 
 * @param companyId The company ID to lock tabs for
 * @param tabs The tabs to lock (can be a single tab or an array of tabs)
 * @param options Options for the tab locking operation
 * @returns An object containing the updated available tabs
 */
export async function lockTabs(
  companyId: number,
  tabs: TabType | string | (TabType | string)[],
  options: TabOperationOptions = {}
): Promise<{ availableTabs: string[] }> {
  // Merge options with defaults
  const opts: Required<TabOperationOptions> = { ...defaultTabOperationOptions, ...options };
  
  // Convert single tab to array
  const tabsToLock = Array.isArray(tabs) ? tabs : [tabs];
  
  // Skip empty tab arrays
  if (tabsToLock.length === 0) {
    logger.info('No tabs to lock', { companyId, ...opts.context });
    return { availableTabs: [] };
  }
  
  // Log the operation
  logger.info(`Locking tabs for company ${companyId}`, {
    companyId,
    tabs: tabsToLock,
    ...opts.context
  });
  
  try {
    // Use a transaction to ensure atomicity
    return await withTransaction(async (client) => {
      // Get the company's current available tabs
      const result = await client.query(
        'SELECT available_tabs FROM companies WHERE id = $1 FOR UPDATE',
        [companyId]
      );
      
      // If the company isn't found, return an empty array
      if (result.rows.length === 0) {
        logger.warn(`Company ${companyId} not found`, { companyId });
        return { availableTabs: [] };
      }
      
      // Get the available tabs array, defaulting to an empty array if null
      let availableTabs: string[] = result.rows[0].available_tabs || [];
      
      // Remove the tabs to lock
      const updatedTabs = availableTabs.filter(tab => !tabsToLock.includes(tab));
      
      // If no tabs were removed and we're not forcing an update, return the current tabs
      if (updatedTabs.length === availableTabs.length && !opts.force) {
        logger.info(`No tabs needed to be locked for company ${companyId}`, {
          companyId,
          availableTabs
        });
        return { availableTabs };
      }
      
      // Update the company's available tabs in the database
      await client.query(
        'UPDATE companies SET available_tabs = $1 WHERE id = $2',
        [updatedTabs, companyId]
      );
      
      logger.info(`Successfully locked tabs for company ${companyId}`, {
        companyId,
        lockedTabs: tabsToLock,
        remainingTabs: updatedTabs
      });
      
      // Broadcast the tab update via WebSocket if requested
      if (opts.broadcast) {
        try {
          await WebSocketService.broadcastCompanyTabsUpdate(companyId, updatedTabs);
          logger.info(`Broadcast tab update for company ${companyId}`, { companyId });
        } catch (broadcastError) {
          logger.error(`Error broadcasting tab update for company ${companyId}`, {
            companyId,
            error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error'
          });
          // Continue execution even if broadcasting fails
        }
      }
      
      // Return the updated available tabs
      return { availableTabs: updatedTabs };
    });
  } catch (error) {
    logger.error(`Error locking tabs for company ${companyId}`, {
      companyId,
      tabs: tabsToLock,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...opts.context
    });
    
    // Return an empty array in case of an error
    return { availableTabs: [] };
  }
}

/**
 * Get all unlocked tabs for a company
 * 
 * @param companyId The company ID to get tabs for
 * @returns The available tabs for the company
 */
export async function getAvailableTabs(companyId: number): Promise<string[]> {
  try {
    // Get the company's available tabs from the database
    const result = await db.query(
      'SELECT available_tabs FROM companies WHERE id = $1',
      [companyId]
    );
    
    // If the company isn't found, return an empty array
    if (result.rows.length === 0) {
      return [];
    }
    
    // Return the available tabs array, defaulting to an empty array if null
    return result.rows[0].available_tabs || [];
  } catch (error) {
    logger.error(`Error getting available tabs for company ${companyId}`, {
      companyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Return an empty array in case of an error
    return [];
  }
}

/**
 * Unlock specific form-related tabs based on form type
 * 
 * This function provides a standardized way to unlock tabs based on form type.
 * 
 * @param companyId The company ID to unlock tabs for
 * @param formType The type of form (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param options Options for the tab unlocking operation
 * @returns An object containing the unlocked tabs
 */
export async function unlockTabsForFormSubmission(
  companyId: number,
  formType: string,
  options: TabOperationOptions = {}
): Promise<{ availableTabs: string[]; unlockedTabs: string[] }> {
  // Determine which tabs to unlock based on form type
  let tabsToUnlock: string[] = [];
  
  switch (formType) {
    case 'kyb':
    case 'company_kyb':
      // KYB form unlocks file vault access
      tabsToUnlock = [TabType.FILE_VAULT];
      break;
    case 'open_banking':
    case 'open_banking_survey':
      // Open Banking form unlocks dashboard and insights
      tabsToUnlock = [TabType.DASHBOARD, TabType.BENCHMARKING];
      break;
    // KY3P form doesn't unlock any tabs by itself
    default:
      logger.info(`No tabs to unlock for form type: ${formType}`, { companyId, formType });
      return { availableTabs: [], unlockedTabs: [] };
  }
  
  // Log the form-specific tab unlocking
  logger.info(`Unlocking tabs for ${formType} form submission`, {
    companyId,
    formType,
    tabsToUnlock
  });
  
  // Unlock the specified tabs
  const result = await unlockTabs(companyId, tabsToUnlock, options);
  
  // Return the result including which tabs were unlocked specifically for this form
  return {
    availableTabs: result.availableTabs,
    unlockedTabs: tabsToUnlock
  };
}

export default {
  TabType,
  isTabUnlocked,
  unlockTabs,
  lockTabs,
  getAvailableTabs,
  unlockTabsForFormSubmission
};

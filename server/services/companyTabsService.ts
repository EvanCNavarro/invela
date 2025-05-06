/**
 * Service for managing company tabs and permissions
 * This service provides utilities for updating company available_tabs
 * in a safe and consistent manner using transactions for atomic operations.
 *
 * Key Features:
 * - Transactional updates for data consistency
 * - Retry logic for resilience
 * - Redundant WebSocket broadcasting
 * - Detailed logging for diagnostics
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import * as WebSocketService from './websocket';
import { invalidateCompanyCache } from '../routes';
import { logger } from '../utils/logger';

// Constants for retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500; // 500ms initial delay

/**
 * Sleep function for retry delays
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a unique operation ID for tracking requests through logs
 * @returns Unique operation ID string
 */
const generateOperationId = () => {
  return `op-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};


export const CompanyTabsService = {
  /**
   * Adds specified tabs to a company if not already present
   * Returns the updated company record with new tabs
   * 
   * Uses the same transaction-based approach and retry logic as unlockFileVault
   */
  async addTabsToCompany(companyId: number, tabsToAdd: string[]) {
    if (!companyId || !tabsToAdd.length) {
      logger.warn('[CompanyTabsService] Invalid parameters for addTabsToCompany');
      return null;
    }

    // Generate operation ID for tracking this specific request through logs
    const opId = generateOperationId();
    const startTime = Date.now();

    logger.info(`[CompanyTabsService] [${opId}] Adding tabs to company ${companyId}`, {
      companyId,
      operationId: opId,
      operation: 'addTabsToCompany',
      tabsToAdd,
      startTime: new Date(startTime).toISOString()
    });

    // Implement retry logic
    let retryCount = 0;
    let lastError = null;

    while (retryCount <= MAX_RETRIES) {
      try {
        // If this is a retry, log it and wait before trying again
        if (retryCount > 0) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1); // Exponential backoff
          logger.info(`[CompanyTabsService] [${opId}] Retry ${retryCount}/${MAX_RETRIES} after ${delay}ms delay`, {
            companyId,
            operationId: opId,
            retryCount,
            delay
          });
          await sleep(delay);
        }

        // Execute the tab update operation within a transaction
        const result = await db.transaction(async (tx) => {
          // Get current company data within the transaction
          const [company] = await tx
            .select()
            .from(companies)
            .where(eq(companies.id, companyId));

          if (!company) {
            logger.error(`[CompanyTabsService] [${opId}] Company not found in database`, {
              companyId,
              operationId: opId
            });
            return null;
          }

          // Get current tabs or default to task-center
          const currentTabs = company.available_tabs || ['task-center'];
          
          // Check which tabs need to be added
          const tabsToActuallyAdd = tabsToAdd.filter(tab => !currentTabs.includes(tab));
          
          // If no new tabs to add, return the existing company data
          if (tabsToActuallyAdd.length === 0) {
            logger.info(`[CompanyTabsService] [${opId}] Company already has all requested tabs`, {
              companyId,
              operationId: opId,
              currentTabs
            });
            return company;
          }
          
          // Add new tabs
          const updatedTabs = [...currentTabs, ...tabsToActuallyAdd];
          const timestamp = new Date();
          
          logger.info(`[CompanyTabsService] [${opId}] Updating company tabs`, {
            companyId, 
            operationId: opId,
            tabsToAdd: tabsToActuallyAdd,
            previousTabs: currentTabs,
            newTabs: updatedTabs
          });
          
          // Update the company record within the transaction
          const [updatedCompany] = await tx
            .update(companies)
            .set({
              available_tabs: updatedTabs,
              updated_at: timestamp
            })
            .where(eq(companies.id, companyId))
            .returning();
            
          if (!updatedCompany) {
            logger.error(`[CompanyTabsService] [${opId}] Update failed - no record returned`, {
              companyId,
              operationId: opId
            });
            throw new Error('Company update failed - no record returned');
          }
          
          logger.info(`[CompanyTabsService] [${opId}] Transaction successful - company tabs updated`, {
            companyId,
            operationId: opId,
            newTabs: updatedCompany.available_tabs
          });
          
          return updatedCompany;
        });
        
        // If successful, broadcast updates and return
        if (result) {
          // Broadcast the update via WebSocket with redundancy
          await this._broadcastTabUpdate(companyId, result.available_tabs, opId);
          
          // Calculate total operation time
          const totalTime = Date.now() - startTime;
          logger.info(`[CompanyTabsService] [${opId}] Successfully added tabs to company ${companyId}`, {
            companyId,
            operationId: opId,
            duration: totalTime,
            success: true,
            retryCount
          });
          
          return result;
        }
        
        // If we got here with a null result but no error, it means the company wasn't found
        throw new Error(`Company with ID ${companyId} not found or update failed`);
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount > MAX_RETRIES) {
          logger.error(`[CompanyTabsService] [${opId}] Failed to add tabs after ${MAX_RETRIES} retries`, {
            companyId,
            operationId: opId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      }
    }

    // If we got here, all retries failed
    logger.error(`[CompanyTabsService] [${opId}] All retries failed for adding tabs`, {
      companyId,
      operationId: opId,
      error: lastError instanceof Error ? lastError.message : String(lastError)
    });
    
    return null;
  },

  /**
   * Safely unlocks the file vault for a company using a transaction-based approach with retry logic
   * This should be called after form submission to ensure users can access the file vault.
   * 
   * Key improvements:
   * 1. Uses database transactions for atomic operations
   * 2. Implements retry logic for resilience
   * 3. Uses structured logging for better diagnostics
   * 4. Multiple WebSocket broadcast approaches for reliability
   * 5. Cache invalidation to ensure UI consistency
   */
  async unlockFileVault(companyId: number) {
    if (!companyId) {
      logger.warn('[CompanyTabsService] Invalid company ID provided for file vault unlock');
      return null;
    }

    // Generate operation ID for tracking this specific request through logs
    const opId = generateOperationId();
    const startTime = Date.now();

    logger.info(`[CompanyTabsService] [${opId}] Starting file vault unlock for company ${companyId}`, {
      companyId,
      operationId: opId,
      operation: 'unlockFileVault',
      startTime: new Date(startTime).toISOString()
    });

    // Implement retry logic
    let retryCount = 0;
    let lastError = null;

    while (retryCount <= MAX_RETRIES) {
      try {
        // If this is a retry, log it and wait before trying again
        if (retryCount > 0) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1); // Exponential backoff
          logger.info(`[CompanyTabsService] [${opId}] Retry ${retryCount}/${MAX_RETRIES} after ${delay}ms delay`, {
            companyId,
            operationId: opId,
            retryCount,
            delay
          });
          await sleep(delay);
        }

        // Execute the tab unlock operation with transaction
        const result = await this._executeFileVaultUnlockTransaction(companyId, opId);
        
        // If successful, broadcast updates and return
        if (result) {
          // Broadcast the update via WebSocket with redundancy
          await this._broadcastTabUpdate(companyId, result.available_tabs, opId);
          
          // Calculate total operation time
          const totalTime = Date.now() - startTime;
          logger.info(`[CompanyTabsService] [${opId}] Successfully unlocked file vault for company ${companyId}`, {
            companyId,
            operationId: opId,
            duration: totalTime,
            success: true,
            retryCount
          });
          
          return result;
        }
        
        // If we got here with a null result but no error, it means the company wasn't found
        throw new Error(`Company with ID ${companyId} not found or update failed`);
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount > MAX_RETRIES) {
          logger.error(`[CompanyTabsService] [${opId}] Failed to unlock file vault after ${MAX_RETRIES} retries`, {
            companyId,
            operationId: opId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      }
    }

    // If we got here, all retries failed
    logger.error(`[CompanyTabsService] [${opId}] All retries failed for file vault unlock`, {
      companyId,
      operationId: opId,
      error: lastError instanceof Error ? lastError.message : String(lastError)
    });
    
    return null;
  },

  /**
   * Execute the file vault unlock operation within a transaction
   * Private helper method for unlockFileVault
   */
  async _executeFileVaultUnlockTransaction(companyId: number, opId: string) {
    logger.info(`[CompanyTabsService] [${opId}] Starting transaction for file vault unlock`, {
      companyId,
      operationId: opId
    });
    
    return await db.transaction(async (tx) => {
      // First get current company state within the transaction
      const [company] = await tx
        .select()
        .from(companies)
        .where(eq(companies.id, companyId));
        
      if (!company) {
        logger.error(`[CompanyTabsService] [${opId}] Company not found in database`, {
          companyId,
          operationId: opId
        });
        return null;
      }
      
      // Get current tabs or default to task-center
      const currentTabs = company.available_tabs || ['task-center'];
      
      // If file-vault is already in the tabs, return early
      if (currentTabs.includes('file-vault')) {
        logger.info(`[CompanyTabsService] [${opId}] File vault already enabled for company`, {
          companyId,
          operationId: opId,
          currentTabs
        });
        return company;
      }
      
      // Add file-vault to the tabs array
      const updatedTabs = [...currentTabs, 'file-vault'];
      const timestamp = new Date();
      
      logger.info(`[CompanyTabsService] [${opId}] Updating company tabs`, {
        companyId, 
        operationId: opId,
        previousTabs: currentTabs,
        newTabs: updatedTabs
      });
      
      // Update the company record within the transaction
      const [updatedCompany] = await tx
        .update(companies)
        .set({
          available_tabs: updatedTabs,
          updated_at: timestamp
        })
        .where(eq(companies.id, companyId))
        .returning();
        
      if (!updatedCompany) {
        logger.error(`[CompanyTabsService] [${opId}] Update failed - no record returned`, {
          companyId,
          operationId: opId
        });
        throw new Error('Company update failed - no record returned');
      }
      
      logger.info(`[CompanyTabsService] [${opId}] Transaction successful - company tabs updated`, {
        companyId,
        operationId: opId,
        newTabs: updatedCompany.available_tabs
      });
      
      return updatedCompany;
    });
  },
  
  /**
   * Broadcast tab update via multiple channels for redundancy
   * Private helper method for unlockFileVault
   */
  async _broadcastTabUpdate(companyId: number, availableTabs: string[], opId: string) {
    logger.info(`[CompanyTabsService] [${opId}] Broadcasting tab update via WebSocket`, {
      companyId,
      operationId: opId
    });
    
    // First invalidate the company cache
    try {
      const cacheInvalidated = invalidateCompanyCache(companyId);
      logger.info(`[CompanyTabsService] [${opId}] Cache invalidation result: ${cacheInvalidated}`, {
        companyId,
        operationId: opId,
        cacheInvalidated
      });
    } catch (error) {
      logger.error(`[CompanyTabsService] [${opId}] Error invalidating cache`, {
        companyId,
        operationId: opId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue even if cache invalidation fails
    }
    
    // Primary broadcast using dedicated method
    try {
      WebSocketService.broadcastCompanyTabsUpdate(companyId, availableTabs);
    } catch (error) {
      logger.error(`[CompanyTabsService] [${opId}] Error in primary WebSocket broadcast`, {
        companyId,
        operationId: opId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Secondary broadcast using generic message with more metadata
    try {
      WebSocketService.broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs,
        timestamp: new Date().toISOString(),
        source: 'companyTabsService.unlockFileVault',
        operationId: opId,
        cache_invalidation: true
      });
    } catch (error) {
      logger.error(`[CompanyTabsService] [${opId}] Error in secondary WebSocket broadcast`, {
        companyId,
        operationId: opId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Schedule delayed broadcasts for clients that might reconnect later
    const delayTimes = [500, 1500, 3000]; // 0.5s, 1.5s, 3s
    
    for (const delay of delayTimes) {
      try {
        setTimeout(() => {
          WebSocketService.broadcastMessage('company_tabs_updated', {
            companyId,
            availableTabs,
            timestamp: new Date().toISOString(),
            source: 'companyTabsService.unlockFileVault.delayed',
            operationId: opId,
            delay,
            cache_invalidation: true
          });
          
          logger.info(`[CompanyTabsService] [${opId}] Sent delayed broadcast (${delay}ms)`, {
            companyId,
            operationId: opId,
            delay
          });
        }, delay);
      } catch (error) {
        logger.error(`[CompanyTabsService] [${opId}] Error scheduling delayed broadcast`, {
          companyId,
          operationId: opId,
          delay,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    logger.info(`[CompanyTabsService] [${opId}] Tab update broadcasts complete`, {
      companyId,
      operationId: opId
    });
    
    return true;
  }
};
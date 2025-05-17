/**
 * Demo Company Hooks
 * 
 * This module provides hooks that run automatically after demo company creation
 * to enhance the demo experience, including populating the file vault with sample files.
 */

import { populateCompanyFileVault, unlockFileVaultForCompany } from '../../populate-demo-file-vault.js';
import { isDemoCompanyName } from '../utils/demo-helpers.js';
import { logger } from '../utils/logger.js';

/**
 * Process a newly created company and apply demo-specific enhancements if needed
 * 
 * @param {Object} company - The newly created company object
 * @param {number} company.id - Company ID
 * @param {string} company.name - Company name
 * @param {boolean} company.is_demo - Whether this is a demo company
 * @returns {Promise<Object>} - Result of processing
 */
async function processNewCompany(company) {
  try {
    if (!company || !company.id) {
      logger.warn('[DemoCompanyHooks] Invalid company object provided', { company });
      return { success: false, reason: 'Invalid company data' };
    }

    const companyId = company.id;
    const companyName = company.name || '';
    const isExplicitlyDemo = company.is_demo === true;
    const isImplicitlyDemo = isDemoCompanyName(companyName);
    
    // Determine if this is a demo company by either flag or name
    if (!isExplicitlyDemo && !isImplicitlyDemo) {
      logger.info('[DemoCompanyHooks] Company is not a demo company, skipping hooks', { 
        companyId, 
        companyName,
        isExplicitlyDemo,
        isImplicitlyDemo 
      });
      return { success: true, status: 'skipped', reason: 'Not a demo company' };
    }
    
    logger.info('[DemoCompanyHooks] Processing new demo company', { 
      companyId, 
      companyName, 
      isDemoReason: isExplicitlyDemo ? 'explicit flag' : 'name pattern' 
    });
    
    // Step 1: Ensure file vault is unlocked for this company
    const fileVaultUnlocked = await unlockFileVaultForCompany(companyId);
    
    if (!fileVaultUnlocked) {
      logger.warn('[DemoCompanyHooks] Failed to unlock file vault', { companyId });
      // Continue anyway to try populating files
    }
    
    // Step 2: Populate file vault with demo files
    const populationResult = await populateCompanyFileVault(companyId);
    
    logger.info('[DemoCompanyHooks] Demo company processing complete', {
      companyId,
      companyName,
      fileVaultUnlocked,
      filesPopulated: populationResult.success,
      fileCount: populationResult.fileCount || 0
    });
    
    return {
      success: true,
      companyId,
      companyName,
      fileVaultUnlocked,
      fileVaultPopulated: populationResult.success,
      fileCount: populationResult.fileCount || 0
    };
  } catch (error) {
    logger.error('[DemoCompanyHooks] Error processing demo company', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      company
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

module.exports = {
  processNewCompany
};
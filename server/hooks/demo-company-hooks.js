/**
 * Demo Company Hooks
 * 
 * This module provides hooks that run automatically after demo company creation
 * to enhance the demo experience, including populating the file vault with sample files.
 */

import { isCompanyDemo } from '../utils/demo-helpers.js';
import { populateCompanyFileVault } from '../../populate-demo-file-vault.js';
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
export async function processNewCompany(company) {
  // Verify this is a demo company before proceeding
  if (!company || !company.id) {
    logger.warn('[Demo Hooks] Invalid company object provided to processNewCompany');
    return { success: false, reason: 'Invalid company object' };
  }

  logger.info(`[Demo Hooks] Processing new company: ${company.name} (ID: ${company.id})`);
  
  try {
    // Check if this is a demo company
    const isDemoCompany = company.is_demo === true || await isCompanyDemo(company.id);
    
    if (!isDemoCompany) {
      logger.info(`[Demo Hooks] Company ${company.id} is not a demo company, skipping demo hooks`);
      return { success: true, skipped: true, reason: 'Not a demo company' };
    }
    
    logger.info(`[Demo Hooks] Applying demo enhancements for company ${company.id} (${company.name})`);
    
    // Enhancement 1: Populate file vault with sample files
    const fileVaultResult = await populateFileVault(company);
    
    // Add more demo enhancements here as needed
    
    return {
      success: true,
      company: { id: company.id, name: company.name },
      fileVault: fileVaultResult
    };
  } catch (error) {
    logger.error(`[Demo Hooks] Error applying demo enhancements for company ${company.id}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Populate the file vault of a demo company with sample files
 * 
 * @param {Object} company - The company object
 * @returns {Promise<Object>} - Result of file vault population
 */
async function populateFileVault(company) {
  logger.info(`[Demo Hooks] Populating file vault for company ${company.id} (${company.name})`);
  
  try {
    // Use the populate-demo-file-vault module to add sample files
    const result = await populateCompanyFileVault(company.id);
    
    logger.info(`[Demo Hooks] File vault population result for company ${company.id}:`, {
      success: result.success,
      fileCount: result.fileCount || 0,
      status: result.status || 'completed'
    });
    
    return result;
  } catch (error) {
    logger.error(`[Demo Hooks] Error populating file vault for company ${company.id}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
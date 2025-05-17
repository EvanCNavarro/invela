/**
 * Demo Helpers
 * 
 * This module provides helper functions for identifying and working with demo companies.
 */

const { db } = require('../../db/index.js');
const { companies } = require('../../db/schema.js');
const { eq, or, like } = require('drizzle-orm');
const { logger } = require('./logger.js');

/**
 * Check if a company name indicates this is a demo company
 * 
 * @param {string} companyName - Company name to check
 * @returns {boolean} - True if the name indicates this is a demo company
 */
function isDemoCompanyName(companyName) {
  if (!companyName) return false;
  
  // Normalize company name for consistent checking
  const normalizedName = companyName.toLowerCase().trim();
  
  // Keywords indicating demo status
  const demoKeywords = [
    'demo',
    'devtest',
    'developmenttesting',
    'test company',
    'sample company',
    'example company'
  ];
  
  // Check if any keyword is in the company name
  return demoKeywords.some(keyword => normalizedName.includes(keyword));
}

/**
 * Check if a company is marked as a demo company in the database
 * 
 * @param {number} companyId - Company ID to check
 * @returns {Promise<boolean>} - True if this is a demo company
 */
async function isCompanyDemo(companyId) {
  try {
    logger.info(`[Demo Helpers] Checking if company ${companyId} is a demo company`);
    
    // Get company record from database
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      logger.warn(`[Demo Helpers] Company ${companyId} not found in database`);
      return false;
    }
    
    // Check is_demo flag (explicit marking)
    if (company.is_demo === true) {
      logger.info(`[Demo Helpers] Company ${companyId} is explicitly marked as a demo company`);
      return true;
    }
    
    // Check company name (implicit detection)
    if (isDemoCompanyName(company.name)) {
      logger.info(`[Demo Helpers] Company ${companyId} is implicitly a demo company based on name pattern`);
      return true;
    }
    
    // Not a demo company
    logger.info(`[Demo Helpers] Company ${companyId} is not a demo company`);
    return false;
  } catch (error) {
    logger.error(`[Demo Helpers] Error checking if company is demo:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      companyId
    });
    return false;
  }
}

/**
 * Get all demo companies from the database
 * 
 * @returns {Promise<Array>} - Array of demo company objects
 */
async function getAllDemoCompanies() {
  try {
    logger.info('[Demo Helpers] Getting all demo companies');
    
    // Get all companies marked as demo
    const demoCompanies = await db
      .select()
      .from(companies)
      .where(eq(companies.is_demo, true));
      
    logger.info(`[Demo Helpers] Found ${demoCompanies.length} companies explicitly marked as demo`);
    
    // Get companies with demo-like names
    const demoNameCompanies = await db
      .select()
      .from(companies)
      .where(
        or(
          like(companies.name, '%demo%'),
          like(companies.name, '%devtest%'),
          like(companies.name, '%developmenttesting%'),
          like(companies.name, '%test company%'),
          like(companies.name, '%sample company%'),
          like(companies.name, '%example company%')
        )
      );
      
    logger.info(`[Demo Helpers] Found ${demoNameCompanies.length} companies with demo-like names`);
    
    // Combine and deduplicate
    const allDemoCompanies = [
      ...demoCompanies,
      ...demoNameCompanies
    ];
    
    // Remove duplicates by ID
    const uniqueDemoCompanies = Array.from(
      new Map(allDemoCompanies.map(c => [c.id, c])).values()
    );
    
    logger.info(`[Demo Helpers] Found ${uniqueDemoCompanies.length} total unique demo companies`);
    
    return uniqueDemoCompanies;
  } catch (error) {
    logger.error('[Demo Helpers] Error getting demo companies:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
}

module.exports = {
  isDemoCompanyName,
  isCompanyDemo,
  getAllDemoCompanies
};
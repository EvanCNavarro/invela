/**
 * Demo Helpers
 * 
 * This module provides helper functions for identifying and working with demo companies.
 */

import { db } from '../../db/index.js';
import { companies } from '../../db/schema.js';
import { eq, or, and, like } from 'drizzle-orm';
import { logger } from './logger.js';

/**
 * Check if a company is marked as a demo in the database
 * 
 * @param {number} companyId - Company ID to check
 * @returns {Promise<boolean>} - True if company is demo, false otherwise
 */
export async function isCompanyDemo(companyId) {
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      return false;
    }
    
    // Check if is_demo is true or if company name indicates a demo
    return company.is_demo === true || isDemoCompanyName(company.name);
  } catch (error) {
    logger.error(`Error checking if company ${companyId} is demo:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Check if a company name indicates this is a demo company
 * 
 * @param {string} companyName - Company name to check
 * @returns {boolean} - True if name indicates a demo company
 */
export function isDemoCompanyName(companyName) {
  if (!companyName) {
    return false;
  }
  
  const lowerName = companyName.toLowerCase();
  const demoIndicators = [
    'demo',
    'test',
    'sample',
    'example'
  ];
  
  return demoIndicators.some(indicator => 
    lowerName.includes(indicator) || 
    // Check specific formats like 'DemoBank', 'TestCompany', etc.
    new RegExp(`^${indicator}[A-Z]`, 'i').test(companyName)
  );
}

/**
 * Get all demo companies from the database
 * 
 * @returns {Promise<Array>} - Array of demo companies
 */
export async function getAllDemoCompanies() {
  try {
    // Get all companies with is_demo=true
    const explicitDemoCompanies = await db
      .select()
      .from(companies)
      .where(eq(companies.is_demo, true));
      
    // Get companies with demo-indicating names
    const demoNameCompanies = await db
      .select()
      .from(companies)
      .where(
        or(
          like(companies.name, '%demo%'),
          like(companies.name, '%test%'),
          like(companies.name, '%sample%'),
          like(companies.name, '%example%')
        )
      );
      
    // Combine results and remove duplicates by ID
    const allDemoCompanies = [
      ...explicitDemoCompanies,
      ...demoNameCompanies
    ];
    
    return Array.from(
      new Map(allDemoCompanies.map(c => [c.id, c])).values()
    );
  } catch (error) {
    logger.error('Error getting all demo companies:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
}
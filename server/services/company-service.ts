/**
 * Company Service
 * 
 * This service provides functions for working with company data.
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get company by ID
 * 
 * @param companyId The ID of the company to retrieve
 * @returns The company or null if not found
 */
export async function getCompany(companyId: number) {
  try {
    const result = await db.select().from(companies).where(eq(companies.id, companyId));
    
    if (!result || result.length === 0) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error(`Error retrieving company with ID ${companyId}:`, error);
    return null;
  }
}
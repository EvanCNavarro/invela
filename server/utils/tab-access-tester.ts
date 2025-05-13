import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { tabLogger } from './tab-access-logger';

/**
 * Tab Access Testing Utility
 * 
 * Provides utilities to verify tab access control functionality in various scenarios.
 * Used during development and debugging to ensure consistent behavior.
 */
export async function checkTabAccess(companyId: number, tab: string): Promise<{
  hasAccess: boolean;
  availableTabs: string[];
}> {
  try {
    // Get company data from database
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    
    if (!company) {
      tabLogger.warn('Company not found during tab access check', { companyId });
      return { hasAccess: false, availableTabs: [] };
    }
    
    // Normalize tabs
    const availableTabs = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
    
    // Check access
    const hasAccess = availableTabs.includes(tab);
    
    tabLogger.debug('Tab access check result', { 
      companyId, 
      tab, 
      hasAccess, 
      availableTabs 
    });
    
    return { hasAccess, availableTabs };
  } catch (error) {
    tabLogger.error('Error checking tab access', { companyId, tab, error });
    return { hasAccess: false, availableTabs: [] };
  }
}

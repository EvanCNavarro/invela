/**
 * Emergency patch utility to ensure file vault access is properly enabled
 * after form submission. This is needed to fix an issue with the 
 * company tab access not being properly updated after form submission.
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';

/**
 * Unlocks the file vault for a company by ensuring 'file-vault'
 * is in the available_tabs array.
 * 
 * @param companyId The ID of the company to unlock the file vault for
 * @returns A promise that resolves to true if successful, false otherwise
 */
export async function unlockFileVault(companyId: number): Promise<boolean> {
  if (!companyId) {
    console.error('[updateCompanyTabs] Invalid company ID provided');
    return false;
  }

  try {
    // Get current company data
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!company) {
      console.error(`[updateCompanyTabs] Company with ID ${companyId} not found`);
      return false;
    }

    // Get current tabs or default to empty array
    const currentTabs = company.available_tabs || [];
    
    // Check if file-vault is already present
    if (currentTabs.includes('file-vault')) {
      console.log(`[updateCompanyTabs] Company ${companyId} already has file-vault tab`);
      return true;
    }
    
    // Add file-vault tab
    const updatedTabs = [...currentTabs, 'file-vault'];
    
    console.log(`[updateCompanyTabs] Adding file-vault tab to company ${companyId}`);
    
    // Update the company record
    await db
      .update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
      
    console.log(`[updateCompanyTabs] Successfully unlocked file vault for company ${companyId}`);
    
    return true;
  } catch (error) {
    console.error('[updateCompanyTabs] Error unlocking file vault:', error);
    return false;
  }
}

/**
 * Emergency fix for company tabs - checks and fixes all active companies
 * to ensure they have the correct available_tabs configuration.
 * 
 * @param force If true, forces update even if tabs look correct
 * @returns Array of updated company IDs
 */
export async function fixAllCompanyTabs(force: boolean = false): Promise<number[]> {
  try {
    const companies = await db
      .select()
      .from(companies)
      .orderBy(companies.id);

    const updatedCompanyIds: number[] = [];

    for (const company of companies) {
      const currentTabs = company.available_tabs || [];
      
      // Check if company has task-center tab
      const needsTaskCenter = !currentTabs.includes('task-center');
      
      // Check if company has file-vault tab (if it has submitted at least one form)
      // This is a simplification - in a real fix we'd check for submitted tasks
      const needsFileVault = !currentTabs.includes('file-vault') && force;
      
      if (needsTaskCenter || needsFileVault) {
        const updatedTabs = [...new Set([...currentTabs, 'task-center', ...(needsFileVault ? ['file-vault'] : [])])];
        
        await db
          .update(companies)
          .set({
            available_tabs: updatedTabs,
            updated_at: new Date()
          })
          .where(eq(companies.id, company.id));
          
        updatedCompanyIds.push(company.id);
        
        console.log(`[updateCompanyTabs] Updated tabs for company ${company.id}:`, {
          previousTabs: currentTabs,
          newTabs: updatedTabs
        });
      }
    }
    
    return updatedCompanyIds;
  } catch (error) {
    console.error('[updateCompanyTabs] Error fixing company tabs:', error);
    return [];
  }
}
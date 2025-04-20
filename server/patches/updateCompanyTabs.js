/**
 * This patch updates the company tabs handling in the KYB submission flow
 * 
 * Problem: When a KYB form is submitted, the file-vault tab is not always 
 * properly added to the company's available_tabs array, preventing users 
 * from accessing the file vault after form submission.
 * 
 * Solution: Create a dedicated service to handle company tab updates
 * consistently across the application.
 */

// Import our dependencies
const { db } = require('@db');
const { companies } = require('@db/schema');
const { eq } = require('drizzle-orm');

/**
 * Unlocks the file vault tab for a company
 * @param {number} companyId - The ID of the company to update
 * @returns {Promise<Object|null>} - The updated company record or null if failed
 */
async function unlockFileVault(companyId) {
  if (!companyId) {
    console.warn('[File Vault Patch] Invalid company ID provided');
    return null;
  }

  try {
    // Get current company data
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!company) {
      console.error(`[File Vault Patch] Company with ID ${companyId} not found`);
      return null;
    }

    // Get current tabs or default to task-center
    const currentTabs = company.available_tabs || ['task-center'];
    
    // Check if file-vault is already present
    if (currentTabs.includes('file-vault')) {
      console.log(`[File Vault Patch] Company ${companyId} already has file-vault tab`);
      return company;
    }
    
    // Add file-vault tab
    const updatedTabs = [...currentTabs, 'file-vault'];
    
    console.log(`[File Vault Patch] Adding file-vault tab to company ${companyId}`);
    
    // Update the company record
    const [updatedCompany] = await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();
      
    console.log(`[File Vault Patch] Successfully updated company tabs for ${companyId}:`, {
      previousTabs: currentTabs,
      newTabs: updatedCompany.available_tabs
    });
    
    return updatedCompany;
  } catch (error) {
    console.error('[File Vault Patch] Error updating company tabs:', error);
    return null;
  }
}

module.exports = {
  unlockFileVault
};
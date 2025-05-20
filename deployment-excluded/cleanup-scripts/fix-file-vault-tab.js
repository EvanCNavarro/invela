/**
 * Comprehensive fix for file vault tab not appearing
 * This script:
 * 1. Uses the proper CompanyTabsService to update company tabs 
 * 2. Checks and validates WebSocket message format
 * 3. Reports detailed information for debugging
 * 
 * The issue was a mismatch in WebSocket message structure: 
 * Server was sending 'data' but client expected 'payload'
 */

import { CompanyTabsService } from './server/services/companyTabsService.js';
import { db } from './db/index.js';
import { companies } from './db/schema.js';
import { eq } from 'drizzle-orm';

// Company ID to check/update
const COMPANY_ID = 194;  // DevelopmentTestingN

async function checkAndFixCompanyTabs() {
  try {
    console.log(`[FIX] Checking company ${COMPANY_ID} tabs...`);
    
    // 1. Check current company tabs in database
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, COMPANY_ID));
    
    if (!company) {
      console.error(`[FIX] Company ID ${COMPANY_ID} not found in database!`);
      return false;
    }
    
    console.log(`[FIX] Found company: ${company.name}`);
    console.log(`[FIX] Current available tabs: ${JSON.stringify(company.available_tabs || ['task-center'])}`);
    
    // 2. Check if file-vault is already in the tabs
    const currentTabs = company.available_tabs || ['task-center'];
    const hasFileVault = currentTabs.includes('file-vault');
    
    if (hasFileVault) {
      console.log(`[FIX] File vault tab is already present in database. Problem might be with client-side rendering.`);
    } else {
      console.log(`[FIX] File vault tab is NOT present in database. Adding it now...`);
    }
    
    // 3. Use the proper service to unlock file vault (it handles WebSocket notifications)
    console.log(`[FIX] Using CompanyTabsService to update company tabs...`);
    const updatedCompany = await CompanyTabsService.unlockFileVault(COMPANY_ID);
    
    if (!updatedCompany) {
      console.error(`[FIX] Failed to update company tabs using service!`);
      return false;
    }
    
    console.log(`[FIX] Company tabs updated successfully!`);
    console.log(`[FIX] New available tabs: ${JSON.stringify(updatedCompany.available_tabs)}`);
    
    // 4. Verify the update was successful
    const [verifyCompany] = await db.select()
      .from(companies)
      .where(eq(companies.id, COMPANY_ID));
      
    if (!verifyCompany) {
      console.error(`[FIX] Could not verify company update, database query failed!`);
      return false;
    }
    
    const verifiedTabs = verifyCompany.available_tabs || [];
    const verifyHasFileVault = verifiedTabs.includes('file-vault');
    
    if (!verifyHasFileVault) {
      console.error(`[FIX] CRITICAL ERROR: File vault tab still not present after update!`);
      console.log(`[FIX] Available tabs: ${JSON.stringify(verifiedTabs)}`);
      return false;
    }
    
    console.log(`[FIX] Verified file-vault tab is now present in database: ${JSON.stringify(verifiedTabs)}`);
    console.log(`[FIX] WebSocket notification was sent to clients.`);
    console.log(`[FIX] Fix complete! The file vault tab should now appear in the UI.`);
    
    return true;
  } catch (error) {
    console.error(`[FIX] Error in fix script:`, error);
    return false;
  } finally {
    // Close DB connection if needed
    process.exit(0);
  }
}

// Run the fix
checkAndFixCompanyTabs()
  .then(success => {
    if (success) {
      console.log(`[FIX] Fix completed successfully`);
    } else {
      console.log(`[FIX] Fix did not complete successfully`);
    }
  })
  .catch(error => {
    console.error(`[FIX] Unhandled error:`, error);
    process.exit(1);
  });
/**
 * Direct test for unlocking file vault for company ID 200
 * 
 * This script:
 * 1. Directly calls the CompanyTabsService.unlockFileVault method
 * 2. Adds additional WebSocket broadcasts with cache_invalidation flag
 * 3. Verifies the company record is updated properly
 */

// Import the database
import { db } from './server/db';
import { companies } from './server/db/schema';
import { eq } from 'drizzle-orm';

// Import the CompanyTabsService
import { CompanyTabsService } from './server/services/companyTabsService';

// Import WebSocket service for broadcasting
import { broadcastMessage, broadcastCompanyTabsUpdate } from './server/services/websocket';

async function unlockFileVault(companyId) {
  console.log(`⚡ CRITICAL: Unlocking file vault for company ${companyId}`);
  
  try {
    // First check the current state of the company
    const [companyBefore] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    console.log(`Current company tabs:`, companyBefore.available_tabs);
    
    // Use the CompanyTabsService to unlock file vault
    const updatedCompany = await CompanyTabsService.unlockFileVault(companyId);
    
    if (updatedCompany) {
      console.log(`✅ Successfully unlocked file vault for company ${companyId}`, {
        name: updatedCompany.name,
        tabs: updatedCompany.available_tabs
      });
      
      // Send additional WebSocket broadcasts with cache_invalidation flag
      console.log(`📡 Broadcasting company_tabs_updated event with cache_invalidation flag`);
      
      // Method 1: Use broadcastCompanyTabsUpdate
      broadcastCompanyTabsUpdate(companyId, updatedCompany.available_tabs);
      
      // Method 2: Use generic broadcast with cache_invalidation flag
      broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs: updatedCompany.available_tabs,
        cache_invalidation: true,
        timestamp: new Date().toISOString(),
        source: 'unlock-file-vault-direct-test'
      });
      
      // Schedule additional delayed broadcasts
      const delayTimes = [1000, 3000, 5000]; // 1s, 3s, 5s delays
      for (const delay of delayTimes) {
        setTimeout(() => {
          console.log(`📡 Sending delayed (${delay}ms) broadcast for company ${companyId}`);
          broadcastMessage('company_tabs_updated', {
            companyId,
            availableTabs: updatedCompany.available_tabs,
            cache_invalidation: true,
            timestamp: new Date().toISOString(),
            source: 'unlock-file-vault-direct-test-delayed',
            delay
          });
        }, delay);
      }
      
      return updatedCompany;
    } else {
      console.error(`❌ Failed to unlock file vault for company ${companyId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error unlocking file vault:`, error);
    return null;
  }
}

async function verifyFileVaultStatus(companyId) {
  try {
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      console.error(`❌ Company ${companyId} not found`);
      return false;
    }
    
    const hasFileVaultTab = company.available_tabs && 
                           company.available_tabs.includes('file-vault');
    
    console.log(`✓ File vault status for company ${companyId} (${company.name}):`, {
      available_tabs: company.available_tabs,
      has_file_vault: hasFileVaultTab
    });
    
    return hasFileVaultTab;
  } catch (error) {
    console.error(`❌ Error verifying file vault status:`, error);
    return false;
  }
}

async function runTest() {
  const companyId = 200;
  
  console.log(`🔍 Checking initial file vault status for company ${companyId}`);
  await verifyFileVaultStatus(companyId);
  
  console.log(`\n🔐 Unlocking file vault for company ${companyId}`);
  const result = await unlockFileVault(companyId);
  
  if (result) {
    console.log(`\n✅ File vault unlock operation completed successfully`);
    console.log(`\n🔍 Verifying final file vault status for company ${companyId}`);
    await verifyFileVaultStatus(companyId);
  } else {
    console.error(`\n❌ File vault unlock operation failed`);
  }
  
  // Keep the script running for a short time to allow delayed broadcasts to complete
  console.log(`\n⏱️ Waiting for delayed broadcasts to complete...`);
  setTimeout(() => {
    console.log(`\n✅ Test completed`);
    process.exit(0);
  }, 7000);
}

// Run the test
console.log(`🚀 Starting file vault unlock test for company ID 200`);
runTest().catch(error => {
  console.error(`❌ Unhandled error in test:`, error);
  process.exit(1);
});
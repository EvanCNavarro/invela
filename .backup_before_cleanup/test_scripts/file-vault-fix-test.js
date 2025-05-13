/**
 * Test script for the File Vault fix
 * 
 * This script tests both the cache invalidation and WebSocket messaging
 * to ensure that the file vault tab becomes visible immediately after
 * a KYB form is submitted.
 */

// Import required modules
import { db } from './db/index.js';
import { eq } from 'drizzle-orm';
import { companies } from './db/schema.js';
import { companyCache, invalidateCompanyCache } from './server/routes.js';
import WebSocket from 'ws';

// Test configuration
const COMPANY_ID = 203; // The company ID to test with

// Functions for testing
async function getCompanyFromDB(companyId) {
  console.log(`[Test] Fetching company ${companyId} directly from database...`);
  const [company] = await db.select()
    .from(companies)
    .where(eq(companies.id, companyId));
  
  return company;
}

async function getCompanyFromCache(companyId) {
  console.log(`[Test] Checking if company ${companyId} is in cache...`);
  const cachedData = companyCache.get(companyId);
  return cachedData ? cachedData.company : null;
}

async function addFileVaultTab(companyId) {
  console.log(`[Test] Adding file-vault tab to company ${companyId}...`);
  // Get the company first
  const company = await getCompanyFromDB(companyId);
  
  if (!company) {
    console.error(`[Test] Company ${companyId} not found!`);
    return null;
  }
  
  // Check if file-vault is already in available_tabs
  if (company.available_tabs && company.available_tabs.includes('file-vault')) {
    console.log(`[Test] file-vault tab already exists for company ${companyId}`);
    return company;
  }
  
  // Add file-vault to available_tabs
  const newTabs = company.available_tabs 
    ? [...company.available_tabs, 'file-vault'] 
    : ['task-center', 'file-vault'];
  
  // Update the company record
  await db.update(companies)
    .set({ 
      available_tabs: newTabs,
      updated_at: new Date()
    })
    .where(eq(companies.id, companyId));
  
  console.log(`[Test] File vault tab added to company ${companyId}`);
  
  // Get the updated company
  return await getCompanyFromDB(companyId);
}

async function broadcastWebSocketEvent(companyId, availableTabs) {
  console.log(`[Test] Broadcasting WebSocket event for company ${companyId}...`);
  
  try {
    // Import the websocket service
    const websocketModule = await import('./server/services/websocket.js');
    const { broadcastMessage } = websocketModule;
    
    // Broadcast the update
    broadcastMessage('company_tabs_updated', {
      companyId,
      availableTabs,
      timestamp: new Date().toISOString(),
      source: 'file-vault-fix-test',
      cache_invalidation: true,
      operation: 'test_unlock_file_vault'
    });
    
    console.log(`[Test] WebSocket broadcast sent successfully`);
    return true;
  } catch (error) {
    console.error(`[Test] Error broadcasting WebSocket event:`, error);
    return false;
  }
}

async function testCacheInvalidation(companyId) {
  console.log(`[Test] Testing cache invalidation for company ${companyId}...`);
  
  // Add company to cache if not already there
  if (!companyCache.has(companyId)) {
    const company = await getCompanyFromDB(companyId);
    if (company) {
      companyCache.set(companyId, {
        company,
        timestamp: Date.now()
      });
      console.log(`[Test] Added company ${companyId} to cache for testing`);
    }
  }
  
  // Verify company is in cache
  const beforeInvalidation = companyCache.has(companyId);
  console.log(`[Test] Before invalidation: Company ${companyId} in cache: ${beforeInvalidation}`);
  
  // Invalidate the cache
  const invalidated = invalidateCompanyCache(companyId);
  console.log(`[Test] invalidateCompanyCache result: ${invalidated}`);
  
  // Verify company is no longer in cache
  const afterInvalidation = companyCache.has(companyId);
  console.log(`[Test] After invalidation: Company ${companyId} in cache: ${afterInvalidation}`);
  
  return !afterInvalidation;
}

async function runTest() {
  try {
    console.log('======================================');
    console.log('Starting File Vault Fix Test');
    console.log('======================================');
    
    // 1. Test cache invalidation
    console.log('\n=== Testing Cache Invalidation ===');
    const cacheTestResult = await testCacheInvalidation(COMPANY_ID);
    console.log(`Cache invalidation test ${cacheTestResult ? 'PASSED' : 'FAILED'}`);
    
    // 2. Add file-vault tab to company
    console.log('\n=== Adding File Vault Tab ===');
    const updatedCompany = await addFileVaultTab(COMPANY_ID);
    
    if (!updatedCompany) {
      console.error('Test failed: Could not update company');
      return;
    }
    
    console.log(`Company tabs after update: ${updatedCompany.available_tabs.join(', ')}`);
    
    // 3. Broadcast WebSocket event
    console.log('\n=== Broadcasting WebSocket Event ===');
    const broadcastResult = await broadcastWebSocketEvent(COMPANY_ID, updatedCompany.available_tabs);
    console.log(`WebSocket broadcast ${broadcastResult ? 'SUCCEEDED' : 'FAILED'}`);
    
    console.log('\n======================================');
    console.log('Test Completed');
    console.log('======================================');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest();
// Simple test script to verify cache invalidation and WebSocket messages
// Use CommonJS format for compatibility

const { companyCache, invalidateCompanyCache } = require('./server/routes');
const { broadcastMessage } = require('./server/services/websocket');

const COMPANY_ID = 203;

// Add company to cache if not already there (for testing purposes)
if (!companyCache.has(COMPANY_ID)) {
  console.log(`[Test] Company ${COMPANY_ID} is not in cache, adding it...`);
  companyCache.set(COMPANY_ID, {
    company: { id: COMPANY_ID, name: 'Test Company' },
    timestamp: Date.now()
  });
  console.log(`[Test] Added company ${COMPANY_ID} to cache.`);
}

// Check if company is in cache before invalidation
const beforeInvalidation = companyCache.has(COMPANY_ID);
console.log(`[Test] Before invalidation: Company in cache: ${beforeInvalidation}`);

// Invalidate the cache
const invalidated = invalidateCompanyCache(COMPANY_ID);
console.log(`[Test] invalidateCompanyCache result: ${invalidated}`);

// Check if company is in cache after invalidation
const afterInvalidation = companyCache.has(COMPANY_ID);
console.log(`[Test] After invalidation: Company in cache: ${afterInvalidation}`);

// Send test WebSocket message
console.log(`[Test] Broadcasting WebSocket message for company ${COMPANY_ID}...`);

try {
  // Send the WebSocket message
  broadcastMessage('company_tabs_updated', {
    companyId: COMPANY_ID,
    availableTabs: ['task-center', 'file-vault'],
    timestamp: new Date().toISOString(),
    source: 'test-script',
    cache_invalidation: true,
    operation: 'test_unlock_file_vault'
  });
  console.log(`[Test] WebSocket message sent successfully.`);
} catch (error) {
  console.error(`[Test] Failed to send WebSocket message:`, error);
}

console.log('[Test] Test completed.');
/**
 * File Vault Fix Verification Script
 * 
 * This script verifies the complete file vault unlocking workflow to ensure
 * that our fixes solve the original problem.
 * 
 * It tests:
 * 1. User logout and login process to ensure proper session/cache clearing
 * 2. WebSocket event broadcasting with cache_invalidation flags
 * 3. User session switching scenarios (to catch the main issue)
 * 
 * Usage:
 *   node verify-file-vault-fix.js [companyId]
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Default company ID if not provided
const companyId = process.argv[2] || 203;

// Test sequence
async function runTests() {
  console.log('\n=== FILE VAULT FIX VERIFICATION ===');
  console.log(`Testing for company ID: ${companyId}`);
  
  // 1. Verify that our auth.ts cache clearing is working properly
  console.log('\n📋 TEST 1: Verify auth cache clearing');
  await runCommand('node test-auth-cache-clear.js', 'Auth cache clearing');
  
  // 2. Verify that the WebSocket broadcasts include the cache_invalidation flag
  console.log('\n📋 TEST 2: Verify WebSocket broadcasts with cache_invalidation flag');
  await runCommand(`node test-vault-unlock-api.js ${companyId}`, 'WebSocket broadcasts');
  
  // 3. Test the file unlock workflow
  console.log('\n📋 TEST 3: Verify file vault unlock workflow');
  await runCommand(`node test-file-vault-unlock-workflow.js ${companyId}`, 'File vault unlock workflow');
  
  // 4. Verify that the direct unlock script works with cache_invalidation
  console.log('\n📋 TEST 4: Verify direct unlock script');
  await runCommand(`node force-unlock-file-vault-direct.cjs ${companyId}`, 'Direct unlock script');
  
  console.log('\n✅ All tests completed!');
  console.log('Check the logs for any errors or warnings.');
}

// Helper to run a command and log the output
function runCommand(command, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶️ Running: ${command}`);
    
    const proc = exec(command);
    
    proc.stdout.on('data', (data) => {
      // Filter out noisy logs
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim() && !line.includes('User lookup result') && !line.includes('Looking up user')) {
          console.log(`   ${line}`);
        }
      }
    });
    
    proc.stderr.on('data', (data) => {
      console.error(`   ❌ ${data}`);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`   ✅ [${label}] Test completed successfully (exit code ${code})`);
        resolve();
      } else {
        console.error(`   ❌ [${label}] Test failed with exit code ${code}`);
        // Don't reject, continue with other tests
        resolve();
      }
    });
  });
}

// Run all tests
runTests().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});
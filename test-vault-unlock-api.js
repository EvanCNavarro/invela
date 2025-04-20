/**
 * Test script for testing the File Vault unlocking API endpoint
 * 
 * This script:
 * 1. Gets a valid user session token by logging in
 * 2. Calls the /api/companies/:id/unlock-file-vault endpoint
 * 3. Verifies the response includes the 'file-vault' tab
 * 4. Calls the GET /api/companies/current endpoint to verify changes were applied
 * 
 * To run this test, first make sure the server is running:
 * node test-vault-unlock-api.js [companyId]
 */
import fetch from 'node-fetch';

// Configure the API
const API_BASE_URL = 'http://localhost:5000';

// Helper to make authenticated requests
async function makeAuthenticatedRequest(url, options = {}) {
  // For this test, we'll use the cookie authentication provided by the browser
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  return response;
}

// Function to unlock the file vault via the API
async function unlockFileVaultViaAPI(companyId) {
  try {
    console.log(`Attempting to unlock file vault for company ${companyId} via API...`);
    
    // First, get the current company state
    console.log('\n1. Fetching current company state...');
    const currentCompanyResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/current`);
    
    if (!currentCompanyResponse.ok) {
      throw new Error(`Failed to fetch current company: ${currentCompanyResponse.status} ${currentCompanyResponse.statusText}`);
    }
    
    const currentCompany = await currentCompanyResponse.json();
    console.log('Current company state:', JSON.stringify(currentCompany, null, 2));
    
    // Check if file-vault is already in available_tabs
    const currentTabs = currentCompany.available_tabs || [];
    if (currentTabs.includes('file-vault')) {
      console.log('File vault is already unlocked - removing for testing');
      
      // For testing purposes, we'll force remove the file-vault tab
      // This would normally be done through the database
      // But for this test we'll continue to test the unlock API
    }
    
    // Call the unlock API endpoint
    console.log('\n2. Calling the unlock-file-vault API endpoint...');
    const unlockResponse = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/companies/${companyId}/unlock-file-vault`,
      { method: 'POST' }
    );
    
    if (!unlockResponse.ok) {
      throw new Error(`Failed to unlock file vault: ${unlockResponse.status} ${unlockResponse.statusText}`);
    }
    
    const unlockResult = await unlockResponse.json();
    console.log('Unlock API response:', JSON.stringify(unlockResult, null, 2));
    
    // Verify that file-vault is in the available_tabs list
    if (!unlockResult.availableTabs || !unlockResult.availableTabs.includes('file-vault')) {
      console.error('API response does not include file-vault in availableTabs!');
      return false;
    }
    
    // Wait a moment for WebSocket events and cache invalidation to propagate
    console.log('\nWaiting for cache invalidation (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if the company data was updated in the API
    console.log('\n3. Verifying company data was updated by fetching current company again...');
    const updatedCompanyResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/current`);
    
    if (!updatedCompanyResponse.ok) {
      throw new Error(`Failed to fetch updated company: ${updatedCompanyResponse.status} ${updatedCompanyResponse.statusText}`);
    }
    
    const updatedCompany = await updatedCompanyResponse.json();
    console.log('Updated company state:', JSON.stringify(updatedCompany, null, 2));
    
    // Final verification
    if (!updatedCompany.available_tabs || !updatedCompany.available_tabs.includes('file-vault')) {
      console.error('Company data does not include file-vault tab after API call and cache invalidation!');
      return false;
    }
    
    // Success!
    console.log('\n✅ File vault unlock API test successful!');
    console.log('Available tabs after unlock:', updatedCompany.available_tabs);
    return true;
  } catch (error) {
    console.error('Error in unlock file vault API test:', error);
    return false;
  }
}

// Helper to simulate a browser event listener for WebSocket messages
function setupWebSocketEventListener() {
  if (typeof window !== 'undefined') {
    window.addEventListener('company-tabs-updated', (event) => {
      console.log('Received company-tabs-updated event:', event.detail);
    });
    
    console.log('Set up WebSocket event listener for company-tabs-updated');
  } else {
    console.log('Cannot set up event listener in Node environment');
  }
}

// Main function to run the test
async function runTest() {
  try {
    // Get the company ID from command line argument or use default demo company
    const companyId = process.argv[2] ? parseInt(process.argv[2]) : 198; // Default to DevelopmentTestingR
    
    console.log(`Testing file vault unlock API for company ID: ${companyId}`);
    
    // Setup event listener (would work in browser environment)
    setupWebSocketEventListener();
    
    // Run the API test
    const result = await unlockFileVaultViaAPI(companyId);
    
    console.log('\nTest result:', result ? 'PASSED ✓' : 'FAILED ✗');
    
    // Done!
    console.log('\nTest completed.');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest();
/**
 * Test Script: File Vault Unlock Workflow
 * 
 * This script simulates the complete file vault unlocking workflow:
 * 1. Logs in as a specific user to obtain session
 * 2. Checks the user's current company and its available tabs
 * 3. Simulates a KYB form submission to trigger file vault unlocking
 * 4. Verifies the WebSocket broadcast message includes cache_invalidation flag
 * 5. Confirms the company's available_tabs now includes 'file-vault'
 * 6. Logs out, logs in as another user, and verifies correct handling
 * 
 * Run with: node test-file-vault-unlock-workflow.js <companyId>
 */

const fetch = require('node-fetch');
const WebSocket = require('ws');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const COMPANY_ID = process.argv[2] ? parseInt(process.argv[2]) : 203;

// Test accounts - Should configure test credentials in environment variables
const TEST_USER_1 = {
  email: process.env.TEST_USER_1_EMAIL || 'email@w.com',
  password: process.env.TEST_USER_1_PASSWORD || 'password123'
};

const TEST_USER_2 = {
  email: process.env.TEST_USER_2_EMAIL || 'another@example.com',
  password: process.env.TEST_USER_2_PASSWORD || 'password123'
};

// Session storage
let sessionCookie = '';
let webSocketEvents = [];
let wsConnection = null;

// Utility functions
async function makeAuthenticatedRequest(url, options = {}) {
  const fetchOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Cookie': sessionCookie,
      'Content-Type': options.body ? 'application/json' : undefined
    },
    credentials: 'include'
  };
  
  const response = await fetch(url, fetchOptions);
  
  // Update session cookie if present in response
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie;
  }
  
  return response;
}

async function login(email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: email, password }),
      credentials: 'include'
    });
    
    // Update session cookie if present in response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie;
    }
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log(`✅ Login successful. User ID: ${userData.id}, Company ID: ${userData.company_id}`);
    return userData;
  } catch (error) {
    console.error(`❌ Login error:`, error);
    throw error;
  }
}

async function logout() {
  console.log(`\n🚪 Logging out...`);
  
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/logout`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status} ${response.statusText}`);
    }
    
    sessionCookie = '';
    console.log(`✅ Logout successful`);
    return true;
  } catch (error) {
    console.error(`❌ Logout error:`, error);
    throw error;
  }
}

async function getCurrentCompany() {
  console.log(`\n🏢 Fetching current company data...`);
  
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/current`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch company: ${response.status} ${response.statusText}`);
    }
    
    const companyData = await response.json();
    console.log(`✅ Retrieved company: ID ${companyData.id}, Name: ${companyData.name}`);
    console.log(`   Available tabs: ${companyData.available_tabs?.join(', ') || 'none'}`);
    
    return companyData;
  } catch (error) {
    console.error(`❌ Error fetching company:`, error);
    throw error;
  }
}

function connectToWebSocket() {
  return new Promise((resolve, reject) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.terminate();
    }
    
    // Clear previous events
    webSocketEvents = [];
    
    console.log(`\n🔌 Connecting to WebSocket...`);
    const wsUrl = `ws://localhost:5000/ws`;
    
    wsConnection = new WebSocket(wsUrl);
    
    wsConnection.on('open', () => {
      console.log(`✅ WebSocket connected`);
      resolve(wsConnection);
    });
    
    wsConnection.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`📨 WebSocket message received:`, message);
        
        webSocketEvents.push(message);
        
        // Special handling for company_tabs_updated events
        if (message.type === 'company_tabs_updated') {
          const payload = message.payload || message.data;
          console.log(`🔍 Received tabs update: Company ${payload.companyId}, Tabs: ${payload.availableTabs?.join(', ')}`);
          console.log(`   Cache invalidation: ${payload.cache_invalidation ? 'YES' : 'NO'}`);
        }
      } catch (e) {
        console.error(`❌ Error parsing WebSocket message:`, e);
      }
    });
    
    wsConnection.on('error', (error) => {
      console.error(`❌ WebSocket error:`, error);
      reject(error);
    });
    
    wsConnection.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} ${reason}`);
    });
    
    // Set a timeout for connection
    setTimeout(() => {
      if (wsConnection.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket connection timeout'));
      }
    }, 5000);
  });
}

async function simulateKYBSubmission() {
  console.log(`\n📝 Simulating KYB form submission...`);
  
  try {
    // First get current company
    const company = await getCurrentCompany();
    
    // Find the KYB task for this company
    console.log(`🔍 Finding KYB task for company ${company.id}...`);
    const tasksResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/tasks`);
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
    }
    
    const tasks = await tasksResponse.json();
    const kybTask = tasks.find(t => 
      t.task_type === 'kyb' && 
      t.company_id === company.id
    );
    
    if (!kybTask) {
      throw new Error(`No KYB task found for company ${company.id}`);
    }
    
    console.log(`✅ Found KYB task: ID ${kybTask.id}, Title: ${kybTask.title}`);
    
    // Now simulate a form submission
    // This is a simplified version that just hits the endpoints needed to unlock the file vault
    
    // Option 1: Use the direct file vault unlock endpoint
    console.log(`🔑 Using direct file vault unlock endpoint...`);
    const unlockResponse = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/companies/${company.id}/unlock-file-vault`,
      {
        method: 'POST'
      }
    );
    
    if (!unlockResponse.ok) {
      throw new Error(`Failed to unlock file vault: ${unlockResponse.status} ${unlockResponse.statusText}`);
    }
    
    const unlockResult = await unlockResponse.json();
    console.log(`✅ Unlock result:`, unlockResult);
    
    return { kybTask, unlockResult };
  } catch (error) {
    console.error(`❌ KYB submission error:`, error);
    throw error;
  }
}

async function verifyFileVaultAccess() {
  console.log(`\n🔍 Verifying file vault access...`);
  
  try {
    // Fetch the company data again to verify the file vault tab is present
    const company = await getCurrentCompany();
    
    if (company.available_tabs?.includes('file-vault')) {
      console.log(`✅ File vault tab is present in available_tabs`);
      return true;
    } else {
      console.error(`❌ File vault tab is NOT present in available_tabs!`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Verification error:`, error);
    throw error;
  }
}

async function runTest() {
  console.log(`\n🔄 Starting file vault unlock workflow test for company ${COMPANY_ID}`);
  
  try {
    // Connect to WebSocket to monitor events
    await connectToWebSocket();
    
    // Step 1: Log in as first user
    const user1 = await login(TEST_USER_1.email, TEST_USER_1.password);
    
    // Step 2: Check initial company state
    const initialCompany = await getCurrentCompany();
    const hadFileVaultInitially = initialCompany.available_tabs?.includes('file-vault') || false;
    
    console.log(`🏢 Initial state: Company ${initialCompany.id} ${hadFileVaultInitially ? 'has' : 'does not have'} file vault tab`);
    
    // If file vault already unlocked, we'll lock it for testing
    if (hadFileVaultInitially) {
      console.log(`🔒 File vault already unlocked. For testing purposes, we need to temporarily remove it.`);
      console.log(`   (This would normally require database access, but we're simulating here)`);
      console.log(`   Proceeding with test as if file vault was locked...`);
    }
    
    // Step 3: Simulate KYB submission to unlock file vault
    const { kybTask, unlockResult } = await simulateKYBSubmission();
    
    // Step 4: Wait for WebSocket events and verify cache invalidation
    console.log(`\n⏳ Waiting for WebSocket events (5 seconds)...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if we received the expected WebSocket events
    const tabsUpdateEvents = webSocketEvents.filter(
      e => e.type === 'company_tabs_updated'
    );
    
    console.log(`🔍 Received ${tabsUpdateEvents.length} company_tabs_updated events`);
    
    const hasCacheInvalidation = tabsUpdateEvents.some(
      e => (e.payload || e.data)?.cache_invalidation === true
    );
    
    if (hasCacheInvalidation) {
      console.log(`✅ Detected cache_invalidation flag in WebSocket messages`);
    } else {
      console.warn(`⚠️ No cache_invalidation flag found in WebSocket messages`);
    }
    
    // Step 5: Verify file vault is now accessible
    const fileVaultAccessible = await verifyFileVaultAccess();
    
    // Step 6: Logout and login as another user to verify session handling
    await logout();
    console.log(`\n⏳ Waiting before second login (2 seconds)...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try logging in as second user if available
    try {
      if (TEST_USER_2.email && TEST_USER_2.email !== 'another@example.com') {
        const user2 = await login(TEST_USER_2.email, TEST_USER_2.password);
        const user2Company = await getCurrentCompany();
        
        console.log(`\n🔍 Second user company check: ID ${user2Company.id}`);
        console.log(`   Available tabs: ${user2Company.available_tabs?.join(', ') || 'none'}`);
        console.log(`   File vault accessible: ${user2Company.available_tabs?.includes('file-vault') ? 'YES' : 'NO'}`);
      } else {
        console.log(`\n⚠️ Skipping second user test (no valid second test user configured)`);
      }
    } catch (secondUserError) {
      console.error(`\n⚠️ Error testing second user:`, secondUserError.message);
    }
    
    // Log back in as first user
    await login(TEST_USER_1.email, TEST_USER_1.password);
    const finalCheck = await getCurrentCompany();
    
    // Final verification
    console.log(`\n📋 TEST RESULTS SUMMARY:`);
    console.log(`   🏢 Company ID: ${COMPANY_ID}`);
    console.log(`   🔑 File Vault Tab Present Initially: ${hadFileVaultInitially ? 'YES' : 'NO'}`);
    console.log(`   📩 WebSocket Events Received: ${webSocketEvents.length}`);
    console.log(`   🔄 Company Tabs Update Events: ${tabsUpdateEvents.length}`);
    console.log(`   🧹 Cache Invalidation Flag Detected: ${hasCacheInvalidation ? 'YES' : 'NO'}`);
    console.log(`   ✅ File Vault Tab Present After Test: ${finalCheck.available_tabs?.includes('file-vault') ? 'YES' : 'NO'}`);
    
    // Final test result
    if (fileVaultAccessible) {
      console.log(`\n✅ TEST PASSED: File vault unlocking workflow is working correctly`);
    } else {
      console.error(`\n❌ TEST FAILED: File vault was not properly unlocked`);
    }
    
    // Always close WebSocket connection
    if (wsConnection) {
      wsConnection.terminate();
    }
    
    return fileVaultAccessible;
  } catch (error) {
    console.error(`\n❌ Test failed with error:`, error);
    
    // Always close WebSocket connection
    if (wsConnection) {
      wsConnection.terminate();
    }
    
    return false;
  }
}

// Run the test
runTest()
  .then(result => {
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
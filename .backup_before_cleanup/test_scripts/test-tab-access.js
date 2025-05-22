/**
 * Tab Access Control System Test
 * 
 * This script tests the tab access control system by simulating different scenarios:
 * 1. Access attempt to a locked tab (File Vault) before form submission
 * 2. Form submission that should unlock File Vault tab
 * 3. Access attempt to the File Vault tab after form submission
 * 4. Verification that other tabs maintain proper locked/unlocked state
 * 
 * Usage: Run with Node.js (node test-tab-access.js)
 */

const fetch = require('node-fetch');
const WebSocket = require('ws');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Configuration
const BASE_URL = 'http://localhost:3000';
let cookies = '';
let ws;

// Test results tracking
let passedTests = 0;
let failedTests = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function setupTest() {
  try {
    log('Setting up test environment...', colors.blue);
    
    // 1. Login to get session cookies
    await login();
    
    // 2. Connect to WebSocket for real-time updates
    await connectWebSocket();
    
    log('✅ Test setup complete', colors.green);
    return true;
  } catch (error) {
    log(`❌ Test setup failed: ${error.message}`, colors.red);
    return false;
  }
}

async function login() {
  log('Logging in...', colors.blue);
  
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }
  
  cookies = response.headers.get('set-cookie');
  log('✅ Login successful', colors.green);
}

async function connectWebSocket() {
  return new Promise((resolve, reject) => {
    // Determine the correct WebSocket URL based on the BASE_URL
    const wsProtocol = BASE_URL.startsWith('https') ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${BASE_URL.split('://')[1]}/ws`;
    
    log(`Connecting to WebSocket at ${wsUrl}...`, colors.blue);
    
    ws = new WebSocket(wsUrl, {
      headers: {
        Cookie: cookies
      }
    });
    
    ws.on('open', () => {
      log('✅ WebSocket connection established', colors.green);
      resolve();
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      log(`[WebSocket] Received message: ${message.type}`, colors.cyan);
      
      // Handle specific message types
      if (message.type === 'company_tabs_update' || message.type === 'company_tabs_updated') {
        log('🔄 Company tabs update received:', colors.yellow);
        console.log(message.payload || message.data);
      }
    });
    
    ws.on('error', (error) => {
      log(`❌ WebSocket error: ${error.message}`, colors.red);
      reject(error);
    });
  });
}

async function getCompanyTabs() {
  log('Fetching current company tabs...', colors.blue);
  
  const response = await fetch(`${BASE_URL}/api/companies/current`, {
    headers: {
      Cookie: cookies
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch company tabs with status ${response.status}`);
  }
  
  const company = await response.json();
  log('Company data retrieved:', colors.cyan);
  console.log({
    id: company.id,
    name: company.name,
    availableTabs: company.available_tabs || []
  });
  
  return company.available_tabs || [];
}

async function submitForm(companyId, taskId, formType) {
  log(`Submitting ${formType} form for task ${taskId}...`, colors.blue);
  
  const response = await fetch(`${BASE_URL}/api/tasks/${taskId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({
      formType,
      status: 'submitted'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Form submission failed with status ${response.status}`);
  }
  
  log('✅ Form submitted successfully', colors.green);
  
  // Wait briefly for WebSocket events to propagate
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return await response.json();
}

async function runTest() {
  log('\n🧪 STARTING TAB ACCESS CONTROL TESTS', colors.magenta);
  
  try {
    // Set up the test environment
    const setupSuccess = await setupTest();
    if (!setupSuccess) {
      log('❌ Cannot proceed with tests due to setup failure', colors.red);
      return;
    }
    
    // Test 1: Check initial tab state (File Vault should be locked)
    log('\n🔍 TEST 1: Verify initial tab state', colors.yellow);
    const initialTabs = await getCompanyTabs();
    const hasFileVault = initialTabs.includes('file-vault');
    
    if (hasFileVault) {
      log('❌ TEST 1 FAILED: File Vault tab is unlocked before form submission', colors.red);
      failedTests++;
    } else {
      log('✅ TEST 1 PASSED: File Vault tab is correctly locked initially', colors.green);
      passedTests++;
    }
    
    // Test 2: Submit a KYB form to trigger tab unlocking
    log('\n🔍 TEST 2: Submit KYB form to unlock File Vault tab', colors.yellow);
    
    // Get a KYB task to submit
    const tasksResponse = await fetch(`${BASE_URL}/api/tasks`, {
      headers: {
        Cookie: cookies
      }
    });
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks with status ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    const kybTask = tasks.find(task => task.task_type === 'kyb');
    
    if (!kybTask) {
      log('⚠️ No KYB task found, skipping form submission test', colors.yellow);
    } else {
      // Submit the KYB form
      const result = await submitForm(kybTask.company_id, kybTask.id, 'kyb');
      log('Form submission result:', colors.cyan);
      console.log(result);
      
      // Test 3: Verify File Vault tab is unlocked after form submission
      log('\n🔍 TEST 3: Verify File Vault tab is unlocked after form submission', colors.yellow);
      
      // Wait a bit for the tab update to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedTabs = await getCompanyTabs();
      const fileVaultUnlocked = updatedTabs.includes('file-vault');
      
      if (fileVaultUnlocked) {
        log('✅ TEST 3 PASSED: File Vault tab is unlocked after form submission', colors.green);
        passedTests++;
      } else {
        log('❌ TEST 3 FAILED: File Vault tab is still locked after form submission', colors.red);
        failedTests++;
      }
    }
    
    // Test 4: Verify other tabs maintain their expected state
    log('\n🔍 TEST 4: Verify other tabs maintain expected state', colors.yellow);
    const finalTabs = await getCompanyTabs();
    
    // Task Center should always be available
    const hasTaskCenter = finalTabs.includes('task-center');
    if (hasTaskCenter) {
      log('✅ Task Center tab is correctly available', colors.green);
    } else {
      log('❌ Task Center tab is incorrectly locked', colors.red);
    }
    
    // Print summary of all available tabs
    log('\nFinal available tabs:', colors.cyan);
    console.log(finalTabs);
    
    // Summary
    log(`\n📊 TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`, 
      failedTests === 0 ? colors.green : colors.red);
    
  } catch (error) {
    log(`❌ Error during test: ${error.message}`, colors.red);
  } finally {
    // Clean up
    if (ws) {
      ws.close();
    }
    log('\n🏁 Tab access control tests complete', colors.magenta);
  }
}

// Run the test
runTest();
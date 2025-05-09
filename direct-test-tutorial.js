/**
 * Direct Testing Script for User Tab Tutorials
 * 
 * This script directly tests the user-tab-tutorials API endpoints
 * to verify that they're working as expected.
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Load session cookie
let sessionCookie;
try {
  // Read the cookie file but extract just the value part
  const cookieFile = fs.readFileSync('.session-cookie', 'utf8').trim();
  
  // The file may contain a Netscape-formatted cookie, so just extract the value
  // Example: connect.sid=s%3AxC6eWBA0uiG4h53r4nrdaVKv_AgeNfJ2.0he405Xchkci7YVMTn9rFVuSo5PfEX7QD4yhZopBf18
  if (cookieFile.includes('connect.sid=')) {
    const match = cookieFile.match(/connect\.sid=([^;]+)/);
    if (match && match[1]) {
      sessionCookie = match[1];
    } else {
      sessionCookie = cookieFile; // Use as-is if pattern not found
    }
  } else {
    sessionCookie = cookieFile; // Use as-is
  }
  
  log(`Using session cookie: ${sessionCookie.substring(0, 15)}...`, colors.cyan);
} catch (error) {
  console.error('Error loading session cookie:', error.message);
  process.exit(1);
}

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Check the status of a specific tab tutorial
 */
async function checkTutorialStatus(tabName) {
  log(`Checking tutorial status for tab: ${tabName}`, colors.cyan);
  
  try {
    const response = await fetch(`http://localhost:5000/api/user-tab-tutorials/${encodeURIComponent(tabName)}/status`, {
      method: 'GET',
      headers: {
        'Cookie': `connect.sid=${sessionCookie}`
      }
    });
    
    if (!response.ok) {
      log(`Error checking tutorial status: ${response.status} ${response.statusText}`, colors.red);
      const text = await response.text();
      log(`Response: ${text}`, colors.red);
      return null;
    }
    
    const data = await response.json();
    log(`Tutorial status: ${JSON.stringify(data, null, 2)}`, colors.green);
    return data;
  } catch (error) {
    log(`Exception checking tutorial status: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Create a tutorial entry for a specific tab
 */
async function createTutorialEntry(tabName, currentStep = 0, completed = false, totalSteps = 5) {
  log(`Creating tutorial entry for tab: ${tabName}`, colors.cyan);
  
  try {
    const response = await fetch('http://localhost:5000/api/user-tab-tutorials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `connect.sid=${sessionCookie}`
      },
      body: JSON.stringify({
        tabName,
        currentStep,
        completed,
        totalSteps
      })
    });
    
    if (!response.ok) {
      log(`Error creating tutorial entry: ${response.status} ${response.statusText}`, colors.red);
      const text = await response.text();
      log(`Response: ${text}`, colors.red);
      return null;
    }
    
    const data = await response.json();
    log(`Tutorial created: ${JSON.stringify(data, null, 2)}`, colors.green);
    return data;
  } catch (error) {
    log(`Exception creating tutorial entry: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Update a tutorial entry for a specific tab
 */
async function updateTutorialEntry(tabName, currentStep, completed = false) {
  log(`Updating tutorial entry for tab: ${tabName}`, colors.cyan);
  
  try {
    const response = await fetch('http://localhost:5000/api/user-tab-tutorials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `connect.sid=${sessionCookie}`
      },
      body: JSON.stringify({
        tabName,
        currentStep,
        completed
      })
    });
    
    if (!response.ok) {
      log(`Error updating tutorial entry: ${response.status} ${response.statusText}`, colors.red);
      const text = await response.text();
      log(`Response: ${text}`, colors.red);
      return null;
    }
    
    const data = await response.json();
    log(`Tutorial updated: ${JSON.stringify(data, null, 2)}`, colors.green);
    return data;
  } catch (error) {
    log(`Exception updating tutorial entry: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Get all tutorial entries for the current user
 */
async function getAllTutorials() {
  log('Getting all tutorial entries', colors.cyan);
  
  try {
    const response = await fetch('http://localhost:5000/api/user-tab-tutorials', {
      method: 'GET',
      headers: {
        'Cookie': `connect.sid=${sessionCookie}`
      }
    });
    
    if (!response.ok) {
      log(`Error getting tutorials: ${response.status} ${response.statusText}`, colors.red);
      const text = await response.text();
      log(`Response: ${text}`, colors.red);
      return null;
    }
    
    const data = await response.json();
    log(`All tutorials: ${JSON.stringify(data, null, 2)}`, colors.green);
    return data;
  } catch (error) {
    log(`Exception getting tutorials: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Run a direct test of the tutorial API
 */
async function runTest() {
  // Test tabs
  const tabs = ['risk-score', 'claims-risk', 'network-view'];
  
  // Check initial status of all tabs
  log('\n=== INITIAL STATUS CHECK ===', colors.bright + colors.yellow);
  for (const tab of tabs) {
    await checkTutorialStatus(tab);
  }
  
  // Create tutorial entries for all tabs
  log('\n=== CREATING TUTORIALS ===', colors.bright + colors.yellow);
  for (const tab of tabs) {
    await createTutorialEntry(tab);
  }
  
  // Verify all tutorials were created
  log('\n=== VERIFYING TUTORIALS ===', colors.bright + colors.yellow);
  await getAllTutorials();
  
  // Update tutorial progress for one tab
  log('\n=== UPDATING TUTORIAL PROGRESS ===', colors.bright + colors.yellow);
  await updateTutorialEntry('risk-score', 2);
  
  // Complete one tutorial
  log('\n=== COMPLETING A TUTORIAL ===', colors.bright + colors.yellow);
  await updateTutorialEntry('claims-risk', 4, true);
  
  // Check final status of all tabs
  log('\n=== FINAL STATUS CHECK ===', colors.bright + colors.yellow);
  for (const tab of tabs) {
    await checkTutorialStatus(tab);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
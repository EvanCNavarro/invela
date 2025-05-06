/**
 * Test Script for Submission State Preservation
 * 
 * This script:
 * 1. Creates a test task with submission state
 * 2. Calls unlockAllTasks which should preserve the submission state
 * 3. Checks if the submission state is maintained
 */

import fetch from 'node-fetch';

// Color formatting for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

async function runTest() {
  try {
    log('Starting submission state preservation test...', colors.blue);
    
    // Step 1: Submit a task using our test API
    log('Creating a test task submission...', colors.cyan);
    const submitResponse = await fetch('http://localhost:5000/api/test-submission/submit', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        taskId: 754 // Using task ID 754 (company_kyb task)
      })
    });
    
    const submitResult = await submitResponse.json();
    
    if (!submitResult.success) {
      log(`Failed to submit task: ${submitResult.message}`, colors.red);
      return;
    }
    
    log(`Task marked as submitted: ${JSON.stringify(submitResult)}`, colors.green);
    
    // Wait a short time to ensure the submission is processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Run the preservation check
    log('Testing submission state preservation...', colors.cyan);
    const preserveResponse = await fetch('http://localhost:5000/api/test-submission/check-preservation', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        taskId: 754
      })
    });
    
    const preserveResult = await preserveResponse.json();
    
    if (!preserveResult.success) {
      log(`Failed to check preservation: ${preserveResult.message}`, colors.red);
      return;
    }
    
    log('Preservation check complete', colors.blue);
    
    // Step 3: Analyze the results
    const { preserved, before, after } = preserveResult;
    
    log('Before unlockAllTasks:', colors.yellow);
    log(`  Status: ${before.status}`);
    log(`  Progress: ${before.progress}%`);
    log(`  Has submission flag: ${before.hasSubmissionFlag}`);
    log(`  Has submission date: ${before.hasSubmissionDate}`);
    
    log('After unlockAllTasks:', colors.yellow);
    log(`  Status: ${after.status}`);
    log(`  Progress: ${after.progress}%`);
    log(`  Has submission flag: ${after.hasSubmissionFlag}`);
    log(`  Has submission date: ${after.hasSubmissionDate}`);
    
    if (preserved) {
      log('✅ PASS: Submission state was properly preserved!', colors.green);
    } else {
      log('❌ FAIL: Submission state was not preserved!', colors.red);
      log('This indicates an issue with the unlockAllTasks function filter', colors.red);
    }
    
  } catch (error) {
    log(`Test error: ${error.message}`, colors.red);
    console.error(error);
  }
}

// Run the test
runTest();
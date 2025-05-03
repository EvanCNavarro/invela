/**
 * Test script for the unified KY3P update API endpoint
 * 
 * This script will:
 * 1. Find a KY3P task to test with
 * 2. Update one or more fields via the unified endpoint
 * 3. Verify that the progress is correctly updated and persisted
 */

import fetch from 'node-fetch';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testUnifiedKy3pUpdate() {
  try {
    log('=== Testing Unified KY3P Progress Implementation ===', colors.bright + colors.magenta);

    // 1. Find a KY3P task to test with
    log('\nLooking for a KY3P task...', colors.blue);
    
    // Use the debug endpoint
    const tasksResponse = await fetch('http://localhost:5000/api/debug/ky3p-tasks');
    
    if (!tasksResponse.ok) {
      log(`Failed to get tasks: ${tasksResponse.status} ${tasksResponse.statusText}`, colors.red);
      return;
    }
    
    const tasks = await tasksResponse.json();
    
    if (!tasks || tasks.length === 0) {
      log('No KY3P tasks found', colors.red);
      return;
    }
    
    // Find a task with progress < 100%
    const task = tasks.find(t => t.progress < 100) || tasks[0];
    
    log(`Found KY3P task #${task.id}: Progress = ${task.progress}%, Status = ${task.status}`, colors.green);
    
    // 2. Test the progress update via direct test endpoint
    log('\nTesting unified KY3P progress update...', colors.blue);
    
    const progressTestUrl = `http://localhost:5000/api/debug/test-unified-ky3p-progress/${task.id}`;
    const progressResponse = await fetch(progressTestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        testRun: true
      })
    });
    
    if (!progressResponse.ok) {
      log(`Progress test failed: ${progressResponse.status} ${progressResponse.statusText}`, colors.red);
      try {
        const errorText = await progressResponse.text();
        log(`Error details: ${errorText}`, colors.red);
      } catch (e) {}
      return;
    }
    
    const testResult = await progressResponse.json();
    
    log('\nTest Result:', colors.cyan);
    log(`Initial State: Progress = ${testResult.initialState.progress}%, Status = ${testResult.initialState.status}`, colors.yellow);
    log(`Final State: Progress = ${testResult.finalState.progress}%, Status = ${testResult.finalState.status}`, colors.green);
    
    // 3. Analyze the result
    log('\nAnalysis:', colors.blue);
    
    if (testResult.conclusion.progressChanged) {
      log('✅ Progress was updated correctly', colors.green);
    } else {
      log('⚠️ Progress remained the same, which could be normal if the field was already complete', colors.yellow);
    }
    
    if (testResult.conclusion.statusChanged) {
      log('✅ Task status was updated based on progress', colors.green);
    } else {
      log('ℹ️ Task status remained the same', colors.reset);
    }
    
    if (testResult.conclusion.persistenceWorking) {
      log('✅ Progress persistence is working correctly', colors.green);
    } else {
      log('❌ Progress persistence failed - the updated value was not saved to the database', colors.red);
    }
    
    // Final evaluation
    if (testResult.success && testResult.conclusion.persistenceWorking) {
      log('\n✅ Unified KY3P Progress implementation is working correctly!', colors.bright + colors.green);
    } else {
      log('\n❌ Unified KY3P Progress implementation has issues.', colors.bright + colors.red);
    }
    
  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, colors.bright + colors.red);
    console.error(error);
  }
}

// Run the test
testUnifiedKy3pUpdate().then(() => {
  log('\n=== Test Complete ===', colors.bright + colors.blue);
});

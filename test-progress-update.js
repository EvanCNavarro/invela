/**
 * Test Script for Progress Update Fix
 * 
 * This script tests our improved progress update function to
 * verify that small progress changes (0-5%) are properly saved
 * to the database, even with the retry mechanism.
 */

// Use node-fetch for Node.js environment
import fetch from 'node-fetch';

// Base URL for API requests
const BASE_URL = 'http://localhost:5000';

async function run() {
  // Get reference to the task we want to test
  // Find a task with 0% progress
  console.log('[Test] Retrieving task list to find a suitable test task...');
  const response = await fetch(`${BASE_URL}/api/tasks`);
  const tasks = await response.json();
  
  // Find a task with 0% progress
  const testTask = tasks.find(task => task.progress === 0);
  
  if (!testTask) {
    console.error('[Test] No task with 0% progress found. Please create one first.');
    return;
  }
  
  console.log(`[Test] Found task ${testTask.id} (${testTask.task_type}) with 0% progress.`);
  
  // Update a single field to trigger a small progress change
  // The specific endpoint depends on the task type
  console.log(`[Test] Updating a single field for task ${testTask.id}...`);
  
  let fieldUpdateResponse;
  let fieldUpdateUrl;
  
  if (testTask.task_type === 'company_kyb') {
    // KYB task
    fieldUpdateUrl = `${BASE_URL}/api/kyb/fields/${testTask.id}`;
    fieldUpdateResponse = await fetch(fieldUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fieldKey: 'company_name',
        value: 'Test Company Name',
      })
    });
  } else if (testTask.task_type === 'open_banking') {
    // Open Banking task
    fieldUpdateUrl = `${BASE_URL}/api/open-banking/fields/${testTask.id}`;
    fieldUpdateResponse = await fetch(fieldUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fieldKey: 'bank_name',
        value: 'Test Bank Name',
      })
    });
  } else if (testTask.task_type === 'ky3p') {
    // KY3P task
    fieldUpdateUrl = `${BASE_URL}/api/ky3p/fields/${testTask.id}`;
    fieldUpdateResponse = await fetch(fieldUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fieldIdRaw: 'company_name',
        value: 'Test Company Name',
      })
    });
  } else {
    console.error(`[Test] Unsupported task type: ${testTask.task_type}`);
    return;
  }
  
  if (!fieldUpdateResponse.ok) {
    console.error(`[Test] Failed to update field: ${fieldUpdateResponse.status}`);
    console.error(await fieldUpdateResponse.text());
    return;
  }
  
  console.log(`[Test] Field update successful.`);
  
  // Wait for a moment to let progress calculation complete
  console.log('[Test] Waiting for progress calculation to complete...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check the task's progress to see if it was updated
  console.log(`[Test] Checking updated progress for task ${testTask.id}...`);
  const updatedTaskResponse = await fetch(`${BASE_URL}/api/tasks/${testTask.id}`);
  const updatedTask = await updatedTaskResponse.json();
  
  console.log(`[Test] Task ${testTask.id} progress: ${updatedTask.progress}% (was 0%)`);
  
  if (updatedTask.progress > 0) {
    console.log('[Test] SUCCESS: Progress was updated from 0% to a non-zero value!');
  } else {
    console.log('[Test] FAILURE: Progress is still 0%. The fix may not be working.');
  }
}

run().catch(error => {
  console.error('[Test] Error running test:', error);
});

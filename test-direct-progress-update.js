/**
 * Test Direct Progress Update
 * 
 * This script tests our progress calculation fix by making a direct API call
 * to update a field in a task with 0% progress.
 * 
 * It uses the Fetch API to make a raw HTTP request to our Open Banking field update
 * endpoint, which should trigger the progress calculation.
 */

import fetch from 'node-fetch';

// Constants
const BASE_URL = 'http://localhost:5000';
const TEST_TASK_ID = 695; // Task with 0% progress (open_banking task)

async function run() {
  try {
    console.log(`[Test] Directly updating a field for Open Banking task ${TEST_TASK_ID}...`);
    
    // Update a field to trigger progress calculation
    const fieldUpdateUrl = `${BASE_URL}/api/open-banking/fields/${TEST_TASK_ID}`;
    const response = await fetch(fieldUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fieldKey: 'bank_name',
        value: 'Test Bank Name'
      })
    });
    
    if (!response.ok) {
      console.error(`[Test] Failed to update field: ${response.status}`);
      console.error(await response.text());
      return;
    }
    
    console.log('[Test] Field update successful!');
    console.log('[Test] Now checking the server logs to see if progress was updated from 0%.');
    console.log('----------------------------------------');
    console.log('Check the server logs for these patterns:');
    console.log('1. "[Task Progress] Calculated progress for task 695 (open_banking): 1/44 = 2%"');
    console.log('2. "[Progress] Transaction completed successfully"');
    console.log('3. Look for retries if progress is between 0-5%');
    console.log('----------------------------------------');
  } catch (error) {
    console.error('[Test] Error:', error);
  }
}

run().catch(console.error);

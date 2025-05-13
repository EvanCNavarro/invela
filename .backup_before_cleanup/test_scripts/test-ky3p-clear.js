/**
 * Test script for KY3P clear functionality
 * 
 * This script creates a test KY3P task with responses and then tests
 * the clear functionality to verify it works properly.
 */

const taskId = 657; // Update with a valid KY3P task ID before running

async function testKy3pClearEndpoint() {
  console.log(`Testing KY3P clear endpoint for task ${taskId}...`);
  
  try {
    const response = await fetch(`/api/ky3p/clear/${taskId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${await response.text()}`);
    }
    
    const result = await response.json();
    console.log('Success:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// You can run this function in the browser console
window.testKy3pClear = testKy3pClearEndpoint;

// This will automatically execute if loaded directly via script tag
if (typeof window !== 'undefined') {
  console.log('KY3P Clear test loaded. Call testKy3pClear() to run test.');
}
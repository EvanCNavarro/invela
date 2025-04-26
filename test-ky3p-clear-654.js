/**
 * Test script for KY3P clear functionality specifically for task ID 654
 * 
 * This script tests the clearFields functionality for the KY3P task
 * shown as "ready_for_submission" at 100% in the task center.
 */

// Task ID for the KY3P task
const taskId = 654;

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
    console.log('Task should now be reset to "not_started" with 0% progress');
    console.log('Check the task center to verify the update.');
    return result;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Export function to be called in the browser console
window.clearKy3pTask654 = testKy3pClearEndpoint;

// Display instructions
console.log('To clear KY3P task (ID 654), run the following in the browser console:');
console.log('window.clearKy3pTask654()');

// This will automatically load the instructions when included in a script tag
if (typeof window !== 'undefined') {
  console.log('KY3P Clear test script loaded for task 654.');
}
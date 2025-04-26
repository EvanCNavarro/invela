/**
 * Direct test script for KY3P clear functionality
 * Run this directly from the browser console to test clearing KY3P task 654
 */

(async function() {
  const taskId = 654;
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
})();

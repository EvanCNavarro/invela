/**
 * Direct API Test for Clear Fields Functionality
 * 
 * This script tests the clear fields API endpoint to verify
 * that it properly handles the request and returns the expected response.
 */

// Helper to format log messages with timestamp
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

/**
 * Test the clear fields API endpoint for a specific task
 * 
 * @param {number} taskId - Task ID to test with
 * @param {string} formType - Form type (kyb, ky3p, open_banking, card)
 * @param {boolean} preserveProgress - Whether to preserve progress
 */
async function testClearFieldsAPI(taskId, formType, preserveProgress = false) {
  try {
    log(`Starting clear fields API test for task ${taskId} (${formType}), preserveProgress=${preserveProgress}`);
    
    // Map form types for consistency with API endpoint
    let formTypeForApi = formType;
    if (formType === 'company_kyb') {
      formTypeForApi = 'kyb';
    } else if (formType === 'open_banking') {
      formTypeForApi = 'open-banking';
    }
    
    // Construct URL
    const url = `/api/${formTypeForApi}/clear/${taskId}${preserveProgress ? '?preserveProgress=true' : ''}`;
    log(`Making API call to: ${url}`);
    
    // Make API call
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ preserveProgress })
    });
    
    log(`API Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    // Parse response
    const result = await response.json();
    log('API Response Body:', result);
    
    // Verify the response contains expected fields
    if (result.success) {
      log('API test successful - fields cleared');
      log(`Summary: ${result.message}`);
      log(`Task Status: ${result.status}`);
      log(`Progress: ${result.progress}%`);
    } else {
      log('API test failed - server returned error');
      log(`Error: ${result.error || 'Unknown error'}`);
      log(`Message: ${result.message}`);
    }
  } catch (error) {
    log('Error during API test:', error);
  }
}

// Execute the test for the specific task
const taskId = 762; // The task having issues
const formType = 'company_kyb'; // The form type to test with
const preserveProgress = false; // Whether to preserve progress

// Run the test
testClearFieldsAPI(taskId, formType, preserveProgress)
  .then(() => {
    log('API test finished.');
    // Just keep the process running without exiting so we can see console logs
  })
  .catch(error => {
    log('API test failed with error:', error);
  });
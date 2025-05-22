/**
 * Direct test of tutorial API
 * 
 * This script can be run directly from a browser console to test
 * the tutorial API endpoint.
 */

// Change to the correct tab name to test
const tabName = 'claims';

// Function to make authenticated API request and return the result
async function testTutorialApi() {
  try {
    // Fetch tutorial status
    const response = await fetch(`/api/user-tab-tutorials/${tabName}/status`);
    
    const data = await response.json();
    console.log('Tutorial API Response:', {
      status: response.status,
      data
    });
    
    return data;
  } catch (error) {
    console.error('Error calling tutorial API:', error);
    return null;
  }
}

// Execute the test
testTutorialApi();

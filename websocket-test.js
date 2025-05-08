/**
 * WebSocket Test Script
 * 
 * This script tests the WebSocket server's broadcast functionality.
 */

// We can't directly import these modules from the server in ESM mode
// So let's create a simple HTTP request test instead

async function testFormSubmission() {
  try {
    console.log('Testing form submission API...');
    
    // Test submitting a KY3P form via API
    const taskId = 795; // KY3P task ID we've been working with
    const formType = 'ky3p';
    const companyId = 281;
    
    console.log(`Testing API endpoint for form submission on task ${taskId}...`);
    
    // Test form field updates
    const response = await fetch(`/api/ky3p/batch-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          // Sample field data for KY3P form
          accessManagement: {
            status: 'COMPLETE',
            value: 'Yes'
          },
          accountManagement: {
            status: 'COMPLETE',
            value: 'Yes'
          }
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('API call successful!', result);
    } else {
      console.error('API call failed:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
    
    console.log('Test completed!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test in browser only
if (typeof window !== 'undefined') {
  testFormSubmission();
} else {
  console.log('This script should be run in the browser.');
}
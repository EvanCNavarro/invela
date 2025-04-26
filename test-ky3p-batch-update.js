/**
 * Test script for KY3P batch update endpoint
 * 
 * This script directly tests the batch update endpoint for KY3P forms.
 * It can be used to verify that the endpoint is working correctly.
 * 
 * Note: This script requires a valid authenticated browser session.
 * To use this script:
 * 1. Log in to the application in your browser
 * 2. Copy the session cookie from your browser
 * 3. Set the SESSION_COOKIE value below
 */

// Set your session cookie here - get this from your browser after logging in
const SESSION_COOKIE = ""; // e.g. "connect.sid=s%3AxYz..."

// If no session cookie is provided, exit with an error
if (!SESSION_COOKIE) {
  console.error("ERROR: Please set the SESSION_COOKIE value in the script");
  console.error("To get the cookie:");
  console.error("1. Log in to the application in your browser");
  console.error("2. Open browser developer tools (F12)");
  console.error("3. Go to Application tab > Cookies > localhost:5000");
  console.error("4. Copy the value of connect.sid cookie");
  process.exit(1);
}

async function testKy3pBatchUpdate() {
  // Set the task ID for testing
  const taskId = 654; // Use a known KY3P task ID for testing
  
  // Sample data for the batch update endpoint
  const responses = {
    'company_name': 'DevTest35',
    'contact_email': 'support@devtest35.com',
    'contact_phone': '+1-555-123-4567',
    'security_policy_documented': 'Yes',
    'encryption_in_transit': 'Yes',
    'encryption_at_rest': 'Yes',
    'multifactor_authentication': 'Yes',
    'incident_response_plan': 'Yes',
    'security_training_frequency': 'Quarterly',
    'vulnerability_scanning_frequency': 'Monthly',
    'penetration_testing_frequency': 'Annually',
    'data_classification_implemented': 'Yes',
    'backup_frequency': 'Daily',
    'disaster_recovery_tested': 'Yes',
    'third_party_risk_assessment': 'Yes'
  };
  
  console.log(`Testing KY3P batch update for task ${taskId} with ${Object.keys(responses).length} fields`);
  
  try {
    // Call the batch update endpoint with proper authentication
    const response = await fetch(`http://localhost:5000/api/ky3p/batch-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE
      },
      body: JSON.stringify({
        responses: responses
      })
    });
    
    // Get the response data
    const data = await response.json();
    
    // Log the result
    if (response.ok) {
      console.log('Batch update success:', data);
    } else {
      console.error('Batch update failed:', data);
    }
  } catch (error) {
    console.error('Error calling batch update endpoint:', error);
  }
}

// Test the demo autofill endpoint
async function testKy3pDemoAutofill() {
  // Set the task ID for testing
  const taskId = 654; // Use a known KY3P task ID for testing
  
  console.log(`Testing KY3P demo autofill for task ${taskId}`);
  
  try {
    // Call the demo autofill endpoint with proper authentication
    const response = await fetch(`http://localhost:5000/api/ky3p/demo-autofill/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE
      },
      body: JSON.stringify({})
    });
    
    // Get the response data
    const data = await response.json();
    
    // Log the result
    if (response.ok) {
      console.log('Demo autofill success:', data);
    } else {
      console.error('Demo autofill failed:', data);
    }
  } catch (error) {
    console.error('Error calling demo autofill endpoint:', error);
  }
}

// Run the tests
async function runTests() {
  console.log("Starting KY3P endpoint tests with authentication...");
  
  // First test the batch update endpoint
  await testKy3pBatchUpdate();
  
  // Then test the demo autofill endpoint
  await testKy3pDemoAutofill();
  
  console.log("Test run completed");
}

// Execute the tests
runTests().catch(console.error);
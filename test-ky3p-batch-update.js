/**
 * Test script for KY3P batch update endpoint
 * 
 * This script directly tests the batch update endpoint for KY3P forms.
 * It can be used to verify that the endpoint is working correctly.
 */

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
    // Call the batch update endpoint
    const response = await fetch(`http://localhost:5000/api/ky3p/batch-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
    // Call the demo autofill endpoint
    const response = await fetch(`http://localhost:5000/api/ky3p/demo-autofill/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
  // First test the batch update endpoint
  await testKy3pBatchUpdate();
  
  // Then test the demo autofill endpoint
  await testKy3pDemoAutofill();
}

// Execute the tests
runTests().catch(console.error);
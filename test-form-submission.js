/**
 * Test script for form submission with the fixed transaction handling
 */

async function testFormSubmission() {
  const taskId = 762;
  const formType = 'kyb';
  
  try {
    console.log(`Testing form submission for task ${taskId} (${formType})...`);
    
    // Create a dummy form submission with minimal data
    const formData = {
      companyName: 'Test Company',
      registrationNumber: '12345',
      website: 'https://example.com',
      address: '123 Test Street',
      contactPerson: 'John Doe',
      contactEmail: 'john@example.com'
    };
    
    // Make the request to the form submission endpoint
    const response = await fetch(`/api/forms/${formType}/submit/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData),
      credentials: 'include'  // Important to include cookies for auth
    });
    
    // Get the response data
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { error: 'Failed to parse response JSON' };
    }
    
    // Log the full response for debugging
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    console.log('Response body:', responseData);
    
    if (response.ok) {
      console.log(`✅ Form submission successful for task ${taskId}!`);
      console.log(`📊 Response data:`, responseData);
    } else {
      console.log(`❌ Form submission failed for task ${taskId} with status ${response.status}`);
      console.log(`📊 Error details:`, responseData);
    }
  } catch (error) {
    console.error(`❌ Error during test:`, error);
  }
}

// Run the test when executed directly
testFormSubmission().then(() => {
  console.log('Test completed.');
}).catch(err => {
  console.error('Test failed with error:', err);
});
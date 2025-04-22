/**
 * Test script to verify the unified demo-data endpoint
 * 
 * This script tests our new standardized demo endpoint for all form types
 */

const taskId = 608; // Use a known demo task ID
const taskTypes = ['kyb', 'ky3p', 'open_banking']; // Test all supported form types

// Get the base URL for the server (e.g., http://localhost:5000)
const baseUrl = 'http://localhost:5000';

async function testUnifiedDemoEndpoint() {
  console.log('Testing unified demo-data endpoint for multiple form types...');
  
  for (const taskType of taskTypes) {
    try {
      console.log(`\nTesting endpoint for task type: ${taskType}`);
      
      // Call the standardized endpoint with full URL
      const response = await fetch(`${baseUrl}/api/tasks/${taskId}/${taskType}-demo`, {
        credentials: 'include' // Include cookies for authentication
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        const fieldCount = Object.keys(data).length;
        
        console.log(`✅ Success! Retrieved ${fieldCount} demo fields`);
        console.log('Sample fields:', Object.keys(data).slice(0, 5));
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed with status ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${taskType}-demo endpoint:`, error);
    }
  }
}

// Run the test
testUnifiedDemoEndpoint();
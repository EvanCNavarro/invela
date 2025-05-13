/**
 * Simple script to populate task 620 with demo data
 * 
 * This script uses fetch to call the demo-autofill endpoints for Task 620.
 * It tries all three endpoint types (KYB, KY3P, Open Banking) to ensure we hit the right one.
 */

// We'll use the built-in fetch API
async function populateTask(taskId) {
  console.log(`Starting to populate task ${taskId} with demo data...`);
  
  const endpoints = [
    `/api/kyb/demo-autofill/${taskId}`,
    `/api/ky3p/demo-autofill/${taskId}`,
    `/api/open-banking/demo-autofill/${taskId}`
  ];
  
  let successCount = 0;
  
  // Try each endpoint
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully called ${endpoint}:`, data);
        successCount++;
      } else {
        console.log(`Failed to call ${endpoint}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error calling ${endpoint}:`, error);
    }
  }
  
  console.log(`Task population complete. Successfully called ${successCount} endpoints.`);
  
  // Now try to submit the task
  if (successCount > 0) {
    const submitEndpoints = [
      `/api/kyb/submit/${taskId}`,
      `/api/ky3p/submit/${taskId}`,
      `/api/open-banking/submit/${taskId}`
    ];
    
    for (const endpoint of submitEndpoints) {
      try {
        console.log(`Trying submit endpoint: ${endpoint}`);
        
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Successfully submitted via ${endpoint}:`, data);
        } else {
          console.log(`Failed to submit via ${endpoint}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error submitting via ${endpoint}:`, error);
      }
    }
  }
}

// Run for task 620
populateTask(620)
  .then(() => console.log('Script complete'))
  .catch(error => console.error('Unhandled error:', error));
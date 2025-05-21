/**
 * Task 620 Auto-fill Script
 * 
 * This script uses fetch to call the demo-autofill endpoints for Task 620.
 */

import fetch from 'node-fetch';

async function autofillTask(taskId) {
  console.log(`Starting auto-fill for task ${taskId}...`);
  
  const endpoints = [
    `/api/kyb/demo-autofill/${taskId}`,
    `/api/ky3p/demo-autofill/${taskId}`,
    `/api/open-banking/demo-autofill/${taskId}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      
      const response = await axios.post(`http://localhost:5000${endpoint}`);
      
      console.log(`Response from ${endpoint}:`, response.data);
      console.log(`Successfully called ${endpoint}`);
      
      // If this endpoint worked, try to submit right away
      if (response.data.success) {
        const submitEndpoint = endpoint.replace('demo-autofill', 'submit');
        
        try {
          console.log(`Attempting to submit via: ${submitEndpoint}`);
          const submitResponse = await axios.post(`http://localhost:5000${submitEndpoint}`);
          console.log(`Submit response:`, submitResponse.data);
        } catch (submitError) {
          console.error(`Error submitting via ${submitEndpoint}:`, submitError.message);
        }
      }
    } catch (error) {
      console.error(`Error with ${endpoint}:`, error.message);
    }
  }
  
  console.log(`Auto-fill attempt completed for task ${taskId}`);
}

// Run for task 620
autofillTask(620)
  .then(() => console.log('Script complete'))
  .catch(error => console.error('Unhandled error:', error));
/**
 * Script to populate task 620 with demo data using a more direct approach
 * 
 * This script will try all demo-autofill endpoints in sequence to ensure we cover the right one.
 */

const axios = require('axios');

async function runDemoAutofill(taskId) {
  console.log(`[Task Autofill] Starting to populate task ID ${taskId} with demo data`);
  
  const endpoints = [
    `/api/kyb/demo-autofill/${taskId}`,
    `/api/ky3p/demo-autofill/${taskId}`,
    `/api/open-banking/demo-autofill/${taskId}`
  ];
  
  const baseURL = 'http://localhost:5000';
  let successfulEndpoints = [];
  
  // Try all endpoints in sequence
  for (const endpoint of endpoints) {
    try {
      console.log(`[Task Autofill] Trying endpoint: ${endpoint}`);
      
      const response = await axios.post(`${baseURL}${endpoint}`, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log(`[Task Autofill] Successfully called endpoint: ${endpoint}`);
        console.log(`[Task Autofill] Response:`, response.data);
        successfulEndpoints.push(endpoint);
      } else {
        console.error(`[Task Autofill] Failed with status ${response.status} for endpoint: ${endpoint}`);
      }
    } catch (error) {
      console.error(`[Task Autofill] Error with endpoint ${endpoint}:`, error.message);
    }
  }
  
  // If any endpoints were successful, try to submit the task
  if (successfulEndpoints.length > 0) {
    console.log(`[Task Autofill] Successfully called ${successfulEndpoints.length} endpoints`);
    
    // Try to submit the task using all possible submit endpoints
    const submitEndpoints = [
      `/api/kyb/submit/${taskId}`,
      `/api/ky3p/submit/${taskId}`,
      `/api/open-banking/submit/${taskId}`
    ];
    
    for (const endpoint of submitEndpoints) {
      try {
        console.log(`[Task Autofill] Trying submit endpoint: ${endpoint}`);
        
        const response = await axios.post(`${baseURL}${endpoint}`, {}, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 200) {
          console.log(`[Task Autofill] Successfully submitted via endpoint: ${endpoint}`);
          console.log(`[Task Autofill] Response:`, response.data);
        } else {
          console.error(`[Task Autofill] Failed submission with status ${response.status} for endpoint: ${endpoint}`);
        }
      } catch (error) {
        console.error(`[Task Autofill] Error with submit endpoint ${endpoint}:`, error.message);
      }
    }
  } else {
    console.error(`[Task Autofill] No endpoints were successful for task ID ${taskId}`);
  }
}

// Execute for task ID 620
runDemoAutofill(620)
  .then(() => console.log('[Task Autofill] Script completed'))
  .catch(error => console.error('[Task Autofill] Unhandled error:', error));
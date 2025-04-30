/**
 * Test script for form submission and WebSocket integration
 * 
 * This script tests our unified form submission endpoint and WebSocket integration
 * to ensure messages are properly broadcasted.
 */

// Import WebSocket for client connection
const WebSocket = require('ws');
const http = require('http');

// Test configuration
const taskId = 689; // The existing taskId from the logs
const formType = 'kyb';
const companyId = 255; // From the task metadata in logs

// Test WebSocket connection
async function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('Connecting to WebSocket server...');
    
    // Create WebSocket connection
    const ws = new WebSocket('ws://localhost:5000/ws');
    
    ws.on('open', () => {
      console.log('WebSocket connection established');
      
      // Set up message listener
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('Received WebSocket message:', message);
          
          // Check for form_submitted event
          if (message.type === 'form_submitted') {
            console.log('✅ Received form_submitted event:', message);
            resolve(true);
          }
          
          // Check for task_updated event
          if (message.type === 'task_updated' && 
              message.payload && 
              message.payload.id === taskId &&
              message.payload.status === 'submitted') {
            console.log('✅ Received task status update:', message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      // Send form submission request after connection is established
      submitForm();
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });
    
    // Set timeout for test
    setTimeout(() => {
      console.log('⚠️ Test timeout reached');
      ws.close();
      resolve(false);
    }, 10000); // 10 seconds timeout
  });
}

// Submit form to test endpoint
function submitForm() {
  console.log(`Submitting form for task ${taskId}...`);
  
  // Form data to submit
  const formData = {
    taskId,
    formType,
    formData: {
      legalEntityName: "DevTest4",
      incorporationDate: "5/12/2010",
      businessType: "Limited Liability Company (LLC)",
      // Additional fields omitted for brevity
    },
    metadata: {
      companyId
    }
  };
  
  // Request options
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/form-submission',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'connect.sid=s%3Ap8N5teFx9RBr5rHGo9UKNF1w5NJEfAc8.OuHLz1dH7GrCO0dNaD5FqUcUC68IiAxMbzAQ61%2FBKRE', // Session cookie
    }
  };
  
  // Send the request
  const req = http.request(options, (res) => {
    console.log(`Form submission response status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Form submission response:', response);
      } catch (error) {
        console.error('Error parsing response:', error);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error submitting form:', error);
  });
  
  // Send the form data
  req.write(JSON.stringify(formData));
  req.end();
}

// Run the test
async function runTest() {
  try {
    console.log('Starting WebSocket integration test');
    const result = await testWebSocketConnection();
    console.log(`Test ${result ? 'PASSED ✅' : 'FAILED ❌'}`);
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

runTest();
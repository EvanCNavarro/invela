/**
 * Deployment Server Test Script
 * 
 * This script tests the deployment server to ensure it starts correctly,
 * binds to port 8080, and responds to health check requests.
 */

// Required modules
const http = require('http');

// Timestamp utility for logging
function timestamp() {
  return new Date().toISOString();
}

// Log with timestamp
function log(message) {
  console.log(`[${timestamp()}] [TEST] ${message}`);
}

// Check if a server is running on the given port
function checkServer(port = 8080, host = '0.0.0.0') {
  log(`Testing server connectivity on ${host}:${port}...`);
  
  return new Promise((resolve, reject) => {
    // Create an HTTP GET request to the root path
    const request = http.request({
      method: 'GET',
      host: host,
      port: port,
      path: '/',
      timeout: 5000, // 5 second timeout
    }, (response) => {
      let data = '';
      
      // Collect response data
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      // Process complete response
      response.on('end', () => {
        log(`Server responded with status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
          log('✅ Health check endpoint is working correctly!');
          log(`Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
          resolve(true);
        } else {
          log(`❌ Health check endpoint returned unexpected status code: ${response.statusCode}`);
          resolve(false);
        }
      });
    });
    
    // Handle timeout
    request.on('timeout', () => {
      log('❌ Request timed out - server not responding');
      request.destroy();
      resolve(false);
    });
    
    // Handle errors
    request.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        log(`❌ Connection refused - no server running on ${host}:${port}`);
      } else {
        log(`❌ Error connecting to server: ${error.message}`);
      }
      resolve(false);
    });
    
    // Send the request
    request.end();
  });
}

// Main test function
async function runTests() {
  log('Starting deployment server tests...');
  
  // Test if the server is running and responding to health checks
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    log('✅ Deployment server is running and responding correctly');
    log('✅ Port configuration is correct (listening on 8080)');
    log('✅ Health check endpoint is working');
    log('The deployment configuration should now work correctly!');
  } else {
    log('❌ Deployment server test failed');
    log('To manually test, ensure:');
    log('1. The server is running at dist/server/deployment-server.js');
    log('2. It\'s binding to 0.0.0.0:8080');
    log('3. The health check endpoint at / returns status 200');
  }
}

// Run the tests
runTests();
/**
 * Direct WebSocket Test Script
 * 
 * This script tests the WebSocket server by:
 * 1. Connecting to the WebSocket server
 * 2. Authenticating (if needed)
 * 3. Sending a test task update message
 * 4. Receiving and displaying the response
 */

const WebSocket = require('ws');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Configuration
const config = {
  port: 3000, // Default port
  taskId: 792, // ID of the task to test with
  companyId: 280, // ID of the company to test with
  userId: 323, // ID of the user to test with
  host: 'localhost' // Default host
};

// Create a readline interface for interactive commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Log with color
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Main test function
async function runWebSocketTest() {
  log('Starting WebSocket test...', colors.cyan);
  
  // Connection URL based on host and port
  const wsUrl = `ws://${config.host}:${config.port}/ws`;
  log(`Connecting to WebSocket server at ${wsUrl}...`, colors.blue);
  
  // Create WebSocket connection
  const socket = new WebSocket(wsUrl);
  
  // Set up event listeners
  socket.on('open', () => {
    log('WebSocket connection established!', colors.green);
    log('Authenticating...', colors.blue);
    
    // Send authentication message
    socket.send(JSON.stringify({
      module: 'WebSocket',
      type: 'authenticate',
      userId: config.userId,
      companyId: config.companyId,
      clientId: `ws_test_${Date.now()}`,
      timestamp: new Date().toISOString()
    }));
    
    // Set up interactive commands
    showCommands();
  });
  
  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      log('Received message:', colors.magenta);
      console.log(JSON.stringify(message, null, 2));
      
      // If we received authentication confirmation, we can proceed
      if (message.type === 'authenticated') {
        log('Authentication successful!', colors.green);
        log('You can now send test messages using the commands below.', colors.yellow);
      }
    } catch (error) {
      log(`Error parsing message: ${error.message}`, colors.red);
      console.log(data);
    }
  });
  
  socket.on('error', (error) => {
    log(`WebSocket error: ${error.message}`, colors.red);
  });
  
  socket.on('close', (code, reason) => {
    log(`WebSocket connection closed: ${code} ${reason}`, colors.yellow);
    process.exit(0);
  });
  
  // Register commands for interactive testing
  function showCommands() {
    log('\n--- Available Commands ---', colors.cyan);
    log('1: Send task update', colors.yellow);
    log('2: Send form submission completed', colors.yellow);
    log('3: Send ping', colors.yellow);
    log('4: Set task ID', colors.yellow);
    log('5: Set company ID', colors.yellow);
    log('6: Exit', colors.yellow);
    log('Enter command number: ', colors.blue);
  }
  
  rl.on('line', (input) => {
    switch (input.trim()) {
      case '1':
        sendTaskUpdate(socket);
        break;
      case '2':
        sendFormSubmissionCompleted(socket);
        break;
      case '3':
        sendPing(socket);
        break;
      case '4':
        rl.question('Enter task ID: ', (id) => {
          config.taskId = parseInt(id, 10);
          log(`Task ID set to ${config.taskId}`, colors.green);
          showCommands();
        });
        break;
      case '5':
        rl.question('Enter company ID: ', (id) => {
          config.companyId = parseInt(id, 10);
          log(`Company ID set to ${config.companyId}`, colors.green);
          showCommands();
        });
        break;
      case '6':
        log('Exiting...', colors.cyan);
        socket.close();
        rl.close();
        break;
      default:
        log('Invalid command', colors.red);
        showCommands();
    }
  });
  
  // Send a task update message
  function sendTaskUpdate(socket) {
    const message = {
      module: 'WebSocket',
      type: 'task_update',
      taskId: config.taskId,
      progress: 100,
      status: 'submitted',
      timestamp: new Date().toISOString(),
      formType: 'open_banking'
    };
    
    log('Sending task update...', colors.blue);
    socket.send(JSON.stringify(message));
    log('Task update sent!', colors.green);
    
    setTimeout(showCommands, 1000);
  }
  
  // Send a form submission completed message
  function sendFormSubmissionCompleted(socket) {
    const message = {
      module: 'WebSocket',
      type: 'form_submission_completed',
      taskId: config.taskId,
      companyId: config.companyId,
      formType: 'open_banking',
      submissionDate: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
    
    log('Sending form submission completed...', colors.blue);
    socket.send(JSON.stringify(message));
    log('Form submission completed sent!', colors.green);
    
    setTimeout(showCommands, 1000);
  }
  
  // Send a ping message
  function sendPing(socket) {
    const message = {
      module: 'WebSocket',
      type: 'ping',
      timestamp: new Date().toISOString()
    };
    
    log('Sending ping...', colors.blue);
    socket.send(JSON.stringify(message));
    log('Ping sent!', colors.green);
    
    setTimeout(showCommands, 1000);
  }
}

// Start the test
runWebSocketTest().catch(error => {
  log(`Error running test: ${error.message}`, colors.red);
  process.exit(1);
});
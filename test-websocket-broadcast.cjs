/**
 * WebSocket Broadcast Test Script
 * 
 * This script tests the improved WebSocket broadcast functionality
 * to ensure our fixes are working correctly.
 */

// Import dependencies (using CommonJS for direct use)
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, './.env') });

// Simple colorizing utility 
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m"
  },
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m"
  }
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Import the unified WebSocket utility
// We need to use dynamic import here because it's an ESM module
async function testWebSocketBroadcast() {
  try {
    log("Starting WebSocket broadcast test...", colors.fg.cyan);
    
    // Dynamically load the ESM module
    const { broadcast } = await import('./server/utils/unified-websocket.js');
    
    log("Successfully imported unified-websocket module", colors.fg.green);
    
    // Test broadcasting a task_update message
    const taskUpdateResult = broadcast('task_update', {
      taskId: 999, // Test task ID
      progress: 75,
      status: 'in_progress',
      testSource: 'test-script',
      timestamp: new Date().toISOString()
    });
    
    log(`Task update broadcast result: ${taskUpdateResult ? 'SUCCESS' : 'FAILED'}`, 
      taskUpdateResult ? colors.fg.green : colors.fg.red);
    
    // Test broadcasting a form_submission_completed message
    const formSubmissionResult = broadcast('form_submission_completed', {
      taskId: 999, // Test task ID
      formType: 'open_banking',
      companyId: 123,
      status: 'completed',
      testSource: 'test-script',
      timestamp: new Date().toISOString()
    });
    
    log(`Form submission broadcast result: ${formSubmissionResult ? 'SUCCESS' : 'FAILED'}`, 
      formSubmissionResult ? colors.fg.green : colors.fg.red);
    
    log("WebSocket broadcast test completed!", colors.fg.cyan);
  } catch (error) {
    log(`ERROR: ${error.message}`, colors.fg.red);
    console.error(error);
  }
}

// Run the test
testWebSocketBroadcast();
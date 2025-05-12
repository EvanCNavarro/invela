/**
 * Direct script to broadcast tutorial updates via WebSocket
 * 
 * This script allows you to broadcast a tutorial update for a specific tab
 * to all connected WebSocket clients, notifying them to refresh their tutorial state.
 * 
 * Usage:
 * node direct-broadcast-tutorial-update.js <tabName> <userId> <currentStep> <completed>
 * 
 * Example:
 * node direct-broadcast-tutorial-update.js dashboard 8 0 false
 */

require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');

// ANSI color codes for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Broadcast a tutorial update to all connected WebSocket clients
 * 
 * @param {string} tabName - The name of the tab that was updated
 * @param {number} userId - The user ID
 * @param {number} currentStep - The current step index
 * @param {boolean} completed - Whether the tutorial is completed
 */
function broadcastTutorialUpdate(tabName, userId, currentStep, completed) {
  // Create a temporary HTTP server to connect to the WebSocket server
  const server = http.createServer();
  server.listen(() => {
    const port = server.address().port;
    log(`Temporary server listening on port ${port}`, colors.yellow);
    
    // Connect to the WebSocket server
    const ws = new WebSocket(`ws://localhost:5000/ws`);
    
    ws.on('open', () => {
      log('Connected to WebSocket server', colors.green);
      
      // Create the tutorial update message
      const message = {
        type: 'tutorial_update',
        timestamp: new Date().toISOString(),
        data: {
          tabName,
          userId: parseInt(userId, 10),
          currentStep: parseInt(currentStep, 10),
          completed: completed === 'true'
        }
      };
      
      log('Sending tutorial update message:', colors.cyan);
      console.log(message);
      
      // Send the tutorial update message
      ws.send(JSON.stringify(message));
      
      // Wait a bit for the message to be sent
      setTimeout(() => {
        log('Closing WebSocket connection...', colors.yellow);
        ws.close();
        server.close();
        
        log(`Tutorial update for tab '${tabName}' broadcast successfully!`, colors.green);
        log('Tutorial update message details:', colors.cyan);
        log(`  Tab: ${tabName}`, colors.cyan);
        log(`  User ID: ${userId}`, colors.cyan);
        log(`  Current Step: ${currentStep}`, colors.cyan);
        log(`  Completed: ${completed}`, colors.cyan);
        
        log('\nClients should now refresh their tutorial state.', colors.green);
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        log(`Received response: ${message.type}`, colors.magenta);
      } catch (e) {
        log(`Received raw response: ${data}`, colors.yellow);
      }
    });
    
    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, colors.red);
      server.close();
      process.exit(1);
    });
    
    ws.on('close', () => {
      log('WebSocket connection closed', colors.yellow);
      server.close();
    });
  });
}

/**
 * Main function
 */
function main() {
  // Get command line arguments
  const tabName = process.argv[2];
  const userId = process.argv[3] || '8';
  const currentStep = process.argv[4] || '0';
  const completed = process.argv[5] || 'false';
  
  if (!tabName) {
    log('Error: Tab name is required.', colors.red);
    log('Usage: node direct-broadcast-tutorial-update.js <tabName> <userId> <currentStep> <completed>', colors.yellow);
    log('Example: node direct-broadcast-tutorial-update.js dashboard 8 0 false', colors.yellow);
    process.exit(1);
  }
  
  log(`Broadcasting tutorial update for tab: ${colors.cyan}${tabName}${colors.reset}`, colors.yellow);
  broadcastTutorialUpdate(tabName, userId, currentStep, completed);
}

main();
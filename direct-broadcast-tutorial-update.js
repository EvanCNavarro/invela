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

const WebSocket = require('ws');
require('dotenv').config();

// Color formatting for better readability
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
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
  try {
    // Create WebSocket server instance pointing to existing server
    const port = process.env.PORT || 3000;
    const wss = new WebSocket.Server({ port: parseInt(port) + 1 });
    
    // Prepare the message to broadcast
    const message = {
      type: 'tutorial_update',
      data: {
        tabName,
        userId,
        currentStep: parseInt(currentStep),
        completed: completed === 'true' || completed === true,
        timestamp: new Date().toISOString()
      }
    };
    
    log(`Broadcasting tutorial update:`, colors.cyan);
    console.log(message);
    
    // Attach connection handler
    wss.on('connection', (ws) => {
      log(`Client connected to WebSocket server`, colors.green);
      
      // Send the message to the client
      ws.send(JSON.stringify(message));
      
      // Close the connection after sending the message
      ws.close();
    });
    
    // The broadcast server will keep running, ready to notify any clients
    // that connect. To stop it manually, press Ctrl+C.
    log(`WebSocket broadcast server started on port ${parseInt(port) + 1}`, colors.green);
    log(`Press Ctrl+C to stop...`, colors.yellow);
    
    // Alternative approach: Find the actual WebSocket server module
    try {
      // Attempt to require the WebSocket service
      const websocketService = require('../../server/services/websocket-service');
      
      if (websocketService && typeof websocketService.broadcastMessage === 'function') {
        log(`Found WebSocket service, broadcasting directly...`, colors.green);
        websocketService.broadcastMessage(message.type, message.data);
        log(`Direct broadcast sent via WebSocket service`, colors.green);
        
        // Close the server since we sent directly
        wss.close();
        log(`WebSocket broadcast server closed`, colors.yellow);
      } else {
        log(`WebSocket service found but broadcastMessage method not available`, colors.yellow);
        log(`Using standalone broadcast server instead`, colors.yellow);
      }
    } catch (error) {
      log(`Could not find WebSocket service, using standalone broadcast server`, colors.yellow);
      log(`Error: ${error.message}`, colors.red);
    }
  } catch (error) {
    log(`Error broadcasting tutorial update: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const tabName = args[0];
  const userId = args[1] ? parseInt(args[1], 10) : 8;
  const currentStep = args[2] ? parseInt(args[2], 10) : 0;
  const completed = args[3] === 'true';
  
  if (!tabName) {
    log('Usage: node direct-broadcast-tutorial-update.js <tabName> [userId] [currentStep] [completed]', colors.yellow);
    log('Example: node direct-broadcast-tutorial-update.js dashboard 8 0 false', colors.yellow);
    process.exit(1);
  }
  
  try {
    broadcastTutorialUpdate(tabName, userId, currentStep, completed);
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Execute main function
main();
/**
 * Direct WebSocket Test
 * 
 * This script tests the WebSocket tutorial functionality by sending
 * tutorial progress and completion messages to all connected clients.
 * 
 * Run with: node direct-websocket-test.js
 */

const WebSocket = require('ws');
const { createServer } = require('http');
const { parse } = require('url');
const pg = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Connect to the database
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Log a message to the console with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Get active WebSocket clients from the database
 */
async function getActiveClients() {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM websocket_clients
      WHERE disconnected_at IS NULL
      ORDER BY connected_at DESC
    `);
    
    log(`Found ${rows.length} active WebSocket clients`, colors.green);
    return rows;
  } catch (error) {
    log(`Error fetching active clients: ${error.message}`, colors.red);
    return [];
  }
}

/**
 * Send a tutorial progress update to all connected clients
 */
async function sendTutorialProgressUpdate(tabName, currentStep, totalSteps) {
  try {
    // Create a WebSocket server instance (won't actually bind to a port)
    const httpServer = createServer();
    const wss = new WebSocket.Server({ 
      server: httpServer,
      path: '/ws'
    });
    
    // Get the active clients
    const clients = await getActiveClients();
    
    if (clients.length === 0) {
      log('No active clients found to send the message to.', colors.yellow);
      return;
    }
    
    // Create the tutorial progress message
    const message = {
      type: 'tutorial_progress',
      timestamp: new Date().toISOString(),
      tabName,
      progress: {
        currentStep,
        totalSteps
      }
    };
    
    // Serialize the message
    const serializedMessage = JSON.stringify(message);
    
    // Log what we're sending
    log(`Sending tutorial progress update for tab "${tabName}":`, colors.cyan);
    log(`  Current step: ${currentStep}/${totalSteps}`, colors.cyan);
    
    // Direct database broadcast (since we can't easily use the actual WebSocket server)
    // This will insert the message into the database for the server to pick up
    await pool.query(`
      INSERT INTO websocket_broadcasts (message_type, message, created_at)
      VALUES ($1, $2, NOW())
    `, ['tutorial_progress', serializedMessage]);
    
    log('Broadcast message inserted into database', colors.green);
    log('Server will pick this up and broadcast to active clients', colors.green);
    
    // Directly call the server's broadcast endpoint as an alternative
    try {
      const http = require('http');
      
      // Prepare the request options
      const options = {
        hostname: 'localhost',
        port: process.env.PORT || 3000,
        path: '/api/websocket/broadcast',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // Create the request
      const req = http.request(options, (res) => {
        log(`Status: ${res.statusCode}`, colors.green);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          log(`Response: ${data}`, colors.green);
        });
      });
      
      // Handle errors
      req.on('error', (error) => {
        log(`Error calling broadcast API: ${error.message}`, colors.red);
      });
      
      // Send the request
      req.write(JSON.stringify({
        type: 'tutorial_progress',
        data: {
          tabName,
          progress: {
            currentStep,
            totalSteps
          }
        }
      }));
      req.end();
    } catch (error) {
      log(`Error calling broadcast API: ${error.message}`, colors.red);
    }
    
  } catch (error) {
    log(`Error sending tutorial progress update: ${error.message}`, colors.red);
  }
}

/**
 * Send a tutorial completion notification to all connected clients
 */
async function sendTutorialCompletionNotification(tabName) {
  try {
    // Create a WebSocket server instance (won't actually bind to a port)
    const httpServer = createServer();
    const wss = new WebSocket.Server({ 
      server: httpServer,
      path: '/ws'
    });
    
    // Get the active clients
    const clients = await getActiveClients();
    
    if (clients.length === 0) {
      log('No active clients found to send the message to.', colors.yellow);
      return;
    }
    
    // Create the tutorial completion message
    const message = {
      type: 'tutorial_completed',
      timestamp: new Date().toISOString(),
      tabName
    };
    
    // Serialize the message
    const serializedMessage = JSON.stringify(message);
    
    // Log what we're sending
    log(`Sending tutorial completion notification for tab "${tabName}"`, colors.cyan);
    
    // Direct database broadcast (since we can't easily use the actual WebSocket server)
    await pool.query(`
      INSERT INTO websocket_broadcasts (message_type, message, created_at)
      VALUES ($1, $2, NOW())
    `, ['tutorial_completed', serializedMessage]);
    
    log('Broadcast message inserted into database', colors.green);
    log('Server will pick this up and broadcast to active clients', colors.green);
    
    // Directly call the server's broadcast endpoint as an alternative
    try {
      const http = require('http');
      
      // Prepare the request options
      const options = {
        hostname: 'localhost',
        port: process.env.PORT || 3000,
        path: '/api/websocket/broadcast',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // Create the request
      const req = http.request(options, (res) => {
        log(`Status: ${res.statusCode}`, colors.green);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          log(`Response: ${data}`, colors.green);
        });
      });
      
      // Handle errors
      req.on('error', (error) => {
        log(`Error calling broadcast API: ${error.message}`, colors.red);
      });
      
      // Send the request
      req.write(JSON.stringify({
        type: 'tutorial_completed',
        data: {
          tabName
        }
      }));
      req.end();
    } catch (error) {
      log(`Error calling broadcast API: ${error.message}`, colors.red);
    }
    
  } catch (error) {
    log(`Error sending tutorial completion notification: ${error.message}`, colors.red);
  }
}

/**
 * Main function to run the test
 */
async function run() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    const tabName = args[1] || 'risk-score';
    
    log('WebSocket Tutorial Test', colors.magenta);
    log('------------------------', colors.magenta);
    
    if (command === 'progress') {
      const currentStep = parseInt(args[2] || '1', 10);
      const totalSteps = parseInt(args[3] || '5', 10);
      
      log(`Sending tutorial progress update for tab: ${tabName}`, colors.blue);
      log(`Step: ${currentStep}/${totalSteps}`, colors.blue);
      
      await sendTutorialProgressUpdate(tabName, currentStep, totalSteps);
      
    } else if (command === 'complete') {
      log(`Sending tutorial completion notification for tab: ${tabName}`, colors.blue);
      
      await sendTutorialCompletionNotification(tabName);
      
    } else {
      log('Available commands:', colors.yellow);
      log('  node direct-websocket-test.js progress [tab-name] [current-step] [total-steps]', colors.reset);
      log('  node direct-websocket-test.js complete [tab-name]', colors.reset);
      log('', colors.reset);
      log('Examples:', colors.cyan);
      log('  node direct-websocket-test.js progress risk-score 2 5', colors.reset);
      log('  node direct-websocket-test.js complete claims-risk', colors.reset);
      return;
    }
    
    log('Test completed!', colors.green);
    
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
  } finally {
    // Close database connection
    pool.end();
  }
}

// Run the test
run();
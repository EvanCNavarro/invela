/**
 * Script to broadcast the WebSocket event to notify clients about updated tabs
 */

// Load the WebSocket module
const { WebSocketServer } = require('ws');
const http = require('http');

// Create a mini http server just for broadcasting
const server = http.createServer();
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

// Define the company ID and tabs to broadcast
const companyId = 255;
const availableTabs = ['task-center', 'file-vault', 'dashboard'];

// Set up the broadcast function
function broadcastCompanyTabsUpdate(companyId, availableTabs) {
  console.log(`Broadcasting company tabs update for company ${companyId}:`, availableTabs);
  
  const timestamp = new Date().toISOString();
  
  // Create the message payloads for both event names
  const message1 = JSON.stringify({
    type: 'company_tabs_update',
    payload: {
      companyId,
      availableTabs,
      timestamp,
      cache_invalidation: true
    }
  });
  
  const message2 = JSON.stringify({
    type: 'company_tabs_updated',
    payload: {
      companyId,
      availableTabs,
      timestamp,
      cache_invalidation: true
    }
  });
  
  // Use setInterval to keep the server alive for 5 seconds
  let clientCount = 0;
  wss.on('connection', (client) => {
    console.log('Client connected!');
    clientCount++;
    
    // Send both messages for compatibility
    client.send(message1);
    console.log('Sent message1:', message1);
    
    client.send(message2);
    console.log('Sent message2:', message2);
  });
  
  // Listen on a different port to not interfere with the main app
  server.listen(3001, '0.0.0.0', () => {
    console.log('WebSocket broadcast server running on port 3001');
    console.log('Waiting for client connections...');
    
    // Keep server running for 5 seconds to allow connections
    setTimeout(() => {
      console.log(`Broadcast complete. Connected to ${clientCount} clients.`);
      server.close();
      process.exit(0);
    }, 5000);
  });
}

// Start the broadcast
broadcastCompanyTabsUpdate(companyId, availableTabs);
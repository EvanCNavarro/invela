/**
 * Script to broadcast the updated tabs through the existing WebSocket connection
 */

// Import required packages for HTTP server and WebSockets
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { json } = require('express');

// Create a simple Express server and attach WebSocket
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

// Configure the server
app.use(json());

// Configure the WebSocket server
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket server');
  
  // Broadcast company tabs immediately
  broadcastCompanyTabs(ws, 255, ['task-center', 'file-vault']);
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Function to broadcast company tabs update
function broadcastCompanyTabs(ws, companyId, availableTabs) {
  if (ws.readyState === ws.OPEN) {
    // Create the message payload
    const timestamp = new Date().toISOString();
    
    // First message using company_tabs_update format
    const message1 = JSON.stringify({
      type: 'company_tabs_update',
      payload: {
        companyId,
        availableTabs,
        timestamp,
        cache_invalidation: true
      }
    });
    
    // Second message using company_tabs_updated format (for backward compatibility)
    const message2 = JSON.stringify({
      type: 'company_tabs_updated',
      payload: {
        companyId,
        availableTabs,
        timestamp,
        cache_invalidation: true
      }
    });
    
    // Send both messages
    ws.send(message1);
    console.log('Sent message:', message1);
    
    ws.send(message2);
    console.log('Sent message:', message2);
    
    return true;
  }
  
  return false;
}

// Start the server on a separate port
const PORT = 3100;
server.listen(PORT, () => {
  console.log(`WebSocket broadcast server running on port ${PORT}`);
  
  // Keep the server running for 10 seconds
  console.log('Will automatically exit in 10 seconds...');
  
  setTimeout(() => {
    console.log('Exiting...');
    server.close();
    process.exit(0);
  }, 10000);
});
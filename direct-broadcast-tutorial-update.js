/**
 * Direct script to broadcast a tutorial update via WebSocket
 * 
 * This script directly connects to the WebSocket service and broadcasts
 * a tutorial update message to all connected clients.
 */

// Import modules
const WebSocket = require('ws');
const http = require('http');

// Create a WebSocket server reference
const wss = new WebSocketServer({ noServer: true });

// Setup constants
const WS_PING_INTERVAL = 30000; // 30 seconds
const TUTORIAL_UPDATE_TYPE = 'tutorial_updated';

/**
 * Broadcast a tutorial update to all connected WebSocket clients
 * 
 * @param {string} tabName - The name of the tab that was updated
 * @param {number} userId - The user ID
 * @param {number} currentStep - The current step index
 * @param {boolean} completed - Whether the tutorial is completed
 */
function broadcastTutorialUpdate(tabName, userId, currentStep, completed) {
  const message = {
    type: TUTORIAL_UPDATE_TYPE,
    timestamp: new Date().toISOString(),
    tabName,
    userId,
    currentStep,
    completed
  };
  
  console.log(`Broadcasting tutorial update for ${tabName}:`, message);

  // Get all connected clients from the existing WebSocket service
  // This is a direct approach that works with the existing WebSocket server instance
  const clients = Array.from(wss.clients || []);
  console.log(`Broadcasting to ${clients.length} connected clients`);
  
  // Send the message to all connected clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Let's use a more direct approach with the WebSocket server that's already running
// Create a small test server to send a message and then shut down
const server = http.createServer();
const WebSocketServer = WebSocket.Server;

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});

// When a client connects, send the tutorial update
wss.on('connection', (ws) => {
  console.log('Test client connected to broadcast message');
  
  // Broadcast the tutorial update for the claims tab
  broadcastTutorialUpdate('claims', 8, 0, false);
  
  // Close the connection
  setTimeout(() => {
    ws.close();
    server.close();
    process.exit(0);
  }, 1000);
});

// Start the server
server.listen(0, () => {
  console.log(`Test server started on port ${server.address().port}`);
});

console.log('Attempting to broadcast tutorial update for claims tab...');
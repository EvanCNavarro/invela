/**
 * Test both types of company tabs update broadcasts
 * 
 * This script sends both 'company_tabs_update' and 'company_tabs_updated' 
 * events to test that the client can handle both formats
 */

const WebSocket = require('ws');
const http = require('http');
const express = require('express');

// Create a simple Express server and WebSocket
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Create WebSocket server
class WebSocketServer extends WebSocket.Server {
  constructor(options) {
    super(options);
    this.setup();
  }

  setup() {
    this.on('connection', this.handleConnection.bind(this));
    console.log('WebSocket server initialized on path:', this.options.path);
  }

  handleConnection(ws) {
    console.log('Client connected to WebSocket server');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection_established',
      payload: {
        message: 'Welcome to the test WebSocket server',
        timestamp: new Date().toISOString()
      }
    }));
    
    // Listen for messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received message:', data);
        
        // Send pong response to ping
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    // Test sending both formats of company tabs updates
    setTimeout(() => {
      // Format 1: company_tabs_update
      ws.send(JSON.stringify({
        type: 'company_tabs_update',
        payload: {
          companyId: 255,
          availableTabs: ['task-center', 'file-vault'],
          timestamp: new Date().toISOString(),
          cache_invalidation: true
        }
      }));
      console.log('Sent company_tabs_update message');
      
      // Wait 2 seconds
      setTimeout(() => {
        // Format 2: company_tabs_updated
        ws.send(JSON.stringify({
          type: 'company_tabs_updated',
          payload: {
            companyId: 255,
            availableTabs: ['task-center', 'file-vault'],
            timestamp: new Date().toISOString(),
            cache_invalidation: true
          }
        }));
        console.log('Sent company_tabs_updated message');
      }, 2000);
    }, 2000);
  }

  broadcastToAll(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    let clientCount = 0;
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        clientCount++;
      }
    });
    
    return clientCount;
  }
}

// Start the server
const PORT = 3200;
server.listen(PORT, () => {
  console.log(`WebSocket test server running on port ${PORT}`);
  console.log('Will automatically exit in 30 seconds...');
  
  setTimeout(() => {
    console.log('Exiting...');
    server.close();
    process.exit(0);
  }, 30000);
});
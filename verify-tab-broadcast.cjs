/**
 * Final verification script for company tabs WebSocket broadcasting
 * 
 * This script connects to the WebSocket service and sends a direct
 * test message to verify the client-side handling
 */
const WebSocket = require('ws');

// Create WebSocket client that connects to the local server
const ws = new WebSocket('ws://localhost:5000/ws');

// Track connection state
let isConnected = false;

// Setup event handlers
ws.on('open', () => {
  console.log('Connected to WebSocket server');
  isConnected = true;
  
  // Send test message when connected
  setTimeout(sendTestMessage, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('Received message:', message);
    
    // Respond to pings with pongs
    if (message.type === 'ping') {
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('close', () => {
  console.log('Disconnected from WebSocket server');
  isConnected = false;
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Send test messages for both formats
function sendTestMessage() {
  if (!isConnected) {
    console.error('Not connected to server. Cannot send message.');
    return;
  }
  
  // First message: company_tabs_update
  const message1 = {
    type: 'company_tabs_update',
    payload: {
      companyId: 255,
      availableTabs: ['task-center', 'file-vault'],
      timestamp: new Date().toISOString(),
      cache_invalidation: true
    }
  };
  
  ws.send(JSON.stringify(message1));
  console.log('Sent message 1 (company_tabs_update):', message1);
  
  // Wait 2 seconds, then send second format
  setTimeout(() => {
    // Second message: company_tabs_updated
    const message2 = {
      type: 'company_tabs_updated',
      payload: {
        companyId: 255,
        availableTabs: ['task-center', 'file-vault'],
        timestamp: new Date().toISOString(),
        cache_invalidation: true
      }
    };
    
    ws.send(JSON.stringify(message2));
    console.log('Sent message 2 (company_tabs_updated):', message2);
    
    // Disconnect after another 2 seconds
    setTimeout(() => {
      console.log('Test complete, closing connection...');
      ws.close();
      process.exit(0);
    }, 2000);
  }, 2000);
}

// Set timeout in case connection fails
setTimeout(() => {
  if (!isConnected) {
    console.error('Failed to connect to WebSocket server within timeout period');
    process.exit(1);
  }
}, 5000);
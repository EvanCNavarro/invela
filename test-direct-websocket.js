/**
 * Test Direct WebSocket Implementation
 * 
 * This script tests the direct WebSocket implementation to ensure it works correctly
 * and can be used as a fallback for the TypeScript WebSocket system.
 * 
 * Usage: node test-direct-websocket.js
 */

const http = require('http');
const express = require('express');
const { 
  setupWebSocketServer,
  broadcastTask,
  isServerInitialized,
  getConnectedClientCount
} = require('./direct-websocket-implementation');

// Create a simple Express app and HTTP server for testing
const app = express();
const server = http.createServer(app);

// Setup WebSocket server
const wss = setupWebSocketServer(server);

// Define a simple route for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WebSocket Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        #messages { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
        button { padding: 8px 16px; margin-right: 10px; }
      </style>
    </head>
    <body>
      <h1>WebSocket Test</h1>
      <div id="status">Status: Disconnected</div>
      <div id="messages"></div>
      <div>
        <button id="connect">Connect</button>
        <button id="task-update">Send Task Update</button>
        <button id="ping">Send Ping</button>
        <button id="disconnect">Disconnect</button>
      </div>
      
      <script>
        const messagesDiv = document.getElementById('messages');
        const statusDiv = document.getElementById('status');
        let socket = null;
        
        function log(message) {
          const div = document.createElement('div');
          div.textContent = new Date().toISOString() + ' - ' + message;
          messagesDiv.appendChild(div);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        document.getElementById('connect').addEventListener('click', () => {
          if (socket && socket.readyState <= 1) {
            log('Already connected or connecting');
            return;
          }
          
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
          
          log(\`Connecting to \${wsUrl}\`);
          statusDiv.textContent = 'Status: Connecting...';
          
          socket = new WebSocket(wsUrl);
          
          socket.onopen = () => {
            log('Connected!');
            statusDiv.textContent = 'Status: Connected';
            
            // Authenticate
            socket.send(JSON.stringify({
              type: 'authenticate',
              userId: 1,
              companyId: 1,
              timestamp: new Date().toISOString()
            }));
          };
          
          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              log(\`Received: \${JSON.stringify(data, null, 2)}\`);
            } catch (e) {
              log(\`Received: \${event.data}\`);
            }
          };
          
          socket.onclose = () => {
            log('Disconnected');
            statusDiv.textContent = 'Status: Disconnected';
          };
          
          socket.onerror = (error) => {
            log(\`Error: \${error}\`);
            statusDiv.textContent = 'Status: Error';
          };
        });
        
        document.getElementById('task-update').addEventListener('click', () => {
          if (!socket || socket.readyState !== 1) {
            log('Not connected');
            return;
          }
          
          // Send a client-side task update (will be ignored by server)
          socket.send(JSON.stringify({
            type: 'client_task_update',
            taskId: 123,
            progress: 50,
            timestamp: new Date().toISOString()
          }));
          
          log('Sent task update request');
          
          // This will trigger a broadcast from the server
          fetch('/trigger-task-update')
            .then(res => res.json())
            .then(data => {
              log(\`Server broadcast result: \${JSON.stringify(data)}\`);
            })
            .catch(err => {
              log(\`Error triggering task update: \${err}\`);
            });
        });
        
        document.getElementById('ping').addEventListener('click', () => {
          if (!socket || socket.readyState !== 1) {
            log('Not connected');
            return;
          }
          
          socket.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }));
          
          log('Sent ping');
        });
        
        document.getElementById('disconnect').addEventListener('click', () => {
          if (!socket) {
            log('Not connected');
            return;
          }
          
          socket.close();
          log('Disconnected');
        });
      </script>
    </body>
    </html>
  `);
});

// Define a route to trigger a task update broadcast
app.get('/trigger-task-update', (req, res) => {
  const taskId = 123;
  const status = 'in_progress';
  const progress = Math.floor(Math.random() * 100);
  
  const result = broadcastTask(taskId, status, progress, {
    testTimestamp: new Date().toISOString(),
    source: 'test_script'
  });
  
  res.json({
    success: result.success,
    message: `Broadcast task update to ${result.clients} clients`,
    broadcast: result
  });
});

// Define a route to check WebSocket server status
app.get('/status', (req, res) => {
  res.json({
    initialized: isServerInitialized(),
    clients: getConnectedClientCount(),
    timestamp: new Date().toISOString()
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server initialized: ${isServerInitialized()}`);
  console.log('Visit http://localhost:3000 in your browser to test WebSocket');
});

// Broadcast regular updates for testing
let counter = 0;
setInterval(() => {
  if (isServerInitialized() && getConnectedClientCount() > 0) {
    counter++;
    
    broadcastTask(
      999, 
      'heartbeat', 
      counter % 100, 
      { counter, heartbeatTime: new Date().toISOString() }
    );
    
    console.log(`Sent heartbeat #${counter} to ${getConnectedClientCount()} clients`);
  }
}, 10000);

// Handle SIGINT
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
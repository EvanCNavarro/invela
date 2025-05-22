/**
 * Broadcast progress update for task 739
 * 
 * This script broadcasts a WebSocket message to notify clients of the progress change
 * for task 739 that we manually updated in the database.
 */

const { WebSocketServer } = require('ws');
const http = require('http');

// Create a temporary HTTP server to access the existing WebSocket server
const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/ws' });

// Start the server on a random port
server.listen(0, 'localhost', () => {
  const port = server.address().port;
  console.log(`Server started on port ${port}`);
  
  // Broadcast message to connected clients
  const broadcastMessage = (message) => {
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  };
  
  // Prepare task update message
  const updateMessage = {
    type: 'task_update',
    payload: {
      id: 739,
      status: 'in_progress',
      progress: 3,
      metadata: {
        manualReconciliation: true,
        lastProgressUpdate: new Date().toISOString(),
        previousProgress: 0,
        previousStatus: 'not_started'
      },
      timestamp: new Date().toISOString()
    }
  };
  
  // Wait for connections, if any, then broadcast
  setTimeout(() => {
    console.log('Broadcasting task update for task 739');
    broadcastMessage(updateMessage);
    
    // Close the server after broadcasting
    setTimeout(() => {
      console.log('Closing server');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    }, 1000);
  }, 2000);
});

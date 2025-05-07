/**
 * Direct WebSocket Usage Example
 * 
 * This file demonstrates how to use the direct WebSocket implementation
 * in your main application. Copy the relevant parts into your server setup code.
 */

// Import required modules
const express = require('express');
const http = require('http');
const { setupWebSocketServer } = require('./direct-websocket-implementation');
const { initializeDirectWebSocket, broadcastTaskRedundant } = require('./integrate-direct-websocket');

// Example server setup code
function setupServer() {
  // Create Express app
  const app = express();
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Initialize the direct WebSocket implementation
  const directWs = initializeDirectWebSocket(server);
  
  // Basic routes
  app.get('/api/healthcheck', (req, res) => {
    res.json({ 
      status: 'ok', 
      websocket: directWs ? 'connected' : 'not_connected',
      timestamp: new Date().toISOString() 
    });
  });
  
  // Example API endpoint that updates task progress and broadcasts via WebSocket
  app.post('/api/tasks/:taskId/progress', (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const { progress, status = 'in_progress' } = req.body;
    
    try {
      // Update task in database (example code)
      // db.update(...)
      
      // Broadcast the update using the redundant method
      const broadcast = broadcastTaskRedundant(taskId, status, progress);
      
      res.json({
        success: true,
        taskId,
        progress,
        status,
        broadcast
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  return { app, server, directWs };
}

// Export setup function
module.exports = { setupServer };

// If run directly
if (require.main === module) {
  console.log('This is an example file. Import it in your main server file.');
  console.log('const { setupServer } = require(\'./direct-websocket-usage-example\');');
  console.log('const { app, server, directWs } = setupServer();');
}
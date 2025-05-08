/**
 * Server WebSocket Integration Example
 * 
 * This script demonstrates how to integrate the WebSocket service 
 * into the main server.
 * 
 * To use this in your application:
 * 1. Import the setupWebSocketServer function
 * 2. Call it with your HTTP server instance after creating it
 * 3. Import and use broadcast functions in your routes
 */

// Example server setup with WebSocket integration
const express = require('express');
const http = require('http');
const path = require('path');
const { Pool } = require('pg');

// Import WebSocket service
const { 
  setupWebSocketServer, 
  broadcastTaskUpdate, 
  broadcastFormSubmission 
} = require('./server/services/websocket-service');

// Import form submission integration
const { 
  submitFormWithWebSocketNotification 
} = require('./server/services/form-submission-integration');

// Create Express app
const app = express();
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Set up the WebSocket server
const wss = setupWebSocketServer(server);
console.log('WebSocket server initialized and attached to HTTP server');

// Create a database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Define API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example form submission route with WebSocket notification
app.post('/api/forms/:formType/:taskId/submit', async (req, res) => {
  try {
    const { formType, taskId } = req.params;
    const { companyId } = req.body;
    
    // Validate parameters
    if (!formType || !taskId || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: formType, taskId, or companyId'
      });
    }
    
    // Submit the form with WebSocket notification
    const result = await submitFormWithWebSocketNotification(
      parseInt(taskId),
      formType,
      req.body,
      parseInt(companyId)
    );
    
    // Return the result to the client
    res.json(result);
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while submitting the form'
    });
  }
});

// Example route to manually broadcast a task update
app.post('/api/tasks/:taskId/broadcast', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, progress } = req.body;
    
    // Validate parameters
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: status'
      });
    }
    
    // Broadcast the task update
    const recipientCount = broadcastTaskUpdate(
      parseInt(taskId),
      status,
      progress || 0
    );
    
    res.json({
      success: true,
      message: `Task update broadcasted to ${recipientCount} clients`,
      taskId,
      status,
      progress: progress || 0
    });
  } catch (error) {
    console.error('Error broadcasting task update:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while broadcasting the task update'
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`WebSocket server available at ws://0.0.0.0:${PORT}/ws`);
});

// For testing purposes only - not for production use
if (require.main === module) {
  // This section will only run if this file is executed directly
  
  // Simulate a task update after 5 seconds
  setTimeout(() => {
    console.log('Simulating a task update broadcast...');
    
    const taskId = 784; // Open Banking task
    broadcastTaskUpdate(taskId, 'submitted', 100, {
      submittedAt: new Date().toISOString(),
      completed: true
    });
    
    console.log(`Task update for task ${taskId} broadcasted`);
  }, 5000);
  
  // Simulate a form submission after 10 seconds
  setTimeout(() => {
    console.log('Simulating a form submission broadcast...');
    
    const taskId = 784; // Open Banking task
    broadcastFormSubmission(taskId, 'open_banking', {
      success: true,
      fileId: 896,
      fileName: 'openbanking_784_278_v1.0_20250508121159.csv',
      unlockedTabs: ['dashboard', 'insights'],
      companyId: 278
    });
    
    console.log(`Form submission for task ${taskId} broadcasted`);
  }, 10000);
}
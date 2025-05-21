/**
 * Minimal Deployment Server for Replit Cloud Run
 * 
 * This is a highly optimized server that focuses solely on passing
 * Replit Cloud Run deployment checks without any extra functionality.
 */

// Core required modules
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

// Timestamp for logging
function timestamp() {
  return new Date().toISOString();
}

// Simple logging
function log(message) {
  console.log(`[${timestamp()}] ${message}`);
}

// Health check endpoint (root path)
app.get('/', (req, res) => {
  log('Health check request received at /');
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: timestamp()
  });
});

// Serve static files if they exist
app.use(express.static('dist/public'));

// Explicit port binding for Replit Cloud Run
const PORT = 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  log(`Minimal server running on http://${HOST}:${PORT}`);
});
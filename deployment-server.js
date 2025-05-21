/**
 * Deployment Server for Replit
 */

const http = require('http');

// Constants for port configuration
const PORT = 8080;
const HOST = '0.0.0.0';

// Simple timestamp for logging
function getTimestamp() {
  return new Date().toISOString();
}

// Log with timestamp
function log(message) {
  console.log(`[${getTimestamp()}] ${message}`);
}

// Create a simple server that responds to all requests
const server = http.createServer((req, res) => {
  log(`Request received: ${req.method} ${req.url}`);
  
  // Return 200 OK for all requests
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    message: 'API is running',
    timestamp: getTimestamp()
  }));
});

// Start listening on the specified port and host
server.listen(PORT, HOST, () => {
  log(`Server running at http://${HOST}:${PORT}`);
});
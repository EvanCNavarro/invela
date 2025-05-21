/**
 * Invela Platform API - Deployment Server
 * 
 * This is a standalone HTTP server that runs independently
 * without requiring any build process.
 */

const http = require('http');

// Port configuration - always use 8080 for Replit Cloud
const PORT = 8080;
const HOST = '0.0.0.0';

// Timestamp utility
function timestamp() {
  return new Date().toISOString();
}

// Log with timestamp
function log(message) {
  console.log(`[${timestamp()}] ${message}`);
}

// Create a minimal HTTP server
const server = http.createServer((req, res) => {
  log(`Request received: ${req.method} ${req.url}`);
  
  // Health check endpoint - respond with 200 OK
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    service: 'Invela Platform API',
    timestamp: timestamp()
  }));
});

// Start the server on the correct port
server.listen(PORT, HOST, () => {
  log(`Server running at http://${HOST}:${PORT}`);
});
/**
 * Minimal Deployment Server for Replit
 * 
 * This server does only what's required for Replit deployment:
 * 1. Explicitly binds to 0.0.0.0:8080
 * 2. Returns 200 status codes for health checks
 */

// Use raw http module to minimize dependencies
const http = require('http');

// Helper for logging
function timestamp() {
  return new Date().toISOString();
}

function log(message) {
  console.log(`[${timestamp()}] ${message}`);
}

// Create minimal server
const server = http.createServer((req, res) => {
  log(`Request: ${req.method} ${req.url}`);
  
  // Always return 200 status code for any path
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Server is running',
    timestamp: timestamp()
  }));
});

// Critical: Must use port 8080 and bind to 0.0.0.0
const PORT = 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  log(`Server running at http://${HOST}:${PORT}`);
});
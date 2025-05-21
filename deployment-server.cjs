/**
 * Deployment Server for Replit Cloud Run (CommonJS Version)
 *
 * This is a minimalist server that:
 * 1. Explicitly binds to 0.0.0.0:8080 as required by Replit
 * 2. Returns 200 status code for health checks
 * 3. Has minimal dependencies to reduce image size
 */

const http = require('http');

// Get timestamp for logging
function timestamp() {
  return new Date().toISOString();
}

// Log with timestamp
function log(message) {
  console.log(`[${timestamp()}] ${message}`);
}

// Create a minimalist server
const server = http.createServer((req, res) => {
  log(`Request received: ${req.method} ${req.url}`);
  
  // Always return 200 OK for health checks
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Invela Platform',
    timestamp: timestamp()
  }));
});

// Explicitly use port 8080 and bind to all interfaces
const PORT = 8080; // Always use 8080 for Replit deployment
const HOST = '0.0.0.0';

// Start the server
server.listen(PORT, HOST, () => {
  log(`Server running at http://${HOST}:${PORT}`);
  log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});
/**
 * Deployment Server for Replit Cloud Run
 * 
 * A minimal server that explicitly binds to port 8080
 * to satisfy Replit's deployment requirements.
 */

const http = require('http');

// Port configuration - explicitly bind to 8080
const PORT = 8080; 
const HOST = '0.0.0.0';

// Simple timestamp function for logs
function getTimestamp() {
  return new Date().toISOString();
}

function log(message) {
  console.log(`[${getTimestamp()}] ${message}`);
}

// Create a minimal server
const server = http.createServer((req, res) => {
  log(`Request received: ${req.method} ${req.url}`);
  
  // Simple health check response
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    message: 'API is running',
    timestamp: getTimestamp()
  }));
});

// Start server with explicit port binding
server.listen(PORT, HOST, () => {
  log(`Server running at http://${HOST}:${PORT}`);
  log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});
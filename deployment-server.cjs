/**
 * Deployment Server (CommonJS Version)
 * 
 * Using CommonJS syntax for maximum compatibility with Replit Cloud Run.
 */

const http = require('http');

// Port configuration
const PORT = 8080;
const HOST = '0.0.0.0';

// Timestamp utility
function getTimestamp() {
  return new Date().toISOString();
}

// Create server
const server = http.createServer((req, res) => {
  console.log(`[${getTimestamp()}] Request: ${req.method} ${req.url}`);
  
  // Always return 200 OK for health checks
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Invela Platform API is running');
});

// Start server with explicit port binding
server.listen(PORT, HOST, () => {
  console.log(`[${getTimestamp()}] Server running at http://${HOST}:${PORT}`);
});
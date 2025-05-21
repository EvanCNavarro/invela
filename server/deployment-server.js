/**
 * Ultra-Minimal Deployment Server for Replit
 */

// Using CommonJS syntax for maximum compatibility
const http = require('http');

// Always use 8080 for Replit deployment
const PORT = 8080;
const HOST = '0.0.0.0';

// Create the simplest possible server
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.url}`);
  
  // Always return 200 OK for health checks
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('OK');
});

// Start server with explicit binding
server.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] Server running at http://${HOST}:${PORT}`);
});
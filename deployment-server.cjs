/**
 * Simple HTTP server for deployment
 * This provides a minimal server that responds with 200 OK to all requests
 */

const http = require('http');

// Explicitly use port 8080 for Replit Cloud
const PORT = 8080;
const HOST = '0.0.0.0';

// Create minimal server
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.url}`);
  
  // Always return 200 OK
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Invela Platform API');
});

// Start server with explicit port binding
server.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});
/**
 * Standalone deployment server for Replit Cloud
 * 
 * This server runs independently without requiring a build step
 */

const http = require('http');

// Always use port 8080 for Replit Cloud deployment
const PORT = 8080;
const HOST = '0.0.0.0';

// Create minimal HTTP server
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] Received: ${req.method} ${req.url}`);
  
  // Always respond with 200 OK for health checks
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    service: 'Invela Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }));
});

// Start server with explicit port binding
server.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] Server running at http://${HOST}:${PORT}`);
});
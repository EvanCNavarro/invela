/**
 * Simple server for Replit deployment
 */

const http = require('http');

// Use port 8080 for Replit Cloud Run
const PORT = 8080;
const HOST = '0.0.0.0';

// Create a simple server for deployment
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.url}`);
  
  // Always return 200 OK
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Invela Platform API',
    timestamp: new Date().toISOString()
  }));
});

// Start the server
server.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] Server running at http://${HOST}:${PORT}`);
});
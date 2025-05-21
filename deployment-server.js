/**
 * Minimal deployment server for Replit Cloud
 *
 * This uses ES module syntax to match your project's configuration
 */

// Use ES module syntax (import instead of require)
import http from 'http';

// Port must be 8080 for Replit Cloud
const PORT = 8080; 
const HOST = '0.0.0.0';

// Create minimal server
const server = http.createServer((req, res) => {
  // Log all requests
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Send 200 OK for all requests
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Invela Platform is running');
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] Server running at http://${HOST}:${PORT}`);
});
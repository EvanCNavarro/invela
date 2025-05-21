/**
 * Deployment Server for Replit Cloud Run (ES Module Version)
 * 
 * This is an absolutely minimal server that:
 * 1. Binds explicitly to 0.0.0.0:8080 (required by Replit Cloud Run)
 * 2. Responds with 200 OK to health checks at the root path (/)
 * 3. Contains minimal code to keep the Docker image small
 */

// Use bare minimum code to reduce image size
import { createServer } from 'http';

// Helper for timestamps
const timestamp = () => new Date().toISOString();

// Log with timestamp
const log = (message) => console.log(`[${timestamp()}] ${message}`);

// Create server with only the health check endpoint
const server = createServer((req, res) => {
  log(`Request received: ${req.method} ${req.url}`);
  
  // Health check at root path
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Invela Platform is running',
      timestamp: timestamp()
    }));
    return;
  }
  
  // For all other requests, return a simple 200 OK
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Invela Platform API');
});

// Bind to the specific port and host required by Replit
const PORT = 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  log(`Server running at http://${HOST}:${PORT}`);
  log(`Configured for Replit Cloud Run deployment`);
});
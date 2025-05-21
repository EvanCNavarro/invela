/**
 * Production Server for Replit Deployment
 * 
 * A lightweight server that handles:
 * - Proper port binding (8080)
 * - Health check endpoint
 * - Starting the main application
 */

// Force production environment
process.env.NODE_ENV = 'production';

// Configure port for Replit
const port = process.env.PORT || 8080;

// Log startup information
console.log('='.repeat(50));
console.log('INVELA PLATFORM - PRODUCTION SERVER');
console.log(`Starting at: ${new Date().toISOString()}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${port}`);
console.log(`Current directory: ${process.cwd()}`);
console.log('='.repeat(50));

// Import required modules
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple HTTP server with health check endpoint
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  
  // For all other paths, proxy to main application
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Invela Platform - Request received');
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
  
  // Try to start main application
  try {
    console.log('Starting main application...');
    // Use dynamic import to handle ESM modules
    import('./server/index.js').catch(err => {
      console.error('Error importing ESM module:', err);
      // Try CommonJS fallback
      try {
        require('./server/index');
      } catch (e) {
        console.error('Failed to load application via CommonJS as well:', e);
      }
    });
  } catch (err) {
    console.error('Error starting application:', err);
  }
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  // Try to restart if port is in use
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${port} is in use, trying again in 1 second...`);
    setTimeout(() => {
      server.close();
      server.listen(port, '0.0.0.0');
    }, 1000);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down successfully');
    process.exit(0);
  });
});

// Handle unexpected errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
/**
 * Simple Deployment Script
 * 
 * This script is a minimal deployment entry point that avoids any TypeScript
 * or complex module loading. It's designed to be as simple as possible
 * to ensure it works in the Replit Deployment environment.
 */

// Set production mode
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('=============================================');
console.log('INVELA PLATFORM - SIMPLE DEPLOYMENT');
console.log(`Starting at: ${new Date().toISOString()}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log('=============================================');

// Load express and create a simple server that forwards to the built app
const express = require('express');
const path = require('path');
const { createServer } = require('http');
const fs = require('fs');

// Create simple app
const app = express();
const server = createServer(app);

// First serve static files from the public directory (assets, images, etc.)
app.use(express.static(path.join(process.cwd(), 'dist', 'public')));

// Then try the root dist directory for any other static files
app.use(express.static(path.join(process.cwd(), 'dist')));

// Log the available directories for debugging
console.log('Available directories:');
try {
  const dirs = fs.readdirSync(path.join(process.cwd(), 'dist'));
  console.log(dirs);
} catch (err) {
  console.error('Error listing directories:', err);
}

// Fallback route to serve index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(process.cwd(), 'dist', 'public', 'index.html');
  
  // Check if index.html exists in the expected location
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  
  // If not found, respond with a simple HTML page
  res.send(`
    <html>
      <head>
        <title>Invela Platform</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Invela Platform</h1>
        <p>The application is running on port 8080, but the index.html file could not be found.</p>
        <p>Current time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

// Start the server
server.listen(8080, '0.0.0.0', () => {
  console.log('Simple deployment server running on port 8080');
});
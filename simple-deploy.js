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

// Serve static files from the client build
app.use(express.static(path.join(process.cwd(), 'dist', 'client')));

// Fallback route to serve index.html for client-side routing
app.get('*', (req, res) => {
  // Forward to index.html for client-side routing
  res.sendFile(path.join(process.cwd(), 'dist', 'client', 'index.html'));
});

// Start the server
server.listen(8080, '0.0.0.0', () => {
  console.log('Simple deployment server running on port 8080');
});
/**
 * Simplest Deployment Server for Replit Cloud Run
 * 
 * This is the most minimal server possible that will satisfy Replit Cloud Run requirements.
 * It responds to health checks on port 8080 and serves static files if they exist.
 */

// Require only the essential modules
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create a simple Express app
const app = express();

// Timestamp function for logging
function timestamp() {
  return new Date().toISOString();
}

// Log with timestamp
function log(message) {
  console.log(`[${timestamp()}] ${message}`);
}

// Root path handler for health checks
app.get('/', (req, res) => {
  log('Health check request received');
  res.status(200).send('OK');
});

// Check if we have static files to serve
const publicDir = path.join(process.cwd(), 'dist', 'public');
if (fs.existsSync(publicDir)) {
  log(`Serving static files from ${publicDir}`);
  app.use(express.static(publicDir));
}

// Start server on port 8080 with explicit 0.0.0.0 host binding
app.listen(8080, '0.0.0.0', () => {
  log(`Server running on http://0.0.0.0:8080`);
});
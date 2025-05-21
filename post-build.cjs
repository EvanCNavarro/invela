/**
 * Post-Build Script
 * 
 * This script runs after the build process to ensure server files 
 * are in the correct location for deployment.
 */

const fs = require('fs');
const path = require('path');

// Utility functions
function log(message) {
  console.log(`[post-build] ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`);
  }
}

function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
  log(`Copied ${source} to ${destination}`);
}

// Main script
async function main() {
  log('Starting post-build organization...');
  
  // Ensure dist/server directory exists
  ensureDir('dist/server');
  
  // Check if dist/index.js exists and copy it to dist/server/
  if (fs.existsSync('dist/index.js')) {
    copyFile('dist/index.js', 'dist/server/index.js');
  } else {
    log('Warning: dist/index.js not found');
  }
  
  // Create the deployment server file
  const deploymentServerContent = `/**
 * Deployment Server for Replit Cloud Run
 * 
 * This is an absolutely minimal server that binds to the port required by Replit.
 */

import http from 'http';

// Helper for logging with timestamp
const timestamp = () => new Date().toISOString();
const log = (message) => console.log(\`[\${timestamp()}] \${message}\`);

// Create server with basic health check endpoint
const server = http.createServer((req, res) => {
  log(\`Request: \${req.method} \${req.url}\`);
  
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Invela Platform API',
    timestamp: timestamp()
  }));
});

// Explicitly bind to port 8080 for Replit Cloud Run
const PORT = 8080; 
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  log(\`Server running at http://\${HOST}:\${PORT}\`);
});`;

  fs.writeFileSync('dist/server/deployment-server.js', deploymentServerContent);
  log('Created dist/server/deployment-server.js');
  
  log('Post-build organization complete!');
}

main().catch(err => {
  console.error('[post-build] Error:', err);
  process.exit(1);
});
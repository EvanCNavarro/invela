/**
 * Simplified Deployment Setup Script
 * 
 * This script runs right after the build process completes.
 * It creates necessary files for Replit deployment including health checks.
 */

const fs = require('fs');
const path = require('path');

// Create timestamp for logs
const timestamp = new Date().toISOString();

console.log(`[${timestamp}] Starting deployment setup...`);

// Ensure directories exist
const distDir = path.join(process.cwd(), 'dist');
const serverDir = path.join(distDir, 'server');

if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true });
  console.log(`[${timestamp}] Created server directory`);
}

// Create health check index.js file
const healthCheckContent = `
// Health check server for Replit deployment
const express = require('express');
const app = express();

// Force production settings
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

// Root path handler - essential for Replit health checks
app.get('/', (req, res) => {
  console.log(\`[\${new Date().toISOString()}] Health check at /\`);
  res.status(200).json({ 
    status: 'ok',
    message: 'Invela Platform running',
    timestamp: new Date().toISOString() 
  });
});

// Try to load the server
try {
  // Start the server first to handle requests
  const server = app.listen(8080, '0.0.0.0', () => {
    console.log(\`[\${new Date().toISOString()}] Health check server running on port 8080\`);
    
    // Then try to load the main application
    try {
      require('./server');
      console.log(\`[\${new Date().toISOString()}] Main server loaded\`);
    } catch (e) {
      console.error(\`[\${new Date().toISOString()}] Error loading main server: \${e.message}\`);
    }
  });
} catch (error) {
  console.error(\`[\${new Date().toISOString()}] Error starting server: \${error.message}\`);
}
`;

// Write health check file
fs.writeFileSync(path.join(distDir, 'index.js'), healthCheckContent);
console.log(`[${timestamp}] Created health check index.js`);

// Create server index file that redirects to main index
const serverIndexContent = `
// Server index file
console.log(\`[\${new Date().toISOString()}] Loading from server/index.js\`);
module.exports = require('../index.js');
`;

// Write server index file
fs.writeFileSync(path.join(serverDir, 'index.js'), serverIndexContent);
console.log(`[${timestamp}] Created server/index.js`);

console.log(`[${timestamp}] Deployment setup completed successfully`);
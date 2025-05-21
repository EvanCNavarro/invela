/**
 * Fix Deployment Server Script
 * 
 * This script creates the deployment server file required by Replit.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Creating deployment server file...');

// Create the dist/server directory if it doesn't exist
execSync('mkdir -p dist/server', { stdio: 'inherit' });

// Content for the deployment server file
const deploymentServerContent = `/**
 * Deployment Server
 * 
 * This file is specifically designed to address the deployment requirements:
 * 1. Only listen on port 8080
 * 2. Work in production mode
 */

// Force production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('===========================================');
console.log('INVELA PLATFORM - DEPLOYMENT SERVER');
console.log(\`Starting at: \${new Date().toISOString()}\`);
console.log(\`PORT: \${process.env.PORT}\`);
console.log(\`NODE_ENV: \${process.env.NODE_ENV}\`);
console.log('===========================================');

// Import the built server code
import('./index.js')
  .then(() => {
    console.log('✅ Server started successfully');
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });`;

// Write the deployment server file
try {
  fs.writeFileSync('dist/server/deployment-server.js', deploymentServerContent);
  console.log('✅ Created dist/server/deployment-server.js successfully');
} catch (err) {
  console.error(`❌ Failed to create deployment server file: ${err.message}`);
}

// Create a simplified .replit.deploy file
const replitDeployContent = `modules = ["nodejs-20", "web", "postgresql-16"]
hidden = [".config", ".git", "generated-icon.png", "node_modules/.cache", "node_modules/.vite"]
run = "npm run dev"

[nix]
channel = "stable-24_05"

[deployment]
deploymentTarget = "cloudrun"
build = ["npm", "run", "build"]
run = ["sh", "-c", "node dist/server/deployment-server.js"]

# Only using a single port as required by Replit Cloud Run
[[ports]]
localPort = 8080
externalPort = 8080

[workflows]
runButton = "Project"`;

// Write the .replit.deploy file
try {
  fs.writeFileSync('.replit.deploy', replitDeployContent);
  console.log('✅ Created .replit.deploy with single port configuration');
} catch (err) {
  console.error(`❌ Failed to create .replit.deploy: ${err.message}`);
}

console.log('\nTo deploy your application:');
console.log('1. Make sure to run: cp .replit.deploy .replit');
console.log('2. Click the Deploy button in Replit');
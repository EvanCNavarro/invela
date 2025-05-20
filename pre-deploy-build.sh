#!/bin/bash

# Pre-deploy build script
# This script prepares the application for deployment by:
# 1. Running the regular build
# 2. Ensuring the deployment server file is copied to dist/server

echo "========== PRE-DEPLOY BUILD =========="
echo "Starting build process at $(date)"

# 1. Run the regular build
echo "Running standard build process..."
npm run build

# 2. Create server directory if it doesn't exist
echo "Creating server directory..."
mkdir -p dist/server

# 3. Copy the built server file to server directory
echo "Moving server files to correct location..."
cp dist/index.js dist/server/index.js

# 4. Create the deployment server file
echo "Creating deployment server file..."
cat > dist/server/deployment-server.js << 'EOF'
/**
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
console.log(`Starting at: ${new Date().toISOString()}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log('===========================================');

// Import the built server code
import('./index.js')
  .then(() => {
    console.log('✅ Server started successfully');
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
EOF

echo "✅ Created deployment server file"

# 5. Create deployment-specific .replit file with only port 8080
echo "Creating simplified .replit.deploy file..."
cat > .replit.deploy << 'EOF'
modules = ["nodejs-20", "web", "postgresql-16"]
run = "npm run dev"
hidden = [".config", ".git", "generated-icon.png", "node_modules/.cache", "node_modules/.vite"]

[nix]
channel = "stable-24_05"

[deployment]
deploymentTarget = "cloudrun"
build = ["sh", "-c", "./pre-deploy-build.sh"]
run = ["sh", "-c", "node dist/server/deployment-server.js"]

# Only port 8080 as required for Replit Cloud Run
[[ports]]
localPort = 8080
externalPort = 8080

[workflows]
runButton = "Project"
EOF

echo "✅ Created deployment configuration"

echo ""
echo "========== BUILD COMPLETE =========="
echo "Your application is now ready for deployment!"
echo "To deploy, copy .replit.deploy to .replit and click the Deploy button."
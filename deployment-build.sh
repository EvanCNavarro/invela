#!/bin/bash

# Deployment Build Script
# This script prepares the application for deployment by:
# 1. Running the cleanup script to reduce image size
# 2. Running the standard build
# 3. Ensuring the deployment server is in the correct location

echo "========== DEPLOYMENT BUILD SCRIPT =========="
echo "Starting build process at $(date)"

# 1. Run cleanup script to reduce image size
echo "🧹 Running cleanup script to reduce image size..."
node deployment-cleanup.js

# 2. Run the standard build
echo "🔨 Running standard build process..."
npm run build

# 3. Ensure deployment server is in the correct location
echo "📦 Preparing deployment server..."

# Make sure the directory exists
mkdir -p dist/server

# Copy the deployment server to the correct location
echo "📄 Copying deployment server file..."
cp server/deployment-server.js dist/server/deployment-server.js

echo "🔧 Setting correct file permissions..."
chmod +x dist/server/deployment-server.js

# Create a fallback entry point to help the server find the application
echo "📄 Creating index.js redirector..."
cat > dist/index.js.new << 'EOL'
/**
 * This is a small redirector module that helps locate the real application entry point
 * when the paths get confused during deployment.
 */
try {
  // Try to load the real server file
  require('./server/index.js');
  console.log('[REDIRECTOR] Successfully loaded application from ./server/index.js');
} catch (e) {
  console.error('[REDIRECTOR] Failed to load from ./server/index.js', e);
  
  // If that fails, try the public directory
  try {
    console.log('[REDIRECTOR] Trying alternate path ./public/index.js');
    require('./public/index.js');
    console.log('[REDIRECTOR] Successfully loaded application from ./public/index.js');
  } catch (e2) {
    console.error('[REDIRECTOR] Failed to load from ./public/index.js', e2);
    console.error('[REDIRECTOR] Cannot find application entry point');
    process.exit(1);
  }
}
EOL

# Append to existing index.js file instead of replacing it
if [ -f "dist/index.js" ]; then
  cat dist/index.js.new >> dist/index.js
  rm dist/index.js.new
  echo "✓ Updated application entry point"
else
  mv dist/index.js.new dist/index.js
  echo "✓ Created application entry point"
fi

echo "🔍 Verifying deployment files..."
if [ -f "dist/server/deployment-server.js" ]; then
  echo "✓ Deployment server file exists"
else
  echo "❌ ERROR: Deployment server file is missing!"
  exit 1
fi

if [ -f "dist/index.js" ]; then
  echo "✓ Application entry point exists"
else
  echo "❌ ERROR: Application entry point is missing!"
  exit 1
fi

# Create a list of all directories and files for debugging
echo "📋 Creating directory structure map for troubleshooting..."
find dist -type f -name "*.js" | sort > dist/file-map.txt
echo "✓ File map created at dist/file-map.txt"

echo ""
echo "✅ Build completed successfully!"
echo "Deployment server ready at dist/server/deployment-server.js"
echo ""
echo "========== DEPLOYMENT INSTRUCTIONS =========="
echo "You can now deploy the application with:"
echo "   Run command: node dist/server/deployment-server.js"
echo "   Port: 8080"
echo "==========================================="
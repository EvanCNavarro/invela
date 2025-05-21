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
mkdir -p dist/server

# Copy the deployment server to the correct location
# We're copying as both .js and .mjs to ensure compatibility
cp server/deployment-server.js dist/server/deployment-server.js

echo "🔧 Setting correct file permissions..."
chmod +x dist/server/deployment-server.js

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

echo ""
echo "✅ Build completed successfully!"
echo "Deployment server ready at dist/server/deployment-server.js"
echo ""
echo "========== DEPLOYMENT INSTRUCTIONS =========="
echo "You can now deploy the application with:"
echo "   Run command: node dist/server/deployment-server.js"
echo "   Port: 8080"
echo "==========================================="
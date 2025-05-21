#!/bin/bash

# Invela Platform Deployment Preparation Script
# This script prepares the application for deployment by:
# 1. Ensuring deployment server files are in all expected locations
# 2. Creating fallback entry points for better reliability
# 3. Setting proper permissions

echo "🚀 Invela Platform Deployment Preparation"
echo "=========================================="

# Step 1: Make sure the directories exist
echo "📁 Creating necessary directories..."
mkdir -p dist
mkdir -p dist/server

# Step 2: Copy the deployment server to all potential locations
echo "📄 Installing deployment server files..."

# Main deployment server
if [ -f "deployment-server.js" ]; then
  echo "✓ Found main deployment server"
else
  echo "❌ ERROR: Main deployment server not found!"
  exit 1
fi

# Copy to server directory
echo "  → Copying to server directory"
cp deployment-server.js server/deployment-server.js
chmod +x server/deployment-server.js

# Copy to dist directory
echo "  → Copying to dist directory"
cp deployment-server.js dist/deployment-server.js
chmod +x dist/deployment-server.js

# Copy to dist/server directory
echo "  → Copying to dist/server directory"
cp deployment-server.js dist/server/deployment-server.js
chmod +x dist/server/deployment-server.js

# Step 3: Create redirectors in the dist directory
echo "📄 Creating entry point redirectors..."

# Create dist/index.js redirector if it doesn't exist
if [ ! -f "dist/index.js" ]; then
  echo "  → Creating dist/index.js redirector"
  cat > dist/index.js << 'EOL'
/**
 * Main entry point redirector for Invela Platform
 * This file attempts to load the correct server implementation
 */
console.log('[REDIRECTOR] Starting application from dist/index.js');

// Try to load the real server
try {
  require('./server/index.js');
} catch (e) {
  console.error('[REDIRECTOR] Failed to load server/index.js:', e.message);
  
  // Try loading from deployment server as a fallback
  try {
    console.log('[REDIRECTOR] Trying deployment server...');
    require('./deployment-server.js');
  } catch (e2) {
    console.error('[REDIRECTOR] Fatal error: Could not load any server implementation');
    process.exit(1);
  }
}
EOL
  chmod +x dist/index.js
  echo "✓ Created dist/index.js redirector"
else
  echo "  → dist/index.js already exists, not overwriting"
fi

# Create dist/server/index.js redirector if it doesn't exist
if [ ! -f "dist/server/index.js" ]; then
  echo "  → Creating dist/server/index.js redirector"
  cat > dist/server/index.js << 'EOL'
/**
 * Server directory entry point redirector for Invela Platform
 * This file attempts to load the correct server implementation
 */
console.log('[REDIRECTOR] Starting application from dist/server/index.js');

// Try to load the deployment server
try {
  require('../deployment-server.js');
} catch (e) {
  console.error('[REDIRECTOR] Failed to load ../deployment-server.js:', e.message);
  
  try {
    console.log('[REDIRECTOR] Trying local deployment server...');
    require('./deployment-server.js');
  } catch (e2) {
    console.error('[REDIRECTOR] Fatal error: Could not load any server implementation');
    process.exit(1);
  }
}
EOL
  chmod +x dist/server/index.js
  echo "✓ Created dist/server/index.js redirector"
else
  echo "  → dist/server/index.js already exists, not overwriting"
fi

# Step 4: Verify deployment files
echo "🔍 Verifying deployment files..."

# Check for all required files
all_files_exist=true

check_file() {
  if [ -f "$1" ]; then
    echo "✓ Found $1"
  else
    echo "❌ Missing $1"
    all_files_exist=false
  fi
}

check_file "deployment-server.js"
check_file "server/deployment-server.js"
check_file "dist/deployment-server.js"
check_file "dist/server/deployment-server.js"
check_file "dist/index.js"
check_file "dist/server/index.js"

if [ "$all_files_exist" = false ]; then
  echo "❌ ERROR: Some required files are missing!"
  exit 1
fi

echo "📋 Creating file map for troubleshooting..."
find . -type f -name "*.js" | grep -v "node_modules" | sort > dist/file-map.txt
echo "✓ File map created at dist/file-map.txt"

echo "✅ Deployment preparation completed successfully!"
echo "The application is ready for deployment."
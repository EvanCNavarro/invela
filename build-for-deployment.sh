#!/bin/bash

# Invela Platform Deployment Build Script
# This script runs the complete build process for deployment, including:
# 1. Building the application with standard process
# 2. Running the prepare-deployment script for reliability
# 3. Creating a proper port-binding server
# 4. Generating documentation for troubleshooting

echo "🚀 Invela Platform - Deployment Build"
echo "====================================="

# Step 1: Run the standard build process
echo "🔨 Running standard application build..."
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Build process failed!"
  exit 1
fi

echo "✅ Standard build completed"

# Step 2: Run the prepare-deployment script
echo "📦 Preparing deployment files..."
./prepare-deployment.sh

# Check if preparation succeeded
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Deployment preparation failed!"
  exit 1
fi

echo "✅ Deployment preparation completed"

# Step 3: Generate documentation
echo "📄 Generating deployment documentation..."

cat > DEPLOYMENT_INSTRUCTIONS.md << 'EOL'
# Invela Platform - Deployment Instructions

## Overview

The Invela Platform is now ready for deployment to Replit Cloud. This deployment has been 
prepared with multiple fallback mechanisms to ensure reliability.

## Deployment Configuration

Use the following settings in the Replit Deployment panel:

- **Build Command:** `./build-for-deployment.sh`
- **Run Command:** `NODE_ENV=production PORT=8080 node deployment-server.js`
- **Port:** `8080`

## Deployment Server

The deployment server is a robust solution that:

1. Automatically finds the correct entry point
2. Properly configures port binding
3. Provides detailed logs for troubleshooting

## Troubleshooting

If issues occur during deployment:

1. Check the deployment logs for detailed error messages
2. Verify that port 8080 is available and properly configured
3. Ensure that the deployment server file is accessible

For any persistent issues, refer to the file map at `dist/file-map.txt` which shows
all available JavaScript files in the deployment.
EOL

echo "✅ Deployment documentation generated"

# Step 4: Final verification
echo "🔍 Performing final verification..."

# Verify all required files exist
all_required_files_exist=true

verify_file() {
  if [ -f "$1" ]; then
    echo "✓ Found required file: $1"
  else
    echo "❌ Missing required file: $1"
    all_required_files_exist=false
  fi
}

verify_file "deployment-server.js"
verify_file "dist/index.js"
verify_file "server/deployment-server.js"
verify_file "dist/server/deployment-server.js"
verify_file "dist/deployment-server.js"

if [ "$all_required_files_exist" = false ]; then
  echo "❌ ERROR: Some required deployment files are missing!"
  exit 1
fi

# All verification passed
echo "✅ Final verification passed"

echo ""
echo "🚀 BUILD COMPLETED SUCCESSFULLY!"
echo "The application is now ready for deployment."
echo "Run the deployment server with: NODE_ENV=production PORT=8080 node deployment-server.js"
#!/bin/bash

# Simple Deployment Script for Replit
echo "🚀 Starting simple deployment build..."

# Ensure proper permissions
chmod +x production-server.js

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy the production server to the expected location
cp production-server.js dist/index.js
chmod +x dist/index.js

echo "✅ Deployment preparation completed successfully"
echo "The application is ready for deployment to Replit"
#!/bin/bash

# Ultra-simple deployment script
echo "🚀 Starting minimal deployment build..."

# Set environment variables
export NODE_ENV=production
export PORT=8080

# Create dist directory if it doesn't exist
mkdir -p dist

# Create a minimal server file
cat > dist/server.js << 'EOL'
/**
 * Minimal Production Server
 */
// Force production mode and required port
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('Starting server in production mode on port 8080');

// Import the server module
try {
  // Try to require the server
  require('../server/index');
} catch (e) {
  console.error('Failed to start server:', e);
  
  // Try different path
  try {
    require('./index');
  } catch (e2) {
    console.error('Failed with second path:', e2);
    process.exit(1);
  }
}
EOL

echo "✅ Deployment server created successfully"
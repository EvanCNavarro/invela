#!/bin/bash

# Simple Build Script for Replit Deployment
echo "🚀 Starting simplified build process..."

# 1. Run standard build (without using complex scripts)
echo "📦 Building application..."
npm run build

# 2. Make sure deployment server exists
echo "📄 Setting up deployment server..."
cp deployment-server.js dist/ 
chmod +x dist/deployment-server.js

# 3. Create simple index redirector
echo "📄 Creating redirector..."
cat > dist/index.js.tmp << 'EOL'
/**
 * Simple redirector for Replit deployment
 */
try {
  // Try to load the deployment server
  require('./deployment-server.js');
} catch (e) {
  console.error('Failed to load deployment server:', e);
  process.exit(1);
}
EOL

cat dist/index.js.tmp >> dist/index.js
rm dist/index.js.tmp
chmod +x dist/index.js

echo "✅ Build completed successfully!"
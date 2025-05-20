#!/bin/bash

# Deployment Configuration Script
# This script prepares the configuration for Replit deployment

echo "========== PREPARING DEPLOYMENT CONFIGURATION =========="
echo "Starting at $(date)"

# 1. Create the deployment server file
echo "Creating deployment server directory..."
mkdir -p dist/server

# Content for deployment server file
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

# 2. Create a deployment note with instructions
cat > DEPLOYMENT.md << 'EOF'
# Deployment Instructions

To deploy this application:

1. Run the preparation scripts:
   ```
   ./clean-large-files.sh
   ./prepare-deploy-config.sh
   ```

2. Update the Replit configuration to use single port:
   - Open the Replit interface
   - Click "Edit commands and secrets"
   - Under "Deployment" tab, ensure:
     - Build command: `npm run build`
     - Run command: `node dist/server/deployment-server.js`
     - Port: Only port 8080 is enabled

3. Click "Deploy" in the Replit interface

## Troubleshooting

If you encounter deployment issues:
- Make sure only port 8080 is used
- Verify the deployment server file exists at dist/server/deployment-server.js
- Check that large directories have been cleaned up
EOF

echo "✅ Created deployment instructions"

# 3. Create .dockerignore file to reduce Docker image size
cat > .dockerignore << 'EOF'
# Node.js dependencies and build artifacts
node_modules/.cache
node_modules/.vite

# Development and debugging directories
.git
.github
.vscode
.idea

# Large asset directories
attached_assets/*
!attached_assets/.placeholder
backup_assets/*
!backup_assets/.placeholder
backup_text/*
!backup_text/.placeholder
uploads/*
!uploads/.placeholder
cleanup-scripts/*
!cleanup-scripts/.placeholder
deployment-excluded

# Test data and fixtures
test
tests
__tests__
__mocks__

# Documentation
docs
documentation
*.md

# Development scripts
*.test.js
*.spec.js
*.test.ts
*.spec.ts

# Utility scripts that aren't needed in production
fix-*.js
add-*.js
check-*.js
create-*.js
demo-*.js
direct-*.js
import-*.js
parse-*.js

# Log files
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Temporary files
.DS_Store
*.tmp
*.temp
.env*.local
EOF

echo "✅ Created .dockerignore file"

echo ""
echo "========== DEPLOYMENT CONFIGURATION COMPLETE =========="
echo ""
echo "Your application is now ready for deployment!"
echo "Follow the instructions in DEPLOYMENT.md to deploy your application."
# Deployment Guide for Invela Platform

This guide will help you deploy the Invela platform on Replit. Follow these steps to address the three main deployment issues:

## Preparation Steps

1. **Reduce Docker Image Size**
   ```bash
   # Create excluded directories for large files
   mkdir -p deployment-excluded
   
   # Clean large directories
   find attached_assets backup_assets backup_text uploads -type f -not -name ".placeholder" | xargs -I{} mv {} deployment-excluded/ 2>/dev/null || true
   echo "Directory cleaned for deployment" > attached_assets/.placeholder
   echo "Directory cleaned for deployment" > backup_assets/.placeholder
   echo "Directory cleaned for deployment" > backup_text/.placeholder
   echo "Directory cleaned for deployment" > uploads/.placeholder
   
   # Remove cache directories in node_modules
   rm -rf node_modules/.cache node_modules/.vite
   
   # Remove test and documentation files
   find node_modules -type d -name "docs" -o -name "test" -o -name "tests" | xargs rm -rf 2>/dev/null || true
   ```

2. **Create Deployment Server File**
   ```bash
   # Create server directory
   mkdir -p dist/server
   
   # Copy server file to the right location after build
   # Note: Run standard build first
   npm run build
   cp dist/index.js dist/server/index.js
   
   # Create deployment server file
   cat > dist/server/deployment-server.js << 'EOF'
   /**
    * Deployment Server
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
       console.log('Server started successfully');
     })
     .catch(err => {
       console.error('Failed to start server:', err);
       process.exit(1);
     });
   EOF
   ```

3. **Update Deployment Configuration**
   - Open the Replit interface
   - Go to the Deployment tab
   - Change build command to: `npm run build && mkdir -p dist/server && cp dist/index.js dist/server/ && echo "process.env.NODE_ENV='production';process.env.PORT='8080';import('./index.js');" > dist/server/deployment-server.js`
   - Change run command to: `node dist/server/deployment-server.js`
   - Make sure only port 8080 is enabled in the configuration

## Deployment Instructions

1. Go to the Deployment tab in your Replit workspace
2. Click "Edit commands and secrets"
3. Update the commands as described above
4. Click Deploy

## Troubleshooting

If deployment fails:
- Check the logs to see where the failure occurred
- Make sure the build command is copying files to the right location
- Ensure the Docker image is not too large by cleaning up large directories
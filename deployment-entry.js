/**
 * Deployment Entry Script
 * 
 * This script is the primary entry point for the deployed application.
 * It sets up the environment and starts the server from the built files.
 */

// Set production environment
process.env.NODE_ENV = 'production';

// Set port to 8080 for Replit Deployments
process.env.PORT = process.env.PORT || '8080';

// Log startup information
console.log('----------------------------------------');
console.log('INVELA PLATFORM - DEPLOYMENT STARTUP');
console.log(`PORT: ${process.env.PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`TIME: ${new Date().toISOString()}`);
console.log('----------------------------------------');

// Import the server from the built dist directory
import('./dist/server/index.js')
  .then(() => {
    console.log('✅ Server started successfully');
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err);
    // Exit with error code
    process.exit(1);
  });
/**
 * Deployment Server
 * 
 * This script configures and starts the server for deployment environments.
 * It handles port configuration, environment settings, and proper error handling.
 */

// Force production settings
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '8080';

console.log('===========================================');
console.log('INVELA PLATFORM - DEPLOYMENT SERVER');
console.log(`PORT: ${process.env.PORT}`);
console.log(`TIME: ${new Date().toISOString()}`);
console.log('===========================================');

// Import the server built files
try {
  // Dynamic import of the server
  import('./dist/server/index.js')
    .then(() => {
      console.log('✅ Server started successfully');
    })
    .catch(err => {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Fatal error during server startup:', error);
  process.exit(1);
}
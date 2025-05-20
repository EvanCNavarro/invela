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
import('./dist/server/index.js')
  .then(() => {
    console.log('✅ Server started successfully');
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
/**
 * Deployment Server File
 * 
 * This is the entry point specifically for Replit Deployment.
 * It ensures:
 * 1. Only port 8080 is used
 * 2. Production environment settings are enforced
 * 3. Proper error handling is implemented
 */

// Force production environment settings
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

// Define constants for server
const HOST = '0.0.0.0';
const PORT = 8080;

console.log('===========================================');
console.log('INVELA PLATFORM - DEPLOYMENT SERVER');
console.log(`Starting at: ${new Date().toISOString()}`);
console.log(`PORT: ${PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`HOST: ${HOST}`);
console.log('===========================================');

// Import the main server module (properly handling ESM)
import('./index.js')
  .then(() => {
    console.log('✅ Server started successfully');
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
/**
 * Deployment Server for Replit Cloud Run
 * 
 * This server is specifically designed to meet Replit Cloud Run requirements:
 * 1. Strictly uses only port 8080
 * 2. Runs in production environment
 * 
 * It serves as a wrapper around the main application server, ensuring
 * the proper configuration for deployment.
 */

// Force production environment
process.env.NODE_ENV = 'production';

// Force port 8080 as required by Replit Cloud Run
process.env.PORT = '8080';

// Configure logger with timestamps
function logInfo(message) {
  console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
  if (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] Details: ${error}`);
  }
}

function logSuccess(message) {
  console.log(`[${new Date().toISOString()}] [SUCCESS] ${message}`);
}

// Display startup banner
logInfo('===========================================');
logInfo('INVELA PLATFORM - DEPLOYMENT SERVER');
logInfo(`Starting at: ${new Date().toISOString()}`);
logInfo(`PORT: ${process.env.PORT}`);
logInfo(`NODE_ENV: ${process.env.NODE_ENV}`);
logInfo('===========================================');

// Import the built server code
logInfo('Importing server module...');

// Use dynamic import for ES modules
import('../index.js')
  .then(() => {
    logSuccess('Server started successfully');
  })
  .catch((error) => {
    logError('Error during server startup:', error);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logError('Unhandled promise rejection:', reason);
});
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
const logger = {
  info: function(message) {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
  },
  error: function(message, error) {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    if (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] Details:`, error);
    }
  },
  success: function(message) {
    console.log(`[${new Date().toISOString()}] [SUCCESS] ${message}`);
  }
};

// Display startup banner
logger.info('===========================================');
logger.info('INVELA PLATFORM - DEPLOYMENT SERVER');
logger.info(`Starting at: ${new Date().toISOString()}`);
logger.info(`PORT: ${process.env.PORT}`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info('===========================================');

// Import the built server code using CommonJS require
try {
  logger.info('Loading server module...');
  
  // Require will throw if the file doesn't exist, so we need a try/catch
  const serverPath = '../dist/index.js';
  logger.info(`Loading from path: ${serverPath}`);
  
  // This is a bit tricky - we're going to use require to load the 
  // ES Module built by Vite, but we'll use a workaround
  logger.info('Starting server in CommonJS compatibility mode');
  
  // Using child_process to execute the ES Module
  const { spawn } = require('child_process');
  const server = spawn('node', ['--experimental-specifier-resolution=node', serverPath], {
    stdio: 'inherit',
    env: process.env
  });
  
  server.on('close', (code) => {
    if (code !== 0) {
      logger.error(`Server process exited with code ${code}`);
      process.exit(code);
    }
  });
  
  logger.success('Server started successfully');
} catch (error) {
  logger.error('Error during server startup:', error);
  process.exit(1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
});
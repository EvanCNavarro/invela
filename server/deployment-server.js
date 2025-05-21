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

// Import necessary modules
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
const logger = {
  info: (message) => console.log(`[${new Date().toISOString()}] [INFO] ${message}`),
  error: (message, error) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    if (error) console.error(`[${new Date().toISOString()}] [ERROR] Details: ${error}`);
  },
  success: (message) => console.log(`[${new Date().toISOString()}] [SUCCESS] ${message}`)
};

// Display startup banner
logger.info('===========================================');
logger.info('INVELA PLATFORM - DEPLOYMENT SERVER');
logger.info(`Starting at: ${new Date().toISOString()}`);
logger.info(`PORT: ${process.env.PORT}`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info('===========================================');

// Import the built server code
try {
  logger.info('Importing server module...');
  
  // Dynamic import of the main server (built by Vite)
  import('../index.js')
    .then(() => {
      logger.success('Server started successfully');
    })
    .catch(err => {
      logger.error('Failed to import server module:', err);
      process.exit(1);
    });
} catch (error) {
  logger.error('Error during server startup:', error);
  process.exit(1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
});
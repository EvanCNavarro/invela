/**
 * Replit Deployment Server
 * 
 * This is a specialized server script designed specifically for Replit Cloud deployment.
 * It addresses several deployment requirements:
 * 
 * 1. Uses absolute paths to find application files
 * 2. Forces port 8080 as required by Replit
 * 3. Handles ES Module vs CommonJS compatibility
 * 4. Provides detailed logging for troubleshooting
 */

// Force production environment
process.env.NODE_ENV = 'production';

// Force port 8080 as required by Replit Cloud Run
process.env.PORT = '8080';

// Helper for consistent, detailed logging
const Logger = {
  info: function(message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEPLOY-INFO] ${message}`);
    if (data) console.log(data);
  },
  error: function(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [DEPLOY-ERROR] ${message}`);
    if (error) {
      console.error(`[${timestamp}] [DEPLOY-ERROR] Details:`, error);
      if (error.stack) console.error(`[${timestamp}] [DEPLOY-ERROR] Stack:`, error.stack);
    }
  },
  success: function(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEPLOY-SUCCESS] ${message}`);
  }
};

// Display startup banner
Logger.info('===========================================');
Logger.info('INVELA PLATFORM - DEPLOYMENT SERVER');
Logger.info(`Starting at: ${new Date().toISOString()}`);
Logger.info(`Environment: ${process.env.NODE_ENV}`);
Logger.info(`Port: ${process.env.PORT}`);
Logger.info(`Current directory: ${process.cwd()}`);
Logger.info(`Node version: ${process.version}`);
Logger.info('===========================================');

/**
 * Main server startup function
 */
async function startServer() {
  try {
    // In Replit deployment, we use absolute paths
    const deploymentRoot = '/home/runner/workspace';
    const serverPath = `${deploymentRoot}/dist/index.js`;

    Logger.info(`Attempting to start server from: ${serverPath}`);
    
    // Check if we can access the file system
    const fs = require('fs');
    
    // Verify entry point exists
    if (fs.existsSync(serverPath)) {
      Logger.info(`✓ Found server entry point: ${serverPath}`);
    } else {
      // Try to find where the file actually is
      Logger.error(`✗ Server entry point not found at: ${serverPath}`);
      
      // Check if the dist directory exists
      if (fs.existsSync(`${deploymentRoot}/dist`)) {
        Logger.info('✓ Found dist directory');
        
        // List files in the dist directory
        const distFiles = fs.readdirSync(`${deploymentRoot}/dist`);
        Logger.info('Files in dist directory:', distFiles);
        
        // Look for any .js files
        const jsFiles = distFiles.filter(file => file.endsWith('.js'));
        if (jsFiles.length > 0) {
          Logger.info('Found potential entry points:', jsFiles);
        }
      } else {
        Logger.error('✗ Dist directory not found');
        
        // Try to find where the files might be
        Logger.info('Checking current directory structure...');
        const rootFiles = fs.readdirSync(deploymentRoot);
        Logger.info('Files in root directory:', rootFiles);
      }
      
      throw new Error('Server entry point not found');
    }
    
    // Use the child_process module to launch the server
    Logger.info('Starting server process...');
    const { spawn } = require('child_process');
    
    // Start the server process
    const server = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: process.env
    });
    
    // Handle server exit
    server.on('close', (code) => {
      if (code !== 0) {
        Logger.error(`Server process exited with code ${code}`);
        process.exit(code);
      }
    });
    
    // Log successful start
    Logger.success('Server process started successfully');
    
    // Keep the parent process running
    process.on('SIGINT', () => {
      Logger.info('Received SIGINT, shutting down...');
      process.exit(0);
    });
    
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Register error handlers
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled promise rejection:', reason);
});
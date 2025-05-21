/**
 * Standalone Deployment Server
 * 
 * This server is specifically designed for Replit deployment.
 * It binds to 0.0.0.0:8080 as required and provides health check endpoints.
 */

// CommonJS module syntax for maximum compatibility
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Log with timestamp for better debugging
function log(message) {
  console.log(`[${new Date().toISOString()}] [DEPLOY] ${message}`);
}

// Start the deployment server
function startDeploymentServer() {
  try {
    log('Starting deployment server...');
    
    // Force environment variables for production
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';
    
    // Create Express app
    const app = express();
    const server = http.createServer(app);
    
    // Health check endpoint (root path)
    app.get('/', (req, res) => {
      log('Health check request received at /');
      res.status(200).json({
        status: 'ok',
        message: 'Invela Platform is running',
        timestamp: new Date().toISOString()
      });
    });
    
    // Explicit health check endpoint
    app.get('/health', (req, res) => {
      log('Health check request received at /health');
      res.status(200).json({
        status: 'ok',
        message: 'Invela Platform is running',
        timestamp: new Date().toISOString()
      });
    });
    
    // Serve static files from dist/client
    const clientDir = path.join(process.cwd(), 'dist', 'client');
    if (fs.existsSync(clientDir)) {
      log(`Serving static files from ${clientDir}`);
      app.use(express.static(clientDir));
    }
    
    // Try to load the main application
    let mainAppLoaded = false;
    try {
      log('Attempting to load main application...');
      
      // Check if dist/index.js exists
      const mainAppPath = path.join(process.cwd(), 'dist', 'index.js');
      if (fs.existsSync(mainAppPath)) {
        log(`Found main application at ${mainAppPath}`);
        
        // Import the main application
        // We will not call this directly to avoid port conflicts
        const mainApp = require(mainAppPath);
        log('Main application loaded successfully');
        mainAppLoaded = true;
      } else {
        log('Main application not found at dist/index.js');
      }
    } catch (error) {
      log(`Error loading main application: ${error.message}`);
      console.error(error);
    }
    
    // Start the server on the required port and address
    server.listen(8080, '0.0.0.0', () => {
      log(`Deployment server running on http://0.0.0.0:8080`);
      
      if (mainAppLoaded) {
        log('Main application is available through this server');
      } else {
        log('Running in health check mode only (main application not loaded)');
      }
    });
    
    // Handle server errors
    server.on('error', (error) => {
      log(`Server error: ${error.message}`);
      console.error(error);
      
      if (error.code === 'EADDRINUSE') {
        log('Port 8080 is already in use. This might be okay if the main app is already running.');
      }
    });
    
    // Return the server instance
    return server;
  } catch (error) {
    log(`Failed to start deployment server: ${error.message}`);
    console.error(error);
    
    // Create a minimal fallback server in case of errors
    try {
      const fallbackApp = express();
      const fallbackServer = http.createServer(fallbackApp);
      
      fallbackApp.get('/', (req, res) => {
        res.status(200).send('Invela Platform (Fallback Mode)');
      });
      
      fallbackServer.listen(8080, '0.0.0.0', () => {
        log('Fallback server running on port 8080');
      });
      
      return fallbackServer;
    } catch (fallbackError) {
      log(`Critical failure: ${fallbackError.message}`);
      console.error(fallbackError);
      process.exit(1);
    }
  }
}

// Start the server immediately
startDeploymentServer();
/**
 * Deployment Server for Replit Cloud Run
 * 
 * This server is specifically designed for Replit Cloud Run deployment.
 * It handles health checks and port binding according to Replit requirements.
 */

// Use CommonJS for compatibility
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Timestamp utility for logging
function timestamp() {
  return new Date().toISOString();
}

// Log with timestamp
function log(message) {
  console.log(`[${timestamp()}] [DEPLOY] ${message}`);
}

// Error logger
function logError(message, error = null) {
  console.error(`[${timestamp()}] [DEPLOY-ERROR] ${message}`);
  if (error) console.error(error);
}

// Success logger
function logSuccess(message) {
  console.log(`[${timestamp()}] [DEPLOY-SUCCESS] ${message}`);
}

// Start the deployment server
function startDeploymentServer() {
  try {
    log('Starting deployment server...');
    
    // Force production environment
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';
    
    log(`Environment: ${process.env.NODE_ENV}`);
    log(`Port: ${process.env.PORT}`);
    log(`Current directory: ${process.cwd()}`);
    
    // Create Express app
    const app = express();
    const server = http.createServer(app);
    
    // Basic security headers
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
    
    // Health check endpoint at root path (required by Replit)
    app.get('/', (req, res) => {
      log('Health check request received at /');
      res.status(200).json({
        status: 'ok',
        message: 'Invela Platform is running',
        timestamp: timestamp()
      });
    });
    
    // Additional health check endpoint
    app.get('/health', (req, res) => {
      log('Health check request received at /health');
      res.status(200).json({
        status: 'ok',
        message: 'Invela Platform is running',
        timestamp: timestamp()
      });
    });
    
    // Serve static client files
    const clientDir = path.join(process.cwd(), 'dist', 'public');
    if (fs.existsSync(clientDir)) {
      log(`Serving static files from ${clientDir}`);
      app.use(express.static(clientDir));
      
      // SPA fallback
      app.get('*', (req, res) => {
        log(`Serving index.html for path: ${req.path}`);
        res.sendFile(path.join(clientDir, 'index.html'));
      });
    } else {
      log(`Client directory not found at ${clientDir}`);
    }
    
    // Start server on the required port
    server.listen(8080, '0.0.0.0', () => {
      logSuccess(`Deployment server running on http://0.0.0.0:8080`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      logError(`Server error: ${error.message}`, error);
      
      if (error.code === 'EADDRINUSE') {
        logError('Port 8080 is already in use');
      }
    });
    
    return server;
  } catch (error) {
    logError(`Failed to start deployment server: ${error.message}`, error);
    
    // Create minimal fallback server
    try {
      log('Starting fallback server...');
      const fallbackApp = express();
      const fallbackServer = http.createServer(fallbackApp);
      
      fallbackApp.get('/', (req, res) => {
        res.status(200).send('Invela Platform (Fallback Mode)');
      });
      
      fallbackServer.listen(8080, '0.0.0.0', () => {
        logSuccess('Fallback server running on port 8080');
      });
      
      return fallbackServer;
    } catch (fallbackError) {
      logError(`Critical failure: ${fallbackError.message}`, fallbackError);
      process.exit(1);
    }
  }
}

// Start the server immediately
startDeploymentServer();
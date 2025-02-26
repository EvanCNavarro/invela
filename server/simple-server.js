/**
 * simple-server.js - Production-ready Express server for compiled TypeScript
 * 
 * This is a streamlined server implementation designed to run compiled TypeScript code.
 * It does not require runtime TypeScript compilation, making it more efficient and reliable
 * for production environments.
 * 
 * Key features:
 * - Proper initialization sequence with explicit error handling
 * - Support for compiled TypeScript modules via path aliases
 * - Graceful shutdown handling
 * - Comprehensive logging
 * - Health check endpoint
 * 
 * Best practices implemented:
 * 1. Separation of concerns between initialization, route setup, and server operation
 * 2. Progressive error handling with fallbacks
 * 3. Explicit initialization sequence
 * 4. Detailed logging for operational visibility
 * 5. Graceful termination handling
 * 6. Environment variable awareness
 */

console.log('[Server] Starting server initialization');

/**
 * Load environment variables
 * We use a try-catch to handle cases where dotenv might not be available
 * or the .env file might not exist
 */
try {
  const dotenvResult = require('dotenv').config();
  console.log('[Server] Environment variables loaded');
  
  if (dotenvResult.error) {
    console.warn('[Server] Warning: .env file not found or has errors:', dotenvResult.error);
  }
} catch (error) {
  console.warn('[Server] Dotenv not available, skipping environment variable loading');
}

/**
 * Register path aliases for compiled TypeScript
 * This enables imports like @db/... to work correctly at runtime
 */
try {
  console.log('[Server] Registering path aliases');
  require('./tsconfig-paths-bootstrap.js');
  console.log('[Server] Path aliases registered successfully');
} catch (error) {
  console.error('[Server] Failed to register path aliases:', error);
  console.error('[Server] This might cause import failures for path aliases (@db/*, @shared/*)');
}

/**
 * Create Express application with middleware
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 5001;

// Configure middleware
app.use(cors());
app.use(bodyParser.json());

/**
 * Health check endpoint
 * This is a simple endpoint that can be used to verify the server is running
 * and to check its uptime
 */
app.get('/api/health', (req, res) => {
  console.log('[Server] Health check requested');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Server is running',
    uptime: process.uptime() + ' seconds',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Server error handling
 * This middleware catches any errors thrown during request processing
 * and returns a structured error response
 */
app.use((err, req, res, next) => {
  console.error('[Server] Error during request processing:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

/**
 * Import the database adapter from the compiled JavaScript
 * The adapter provides access to the database and schemas
 */
let dbAdapter;
try {
  console.log('[Server] Importing database adapter');
  dbAdapter = require('../dist/server/utils/db-adapter.js');
  console.log('[Server] Database adapter imported successfully');
} catch (error) {
  console.error('[Server] Failed to import database adapter:', error);
  console.error('[Server] Check that TypeScript has been compiled correctly');
  process.exit(1); // Exit with error
}

/**
 * Create and start the server
 * We declare the server variable outside the callback so it can be
 * referenced in the graceful shutdown handlers
 */
const server = app.listen(PORT, async () => {
  console.log(`[Server] Server running at http://localhost:${PORT}`);
  console.log(`[Server] Health endpoint: http://localhost:${PORT}/api/health`);
  
  try {
    // Initialize database from compiled files
    console.log('[Server] Initializing database');
    await dbAdapter.initializeDb();
    console.log('[Server] Database initialized successfully');
    
    // Import and set up routes from compiled files
    console.log('[Server] Setting up routes');
    setupRoutes();
    console.log('[Server] Routes initialized successfully');
  } catch (error) {
    console.error('[Server] Error during initialization:', error);
    console.error('[Server] Server will continue with limited functionality');
    
    // Set up minimal routes for basic functionality
    setupMinimalRoutes();
  }
});

/**
 * Set up all application routes
 * This function imports the route handlers from the compiled JavaScript files
 * and registers them with the Express application
 */
function setupRoutes() {
  try {
    // Import auth router
    try {
      console.log('[Server] Importing auth router');
      const authRouter = require('../dist/server/routes/auth.js');
      app.use('/api/auth', authRouter);
      console.log('[Server] Auth routes mounted at /api/auth');
    } catch (error) {
      console.error('[Server] Failed to import auth router:', error);
      // Continue with other routes
    }
    
    // Import API router
    try {
      console.log('[Server] Importing API router');
      const apiRouter = require('../dist/server/routes/api.js');
      app.use('/api', apiRouter);
      console.log('[Server] API routes mounted at /api');
    } catch (error) {
      console.error('[Server] Failed to import API router:', error);
      // Continue with other routes
    }
  } catch (error) {
    console.error('[Server] Error setting up routes:', error);
    throw error;
  }
}

/**
 * Set up minimal routes for when full functionality is not available
 * This provides basic endpoints that work even when the database is not available
 */
function setupMinimalRoutes() {
  console.log('[Server] Setting up minimal routes');
  
  // Minimal auth routes
  const authRouter = express.Router();
  authRouter.post('/login', (req, res) => {
    res.status(503).json({ 
      status: 'error', 
      message: 'Authentication service temporarily unavailable'
    });
  });
  app.use('/api/auth', authRouter);
  
  // Minimal API routes
  const apiRouter = express.Router();
  apiRouter.get('/status', (req, res) => {
    res.status(200).json({ 
      status: 'limited',
      message: 'Server running with limited functionality'
    });
  });
  app.use('/api', apiRouter);
  
  console.log('[Server] Minimal routes set up successfully');
}

/**
 * Graceful shutdown handler
 * This ensures that the server closes all connections properly
 * before terminating the process
 */
function gracefulShutdown() {
  console.log('[Server] Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds to prevent hanging
  setTimeout(() => {
    console.error('[Server] Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000);
}

// Register shutdown handlers for different signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Prevent crashes from unhandled promises and exceptions
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
  // Keep the server running despite the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
  // Keep the server running despite the error
}); 
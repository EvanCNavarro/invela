/**
 * @file index.ts
 * @description Main server entry point that configures Express, middleware, and routes.
 * Sets up the HTTP server, WebSocket server, and authentication.
 */

/**
 * index.ts - Main server entry point
 * 
 * This file orchestrates the Express application setup and server initialization.
 * It follows a structured approach to ensure dependencies are initialized in the correct order,
 * with explicit error handling at each step.
 * 
 * The initialization sequence is critical:
 * 1. Bootstrap path resolution (before any imports)
 * 2. Load environment variables
 * 3. Import dependencies
 * 4. Configure middleware
 * 5. Initialize database connection
 * 6. Set up authentication
 * 7. Register API routes
 * 8. Configure static file serving
 * 9. Start the HTTP server
 */

// Bootstrap path resolution before any other imports
// This makes @db/* and @shared/* path aliases work in CommonJS
require('./tsconfig-paths-bootstrap');

import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./services/websocket";
import { errorHandler } from "./middleware/error";
// Fix linter error: Create a local type if @shared module can't be found
// or update tsconfig paths if it exists in another location
type AppError = Error & { statusCode?: number; isOperational?: boolean };
import env from "./utils/env";
import { performanceMonitor } from "./middleware/performance";
import { setupApiDocs } from "./routes/api-docs";
import { apiVersionMiddleware } from './middleware/api-version';
import cors from 'cors';
import { initializeDb } from './utils/db-adapter';

// Initialize Express application
const app = express();
const server = createServer(app);

// Configure body parsing middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add performance monitoring middleware
app.use(performanceMonitor);

// Apply middleware
app.use(cors());
app.use(express.json());

// Apply API versioning middleware to all API routes
app.use('/api', apiVersionMiddleware({
  defaultVersion: 'v1',
  supportedVersions: ['v1']
}));

/**
 * Request logging middleware.
 * Logs request details and response information for API endpoints.
 * This provides visibility into API traffic and helps with debugging.
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let errorCaptured: Error | undefined = undefined;

  // Debug request body for specific endpoints
  if (path === '/api/users/invite' && req.method === 'POST') {
    log(`[API] Incoming invite request - Headers: ${JSON.stringify(req.headers)}`, 'debug');
    log(`[API] Request body (raw): ${JSON.stringify(req.body)}`, 'debug');
  }

  // Capture JSON response for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Capture response errors
  res.on('error', (error) => {
    errorCaptured = error;
    log(`[API] Response error: ${error.message}`, 'error');
  });

  // Log request completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const status = res.statusCode;
      const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

      let logLine = `[API] ${req.method} ${path} ${status} in ${duration}ms`;

      if (errorCaptured) {
        logLine += ` :: Error: ${errorCaptured.message}`;
      }

      if (capturedJsonResponse && !errorCaptured) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        if (responseStr.length > 80) {
          logLine += ` :: ${responseStr.slice(0, 77)}...`;
        } else {
          logLine += ` :: ${responseStr}`;
        }
      }

      log(logLine, logLevel);
    }
  });

  next();
});

/**
 * Initialize the server with appropriate configuration based on environment
 * 
 * This function follows an async/await pattern to ensure proper initialization sequence:
 * 1. Initialize database
 * 2. Set up API documentation
 * 3. Register API routes
 * 4. Configure WebSocket
 * 5. Set up authentication
 * 6. Configure static file serving
 * 7. Start the server
 * 
 * This sequence ensures dependencies are available before they're needed.
 */
async function initializeServer() {
  try {
    // Initialize database before setting up routes
    // This is critical - routes depend on database access
    log('[Server] Initializing database connection...', 'info');
    await initializeDb();
    log('[Server] Database initialized successfully', 'info');
    
    // Set up API documentation
    setupApiDocs(app);
    
    // Register API routes after database initialization
    // Routes now have access to a fully initialized database
    registerRoutes(app);
    
    // Setup WebSocket server
    setupWebSocket(server);
    
    // Set up authentication after database is initialized
    // Auth depends on database access for user validation
    log('[Server] Setting up authentication...', 'info');
    await setupAuth(app);
    log('[Server] Authentication setup complete', 'info');
    
    // Set up development environment or serve static files in production
    if (app.get("env") === "development") {
      log('[Server] Setting up Vite development server', 'info');
      await setupVite(app, server);
    } else {
      log('[Server] Setting up static file serving for production', 'info');
      // Serve static files only in production, after API routes
      serveStatic(app);
    }
    
    // Use the global error handling middleware
    app.use(errorHandler);
    
    // Start the server
    const port = env.PORT;
    server.listen(port, '0.0.0.0', () => {
      log(`[Server] Running on port ${port} in ${env.NODE_ENV} mode`);
    });
  } catch (err: unknown) {
    // Fix type error by properly handling unknown error type
    const error = err as Error;
    log(`[Server] Failed to initialize server: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Initialize server
initializeServer().catch(err => {
  // Fix type error by properly handling unknown error type
  const error = err as Error;
  log(`[Server] Failed to initialize server: ${error.message}`, 'error');
  process.exit(1);
});
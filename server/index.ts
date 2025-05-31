/**
 * ========================================
 * Express Server Entry Point
 * ========================================
 * 
 * The main server entry point for the enterprise risk assessment platform backend.
 * This file orchestrates the complete server infrastructure including Express setup,
 * WebSocket server initialization, authentication middleware, and API route registration.
 * 
 * Key Responsibilities:
 * - Express application configuration and middleware setup
 * - HTTP and WebSocket server initialization for real-time communication
 * - Authentication and authorization middleware configuration
 * - API route registration and request handling
 * - File system setup for document uploads and storage
 * - Error handling and logging infrastructure
 * 
 * Dependencies:
 * - Express.js for HTTP server and middleware
 * - HTTP server for WebSocket upgrade handling
 * - Authentication system for secure API access
 * - Database connection for data persistence
 * - WebSocket infrastructure for real-time updates
 * 
 * @module server/index
 * @version 1.0.0
 * @since 2025-05-23
 */

// ========================================
// IMPORTS
// ========================================

// Express server framework and core types
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";

// File system operations for upload handling
import fs from 'fs';
import path from 'path';

// Application infrastructure components
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite";
import { logger } from "./utils/logger";
import { setupAuth } from "./auth";
import { initializeWebSocketServer } from "./utils/unified-websocket";
// Removed Storybook proxy - using custom component library

// ========================================
// DIRECTORY INITIALIZATION
// ========================================

/**
 * Initialize Required File System Directories
 * 
 * Creates necessary directories for file uploads and document storage
 * if they don't already exist. This ensures the server can handle
 * file operations without filesystem errors.
 */
function initializeFileSystemDirectories(): void {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const documentsDir = path.join(uploadsDir, 'documents');
  
  // Ensure upload directories exist
  [uploadsDir, documentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
}

// Initialize directories on server startup
initializeFileSystemDirectories();

// ========================================
// ERROR HANDLING CLASSES
// ========================================

/**
 * Custom API Error Class
 * 
 * Provides structured error handling for API endpoints with
 * support for HTTP status codes, error codes, and additional details.
 * This enables consistent error responses across the application.
 * 
 * @extends Error
 */
export class APIError extends Error {
  /**
   * Create a new API error
   * 
   * @param message - Human-readable error message
   * @param status - HTTP status code (default: 500)
   * @param code - Application-specific error code
   * @param details - Additional error context or debugging information
   */
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
    
    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

// ========================================
// SERVER INITIALIZATION
// ========================================

// Create Express application instance
const app = express();

// Create HTTP server for WebSocket upgrade capability
const server = createServer(app);

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

/**
 * Configure Cross-Origin Resource Sharing (CORS)
 * 
 * Enables secure communication between frontend and backend across
 * different domains and ports. Configuration supports both development
 * and production environments with appropriate security settings.
 */
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Configure body parsing middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Set up authentication before routes
setupAuth(app);

// Set up Storybook subdomain proxy
// Removed Storybook proxy setup - using custom component library

/**
 * Enterprise-Grade Smart API Request Logging Middleware
 * 
 * Implements intelligent sampling to reduce log noise while maintaining
 * full debugging capability for errors and important operations.
 * 
 * Sampling Strategy:
 * - Always log: Errors (4xx/5xx), POST/PUT/DELETE operations
 * - Sample: High-frequency GET requests (every 10th occurrence)
 * - Skip: Static asset requests, health checks
 */

// Smart sampling counters for high-frequency endpoints
const requestCounters = new Map<string, number>();

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let errorCaptured: Error | undefined = undefined;

  // Debug request body for specific endpoints (unchanged)
  if (path === '/api/users/invite' && method === 'POST') {
    logger.debug(`Incoming invite request - Headers: ${JSON.stringify(req.headers)}`);
    logger.debug(`Request body (raw): ${JSON.stringify(req.body)}`);
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('error', (error) => {
    errorCaptured = error;
    logger.error(`Response error: ${error.message}`);
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    
    if (path.startsWith("/api")) {
      const status = res.statusCode;
      const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      
      // Smart sampling logic: Always log important requests, sample frequent ones
      const shouldLog = (() => {
        // Always log errors and warnings
        if (logLevel === 'error' || logLevel === 'warn') return true;
        
        // Always log state-changing operations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return true;
        
        // Smart sampling for high-frequency GET requests
        if (method === 'GET') {
          const endpointKey = `${method}:${path}`;
          const currentCount = (requestCounters.get(endpointKey) || 0) + 1;
          requestCounters.set(endpointKey, currentCount);
          
          // Sample every 10th request for polling endpoints
          if (path.includes('/companies/current') || path.includes('/health')) {
            return currentCount % 10 === 1; // Log 1st, 11th, 21st, etc.
          }
          
          // Log all other GET requests (less frequent)
          return true;
        }
        
        return true;
      })();

      if (shouldLog) {
        let logLine = `${method} ${path} ${status} in ${duration}ms`;

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

        // Add sampling indicator for sampled requests
        const endpointKey = `${method}:${path}`;
        const count = requestCounters.get(endpointKey) || 1;
        if (count > 1 && path.includes('/companies/current')) {
          logLine += ` [sampled: request ${count}]`;
        }

        if (logLevel === 'error') {
          logger.error(logLine);
        } else if (logLevel === 'warn') {
          logger.warn(logLine);
        } else {
          logger.info(logLine);
        }
      }
    }
  });

  next();
});

// Register API routes (including demo API) - wrap in async function
(async () => {
  await registerRoutes(app);
})();

// Setup WebSocket server with error handling - using unified implementation
// Initialize once and store the instance for all modules to access
// This uses a dedicated path (/ws) to avoid conflicts with Vite's HMR WebSocket
const wssInstance = initializeWebSocketServer(server);
logger.info('[ServerStartup] WebSocket server initialized with unified implementation');

// Ensure old-style handlers can still access the WebSocket server
// by importing functions from the utilities that need access
import { registerWebSocketServer } from './utils/task-update';
import { setWebSocketServer } from './utils/task-broadcast';

// Register WebSocket server with task-update utility for backward compatibility
registerWebSocketServer(wssInstance);
logger.info('[ServerStartup] WebSocket server registered with task-update utility');

// Set WebSocket server reference for task-broadcast utility
setWebSocketServer(wssInstance);
logger.info('[ServerStartup] WebSocket server registered with task-broadcast utility');

// Log WebSocket server initialization details for debugging
setTimeout(() => {
  if (wssInstance && wssInstance.clients) {
    logger.info(`[ServerStartup] WebSocket server active with ${wssInstance.clients.size} connected clients`);
  } else {
    logger.warn('[ServerStartup] Warning: WebSocket server not properly initialized');
  }
}, 1000);

// Set up development environment
if (process.env.NODE_ENV !== "production") {
  logger.info("Setting up Vite development server");
  setupVite(app, server);
} else {
  // Serve static files only in production, after API routes
  serveStatic(app);
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const isAPIError = err instanceof APIError;
  const status = isAPIError ? err.status : err.status || err.statusCode || 500;
  const timestamp = new Date().toISOString();

  const isProduction = process.env.NODE_ENV === 'production';
  const shouldExposeError = !isProduction || status < 500;

  const errorResponse = {
    status,
    message: shouldExposeError ? err.message : 'Internal Server Error',
    code: isAPIError ? err.code : undefined,
    timestamp,
    path: req.path,
    method: req.method,
    ...(shouldExposeError && err.details ? { details: err.details } : {}),
    ...((!isProduction && err.stack) ? { stack: err.stack } : {})
  };

  // Log error details
  const logMessage = `${status} ${req.method} ${req.path} :: ${err.message}`;
  if (status >= 500) {
    console.error(logMessage, {
      error: err,
      stack: err.stack,
      body: req.body,
      query: req.query,
      user: req.user
    });
  } else {
    console.warn(logMessage, { error: err });
  }

  res.status(status).json(errorResponse);
});

// Import deployment helpers for port and host configuration
import { getDeploymentPort, getDeploymentHost, logDeploymentInfo } from './deployment-helpers';

// Early production optimizations - must run before other configurations
// Root cause fix: Apply infrastructure optimizations that address actual deployment constraints
import { initializeProductionOptimizations } from './deployment/production-config';
initializeProductionOptimizations();

// Configure server for proper deployment
// Use environment-aware configuration for development and production
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

// Set appropriate NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const PORT = getDeploymentPort();
const HOST = getDeploymentHost();

// Set environment variable for other components that might need it
process.env.PORT = PORT.toString();
process.env.HOST = HOST;

// Environment logging for development and deployment
logger.info(`[ENV] Server will listen on PORT=${PORT} (${process.env.NODE_ENV} mode)`);
logger.info(`[ENV] Environment=${process.env.NODE_ENV}`);
logger.info(`[ENV] Configuration: ${isDevelopment ? 'Development' : 'Production'} mode`);

// Import database health checks
import { runStartupChecks } from './startup-checks';
// Import production database setup for deployment readiness
import { initializeProductionDatabase } from './deployment/database-setup';

// Start the server with immediate port binding
server.listen(PORT, HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  
  // Log additional deployment information
  logDeploymentInfo(PORT, HOST);
  
  // Initialize background services after server is listening
  setTimeout(() => {
    // TEMPORARILY DISABLED: Start the periodic task reconciliation system
    if (process.env.NODE_ENV !== 'test') {
      logger.info('TESTING: Periodic task reconciliation system DISABLED to test real-time WebSocket');

      logger.info('Task reconciliation system DISABLED for testing');
    }
    
    // Run startup health checks in the background
    setTimeout(async () => {
      try {
        logger.info('Running background health checks...');
        const healthChecksPassed = await runStartupChecks();
        
        if (healthChecksPassed) {
          logger.info('All background health checks passed successfully.');
        } else {
          logger.warn('Some background health checks failed. Application may encounter database errors.');
        }
      } catch (error) {
        logger.error('Error running background health checks', error);
      }
    }, 5000);
  }, 1000);
});
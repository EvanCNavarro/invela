import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite";
import { logger } from "./utils/logger";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket-setup";
import cors from "cors";
import fs from 'fs';
import path from 'path';

// Create required directories
const uploadsDir = path.join(process.cwd(), 'uploads');
const documentsDir = path.join(uploadsDir, 'documents');

// Ensure upload directories exist
[uploadsDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

const app = express();
const server = createServer(app);

// Configure CORS for all environments
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

// Request logging middleware with detailed error tracking
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let errorCaptured: Error | undefined = undefined;

  // Debug request body for specific endpoints
  if (path === '/api/users/invite' && req.method === 'POST') {
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

      let logLine = `${req.method} ${path} ${status} in ${duration}ms`;

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

      if (logLevel === 'error') {
        logger.error(logLine);
      } else if (logLevel === 'warn') {
        logger.warn(logLine);
      } else {
        logger.info(logLine);
      }
    }
  });

  next();
});

// Register API routes
registerRoutes(app);

// Setup WebSocket server with error handling - using unified implementation
// Initialize once and store the instance for all modules to access
// This uses a dedicated path (/ws) to avoid conflicts with Vite's HMR WebSocket
const wssInstance = setupWebSocketServer(server);
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

// Import task reconciliation system
import { startPeriodicTaskReconciliation } from './utils/periodic-task-reconciliation';

// Early production optimizations - must run before other configurations
// Root cause fix: Apply infrastructure optimizations that address actual deployment constraints
import { initializeProductionOptimizations } from './deployment/production-config';
initializeProductionOptimizations();

// Configure server for proper deployment
// Replit's recommended approach: Force production settings to eliminate conditional complexity
// Best practice: Simple, definitive configuration prevents bundle phase loops
const isProductionDeployment = true;  // Force production mode for Cloud Run deployment

// Set NODE_ENV based on deployment context - prioritize explicit production setting
process.env.NODE_ENV = 'production';

// Cloud Run port configuration - always use port 8080 for proper binding
// Replit's recommendation: Eliminate conditional port logic that causes deployment confusion
const PORT = 8080;  // Always use port 8080 for Cloud Run deployment
const HOST = '0.0.0.0'; // Required for proper binding in Replit environment

// Set environment variable for other components that might need it
process.env.PORT = PORT.toString();
process.env.HOST = HOST;

// Simplified deployment logging for Replit's forced configuration approach
// Best practice: Clear visibility into forced production settings
logger.info(`[ENV] Server will listen on PORT=${PORT} (forced production mode)`);
logger.info(`[ENV] Environment=${process.env.NODE_ENV} (forced production)`);
logger.info(`[ENV] Deployment approach: Replit forced configuration for consistent Cloud Run deployment`);

// Import database health checks
import { runStartupChecks } from './startup-checks';
// Import production database setup for deployment readiness
import { initializeProductionDatabase } from './deployment/database-setup';

// Start the server with the standardized configuration and health checks
server.listen(PORT, HOST, async () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  
  // Log additional deployment information
  logDeploymentInfo(PORT, HOST);
  
  // Start the periodic task reconciliation system directly
  // Don't wait for health checks to avoid creating more rate limit issues
  if (process.env.NODE_ENV !== 'test') {
    logger.info('Starting periodic task reconciliation system...');
    startPeriodicTaskReconciliation();
    logger.info('Task reconciliation system initialized successfully');
  }
  
  // Run startup health checks in the background but don't block application startup
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
  }, 10000); // Delay health checks by 10 seconds to allow rate limits to reset
});
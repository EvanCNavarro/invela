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
import { setupReplitPreviewHandler, setupPreviewApiEndpoints } from "./replit-preview-handler";
import { initializeViteHostValidation } from "./vite-host-adapter";

// Initialize Vite host validation adapter for Replit preview domains
// This addresses the "Blocked request. This host is not allowed" error
initializeViteHostValidation();

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

// Import our custom CORS middleware and host validation override
import { setupCorsBypass } from './cors-middleware';
import { initReplitHostValidation, isReplitPreviewRequest } from './replit-host-validation';

// Initialize the Replit host validation override before creating the server
// This ensures that all HTTP requests are properly handled for Replit preview domains
initReplitHostValidation();

// Create our Express application
const app = express();
const server = createServer(app);

// Apply our custom CORS middleware to handle all domains including Replit preview domains
app.use(setupCorsBypass);

// Add special middleware to handle Replit preview requests
app.use((req, res, next) => {
  if (isReplitPreviewRequest(req)) {
    logger.info(`[ReplitPreview] Processing request from Replit preview domain: ${req.headers.host}`);
  }
  next();
});

// Then configure standard CORS for all other environments
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

// Let Vite handle all frontend routing - React will manage routes
// No special handling for the root path, allowing the React app to handle routing correctly
app.get('/', (req, res, next) => {
  const host = req.headers.host || '';
  
  // Just log the request for debugging
  logger.debug(`[ReactApp] Root path request - Host: ${host}`);
  
  // Continue with normal Vite processing
  next();
});

// Setup the rest of the Replit preview handler
setupReplitPreviewHandler(app);
setupPreviewApiEndpoints(app);
logger.info('[ServerStartup] Replit preview compatibility handler initialized');

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

// Import task reconciliation system
import { startPeriodicTaskReconciliation } from './utils/periodic-task-reconciliation';

// Import database health checks
import { runStartupChecks } from './startup-checks';

// SERVER PORT CONFIGURATION
// In Replit, we need to use port 3000 as the primary port
// We remove the separate workflow proxy port to avoid conflicts

// Use a consistent port that works with Replit's environment
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all interfaces

// Set environment variables for consistency
process.env.PORT = PORT.toString();
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Log the configuration
logger.info('===========================================');
logger.info(`SERVER CONFIGURATION`);
logger.info(`PORT: ${PORT} | HOST: ${HOST}`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info('===========================================');

// Standard port binding - using port 5000 (the default Replit workflow port)
server.listen(5000, HOST, () => {
  logger.info(`Server running on ${HOST}:5000 (${process.env.NODE_ENV}) mode`);
  
  // Log successful startup for debugging
  logger.info(`Server ready to accept connections`);
  logger.info(`Preview URL: ${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}`);
  
  // Log preview URL information for development mode
  if (process.env.NODE_ENV === 'development') {
    logger.info('[ServerStartup] Running in development mode with Replit preview support');
    logger.info(`[ServerStartup] Preview URL: ${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : `http://localhost:${PORT}`}`);
  }
  
  // Start the periodic task reconciliation system
  if (process.env.NODE_ENV !== 'test') {
    logger.info('Starting periodic task reconciliation system...');
    startPeriodicTaskReconciliation();
    logger.info('Task reconciliation system initialized successfully');
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
  }, 10000); // Delay health checks by 10 seconds to allow rate limits to reset
});
// All server initialization is now handled in the server.listen callback above
// No additional initialization needed
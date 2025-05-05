import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { initWebSocketServer } from "./utils/unified-websocket";
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
    log(`Incoming invite request - Headers: ${JSON.stringify(req.headers)}`, 'debug');
    log(`Request body (raw): ${JSON.stringify(req.body)}`, 'debug');
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('error', (error) => {
    errorCaptured = error;
    log(`Response error: ${error.message}`, 'error');
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

      log(logLine, logLevel);
    }
  });

  next();
});

// Register API routes
registerRoutes(app);

// Setup WebSocket server with error handling - using unified implementation
// Initialize once and store the instance for all modules to access
const wssInstance = initWebSocketServer(server);
log('[ServerStartup] WebSocket server initialized with unified implementation', 'info');

// Ensure old-style handlers can still access the WebSocket server
// by importing functions from the utilities that need access
import { registerWebSocketServer } from './utils/task-update';
import { setWebSocketServer } from './utils/task-broadcast';

// Register WebSocket server with task-update utility for backward compatibility
registerWebSocketServer(wssInstance);
log('[ServerStartup] WebSocket server registered with task-update utility', 'info');

// Set WebSocket server reference for task-broadcast utility
setWebSocketServer(wssInstance);
log('[ServerStartup] WebSocket server registered with task-broadcast utility', 'info');

// Log WebSocket server initialization details for debugging
setTimeout(() => {
  if (wssInstance && wssInstance.clients) {
    log(`[ServerStartup] WebSocket server active with ${wssInstance.clients.size} connected clients`, 'info');
    // Add detailed information about the WebSocket server for diagnostics
    const wsConfig = {
      path: wssInstance.options.path,
      clientCount: wssInstance.clients.size,
      timestamp: new Date().toISOString(),
      server: 'active'
    };
    log(`[ServerStartup] WebSocket server details: ${JSON.stringify(wsConfig)}`, 'debug');
  } else {
    log('[ServerStartup] Warning: WebSocket server not properly initialized', 'warn');
  }
}, 1000);

// Set up development environment
if (process.env.NODE_ENV !== "production") {
  log("Setting up Vite development server", "info");
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

// Get the appropriate port and host for the current environment
const PORT = getDeploymentPort();
const HOST = getDeploymentHost();

// Differentiate between development and deployment environments
// For local development (workflow), use port 5000
// For Autoscale deployment, use port 8080
const isDeployment = process.env.REPLIT_AUTOSCALE_DEPLOYMENT === 'true';

// Set environment variables based on context
if (isDeployment) {
  // For Autoscale deployment
  process.env.NODE_ENV = 'production';
  process.env.PORT = '8080';
  process.env.HOST = '0.0.0.0';
} else {
  // For local development workflow
  process.env.NODE_ENV = 'development';
  process.env.PORT = '5000';
  process.env.HOST = '0.0.0.0';
}

// Use environment-appropriate settings
const FORCE_USE_ENV_PORT = parseInt(process.env.PORT, 10);
const FORCE_USE_ENV_HOST = '0.0.0.0'; // Required for Replit
const FORCE_PRODUCTION = process.env.NODE_ENV === 'production';

// Log environment detection information
console.log(`[ENV] Using PORT=${FORCE_USE_ENV_PORT} from environment (override: ${process.env.PORT ? 'yes' : 'no'})`);
console.log(`[ENV] Environment=${process.env.NODE_ENV || 'development'} (production: ${FORCE_PRODUCTION ? 'yes' : 'no'})`);

server.listen(FORCE_USE_ENV_PORT, FORCE_USE_ENV_HOST, () => {
  log(`Server running on ${FORCE_USE_ENV_HOST}:${FORCE_USE_ENV_PORT}`);
  log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log additional deployment information
  logDeploymentInfo(FORCE_USE_ENV_PORT, FORCE_USE_ENV_HOST);
  
  // Start the periodic task reconciliation system
  if (process.env.NODE_ENV !== 'test') {
    log('Starting periodic task reconciliation system...');
    startPeriodicTaskReconciliation();
    log('Task reconciliation system initialized successfully');
  }
});
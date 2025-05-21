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

// Import our custom CORS middleware
import { setupCorsBypass } from './cors-middleware';

// Apply our custom CORS middleware first to handle Replit preview domains
app.use(setupCorsBypass);

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

// Setup Replit preview handler for direct compatibility
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
// Using a consistent port in both development and production
// In development, the app needs to be accessible via the preview
// In production, we use 8080 for Replit deployments

// Use the standard port for development (3000)
// This is what Vite uses by default
const PORT = process.env.NODE_ENV === 'production' ? 8080 : 3000;
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

// Standard port binding - using a single port for simplicity
server.listen(PORT, HOST, async () => {
  logger.info(`Server running on ${HOST}:${PORT} (${process.env.NODE_ENV}) mode`);
  
  // Log successful startup for debugging
  logger.info(`Server ready to accept connections`);
  logger.info(`Preview URL: ${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : `http://localhost:${PORT}`}`);
  
  // In development, also handle the proxy server for testing
  if (process.env.NODE_ENV === 'development') {
    const originalPort = PORT;
    try {
      // Try to also listen on port 5000 to satisfy Replit workflow
      // This is just a fallback and not the primary connection method
      const tryWorkflowPort = async () => {
        try {
          const http = await import('http');
          const workflowPort = 5000;
          const workflowProxy = http.createServer((req, res) => {
            logger.info(`Workflow proxy received request: ${req.url}`);
            res.writeHead(302, {
              'Location': `http://${HOST}:${originalPort}${req.url}`
            });
            res.end();
          });
          
          workflowProxy.listen(workflowPort, HOST, () => {
            logger.info(`Workflow proxy running on port ${workflowPort} (redirecting to main port ${originalPort})`);
          });
          
          workflowProxy.on('error', (err) => {
            logger.warn(`Workflow proxy error: ${err.message}`);
          });
        } catch (err) {
          logger.warn(`Could not start workflow proxy: ${err instanceof Error ? err.message : String(err)}`);
        }
      };
      
      // Try the proxy but don't block the main server if it fails
      setTimeout(tryWorkflowPort, 1000);
    } catch (err) {
      logger.warn(`Additional port setup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
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
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

// Initialize our new WebSocket implementation for better type safety and maintainability
// Initialize a proper WebSocket server the conventional way
// to avoid duplicate initialization conflicts
import { WebSocketServer } from 'ws';
logger.info('[ServerStartup] Setting up a single WebSocket server instance');

// Create a single WebSocket server instance with explicit path
const wssInstance = new WebSocketServer({ 
  server, 
  path: '/ws',
  // Skip Vite HMR connections to avoid conflicts
  verifyClient: (info: { req: { headers: { [key: string]: string | string[] | undefined } } }) => {
    if (info.req.headers['sec-websocket-protocol'] === 'vite-hmr') {
      logger.debug('[WebSocket] Ignoring Vite HMR WebSocket connection');
      return false;
    }
    return true;
  }
});

// Use functions from the unified-websocket module to register the WebSocket server with various modules
import { registerWebSocketServer } from './utils/task-update';
import { setWebSocketServer } from './utils/task-broadcast';
import { getConnectedClientCount, getWebSocketServer, initializeWebSocketServer } from './utils/unified-websocket';

// Register WebSocket server with task-update utility
registerWebSocketServer(wssInstance);
logger.info('[ServerStartup] WebSocket server registered with task-update utility');

// Set WebSocket server reference for task-broadcast utility
setWebSocketServer(wssInstance);
logger.info('[ServerStartup] WebSocket server registered with task-broadcast utility');

// Initialize the unified WebSocket implementation using our existing server and WebSocket instance
try {
  // Initialize the WebSocket server using the imported function from unified-websocket.ts
  initializeWebSocketServer(server, '/ws');
  logger.info('[ServerStartup] Unified WebSocket server initialized successfully', {
    connectedClients: getConnectedClientCount(),
    timestamp: new Date().toISOString()
  });
} catch (wsError) {
  logger.error('[ServerStartup] Failed to initialize unified WebSocket server', {
    error: wsError instanceof Error ? wsError.message : String(wsError),
    stack: wsError instanceof Error ? wsError.stack : undefined
  });
}

// Listen for connections
wssInstance.on('connection', (socket, req) => {
  logger.info('[WebSocket] Client connected');
  
  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      logger.debug('[WebSocket] Received message:', message);
      
      // Handle different message types
      if (message.type === 'ping') {
        socket.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      logger.error('[WebSocket] Error processing message:', error);
    }
  });
  
  socket.on('close', () => {
    logger.info('[WebSocket] Client disconnected');
  });
});

// Log current WebSocket server state
setTimeout(() => {
  logger.info(`[ServerStartup] WebSocket server active with ${wssInstance.clients.size} connected clients`);
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

// Configure server for proper deployment
// Always use port 8080 for Autoscale deployment, 5000 for local development
const isDeployment = process.env.REPLIT_AUTOSCALE_DEPLOYMENT === 'true';

// Set NODE_ENV based on deployment context
process.env.NODE_ENV = isDeployment ? 'production' : 'development';

// Standardize port configuration for deployment compatibility
// Always bind to 0.0.0.0 for proper network access
const PORT = isDeployment ? 8080 : (parseInt(process.env.PORT || '', 10) || 5000);
const HOST = '0.0.0.0'; // Required for proper binding in Replit environment

// Set environment variable for other components that might need it
process.env.PORT = PORT.toString();
process.env.HOST = HOST;

// Log deployment configuration for debugging
logger.info(`[ENV] Server will listen on PORT=${PORT} (deployment mode: ${isDeployment ? 'yes' : 'no'})`);
logger.info(`[ENV] Environment=${process.env.NODE_ENV} (NODE_ENV explicitly set)`);

// Start the server with the standardized configuration
server.listen(PORT, HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  
  // Log additional deployment information
  logDeploymentInfo(PORT, HOST);
  
  // Start the periodic task reconciliation system
  if (process.env.NODE_ENV !== 'test') {
    logger.info('Starting periodic task reconciliation system...');
    startPeriodicTaskReconciliation();
    logger.info('Task reconciliation system initialized successfully');
  }
});
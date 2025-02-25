/**
 * @file index.ts
 * @description Main server entry point that configures Express, middleware, and routes.
 * Sets up the HTTP server, WebSocket server, and authentication.
 */

import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./services/websocket";
import { errorHandler } from "./middleware/error";
import { AppError } from "@shared/utils/errors";
import env from "./utils/env";
import { performanceMonitor } from "./middleware/performance";
import { setupApiDocs } from "./routes/api-docs";
import { apiVersionMiddleware } from './middleware/api-version';
import cors from 'cors';

// Initialize Express application
const app = express();
const server = createServer(app);

// Configure body parsing middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add performance monitoring middleware
app.use(performanceMonitor);

// Set up authentication before routes
setupAuth(app);

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

// Set up API documentation
setupApiDocs(app);

// Register API routes
registerRoutes(app);

// Setup WebSocket server
setupWebSocket(server);

/**
 * Initialize the server with appropriate configuration based on environment
 */
async function initializeServer() {
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
}

// Initialize server
initializeServer().catch(err => {
  log(`[Server] Failed to initialize server: ${err.message}`, 'error');
  process.exit(1);
});
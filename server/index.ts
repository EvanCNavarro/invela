import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketServer, WebSocket } from 'ws';

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

// WebSocket clients store
const clients = new Set<WebSocket>();

// Broadcast to all connected clients
export function broadcastMessage(type: string, data: any) {
  const message = JSON.stringify({ type, data });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware with improved error tracking
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let errorCaptured: Error | undefined = undefined;

  // Capture response data for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Error event listener
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

      // Add error information if present
      if (errorCaptured) {
        logLine += ` :: Error: ${errorCaptured.message}`;
      }

      // Add response data for non-error responses
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

(async () => {
  const server = registerRoutes(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    // Ignore Vite HMR WebSocket connections
    verifyClient: ({ req }) => {
      return req.headers['sec-websocket-protocol'] !== 'vite-hmr';
    }
  });

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket client connected');
    clients.add(ws);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Enhanced error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const isAPIError = err instanceof APIError;
    const status = isAPIError ? err.status : err.status || err.statusCode || 500;
    const timestamp = new Date().toISOString();

    // Determine if we should expose error details
    const isProduction = process.env.NODE_ENV === 'production';
    const shouldExposeError = !isProduction || status < 500;

    // Construct error response
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

    // Log error with full details
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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
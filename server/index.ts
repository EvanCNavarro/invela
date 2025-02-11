import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

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

// WebSocket clients store
const wsClients = new Set<WebSocket>();

// Configure body parsing middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
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

registerRoutes(app);

if (app.get("env") === "development") {
  await setupVite(app, server);
}

// Setup WebSocket server after Vite in development
const wss = new WebSocketServer({ 
  noServer: true, // Important: Use noServer mode
  perMessageDeflate: false // Disable compression for better compatibility
});

// Handle upgrade requests manually
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

  if (pathname === '/api/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket, req) => {
  console.log('New WebSocket client connected from:', req.headers.origin);
  wsClients.add(ws);

  // Send initial connection confirmation
  ws.send(JSON.stringify({ 
    type: 'connection_established', 
    data: { timestamp: new Date().toISOString() } 
  }));

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
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});

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

if (app.get("env") !== "development") {
  serveStatic(app);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  log(`Server running on port ${PORT}`);
});
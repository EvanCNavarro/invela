"use strict";
/**
 * @file index.ts
 * @description Main server entry point that configures Express, middleware, and routes.
 * Sets up the HTTP server, WebSocket server, and authentication.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const routes_1 = require("./routes");
const vite_1 = require("./vite");
const auth_1 = require("./auth");
const websocket_1 = require("./services/websocket");
const error_1 = require("./middleware/error");
const env_1 = __importDefault(require("./utils/env"));
const performance_1 = require("./middleware/performance");
const api_docs_1 = require("./routes/api-docs");
const api_version_1 = require("./middleware/api-version");
const cors_1 = __importDefault(require("cors"));
const db_adapter_1 = require("./utils/db-adapter");
// Initialize Express application
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Configure body parsing middleware first
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Add performance monitoring middleware
app.use(performance_1.performanceMonitor);
// Apply middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Apply API versioning middleware to all API routes
app.use('/api', (0, api_version_1.apiVersionMiddleware)({
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
    let capturedJsonResponse = undefined;
    let errorCaptured = undefined;
    // Debug request body for specific endpoints
    if (path === '/api/users/invite' && req.method === 'POST') {
        (0, vite_1.log)(`[API] Incoming invite request - Headers: ${JSON.stringify(req.headers)}`, 'debug');
        (0, vite_1.log)(`[API] Request body (raw): ${JSON.stringify(req.body)}`, 'debug');
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
        (0, vite_1.log)(`[API] Response error: ${error.message}`, 'error');
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
                }
                else {
                    logLine += ` :: ${responseStr}`;
                }
            }
            (0, vite_1.log)(logLine, logLevel);
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
        (0, vite_1.log)('[Server] Initializing database connection...', 'info');
        await (0, db_adapter_1.initializeDb)();
        (0, vite_1.log)('[Server] Database initialized successfully', 'info');
        // Set up API documentation
        (0, api_docs_1.setupApiDocs)(app);
        // Register API routes after database initialization
        // Routes now have access to a fully initialized database
        (0, routes_1.registerRoutes)(app);
        // Setup WebSocket server
        (0, websocket_1.setupWebSocket)(server);
        // Set up authentication after database is initialized
        // Auth depends on database access for user validation
        (0, vite_1.log)('[Server] Setting up authentication...', 'info');
        await (0, auth_1.setupAuth)(app);
        (0, vite_1.log)('[Server] Authentication setup complete', 'info');
        // Set up development environment or serve static files in production
        if (app.get("env") === "development") {
            (0, vite_1.log)('[Server] Setting up Vite development server', 'info');
            await (0, vite_1.setupVite)(app, server);
        }
        else {
            (0, vite_1.log)('[Server] Setting up static file serving for production', 'info');
            // Serve static files only in production, after API routes
            (0, vite_1.serveStatic)(app);
        }
        // Use the global error handling middleware
        app.use(error_1.errorHandler);
        // Start the server
        const port = env_1.default.PORT;
        server.listen(port, '0.0.0.0', () => {
            (0, vite_1.log)(`[Server] Running on port ${port} in ${env_1.default.NODE_ENV} mode`);
        });
    }
    catch (err) {
        // Fix type error by properly handling unknown error type
        const error = err;
        (0, vite_1.log)(`[Server] Failed to initialize server: ${error.message}`, 'error');
        process.exit(1);
    }
}
// Initialize server
initializeServer().catch(err => {
    // Fix type error by properly handling unknown error type
    const error = err;
    (0, vite_1.log)(`[Server] Failed to initialize server: ${error.message}`, 'error');
    process.exit(1);
});

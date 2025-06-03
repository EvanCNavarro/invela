import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5000;

// Simple console logger
const logger = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`),
  error: (msg: string) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`)
};

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  setupAuth(app);
  await registerRoutes(app);
  const server = createServer(app);

  // Use proper environment detection for deployment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Deployment diagnostic logging
  logger.info(`[DEPLOYMENT-CHECK] Environment Variables:
    NODE_ENV: ${process.env.NODE_ENV}
    PORT: ${process.env.PORT}
    IS_PRODUCTION: ${isProduction}`);
  
  logger.info(`[DEPLOYMENT-CHECK] File System Check:
    Current Directory: ${process.cwd()}
    Dist Directory Exists: ${fs.existsSync(path.resolve(process.cwd(), 'dist/public'))}`);
  
  if (isProduction) {
    logger.info('[PROD-DEBUG] Production deployment: Setting up static file serving');
    
    if (!fs.existsSync(path.resolve(process.cwd(), 'dist/public'))) {
      logger.error('[DEPLOYMENT-ERROR] ❌ CRITICAL: No build files found at ' + path.resolve(process.cwd(), 'dist/public'));
      logger.error('[DEPLOYMENT-ERROR] ❌ Build process failed - User will see blank page');
    } else {
      logger.info('[DEPLOYMENT-SUCCESS] ✅ Build files found - Production deployment ready');
    }
    
    serveStatic(app);
    logger.info('[PROD-DEBUG] ✓ Static file serving configured');
  } else {
    logger.info('[PROD-DEBUG] Development mode: Setting up Vite development server');
    setupVite(app, server);
    logger.info('[PROD-DEBUG] ✓ Development server configured');
  }

  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`[ServerStartup] Server running on http://0.0.0.0:${PORT}`);
    logger.info(`[ServerStartup] Environment: ${isProduction ? 'production' : 'development'}`);
  });
})();

// Error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  logger.error(`[ServerError] ${status}: ${message}`);
  res.status(status).json({ message });
});
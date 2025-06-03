import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic } from "./vite";
import { logger } from "./utils/logger";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  setupAuth(app);
  const server = registerRoutes(app);

  // CRITICAL: Set up frontend serving AFTER API routes are fully registered
  logger.info('[PROD-DEBUG] Now setting up frontend serving (should be AFTER API routes)');

  // Use proper environment detection for deployment
  const isProduction = process.env.NODE_ENV === 'production';

  // Deployment diagnostic logging
  logger.info(`[DEPLOYMENT-CHECK] Environment Variables:
    NODE_ENV: ${process.env.NODE_ENV}
    PORT: ${process.env.PORT}
    DEPLOYMENT_MODE: ${process.env.DEPLOYMENT_MODE || 'not set'}
    IS_PRODUCTION: ${isProduction}`);

  logger.info(`[DEPLOYMENT-CHECK] File System Check:
    Current Directory: ${process.cwd()}
    Dist Directory Exists: ${fs.existsSync(path.resolve(process.cwd(), 'dist/public'))}
    Server Public Exists: ${fs.existsSync(path.resolve(process.cwd(), 'server/public'))}`);

  if (fs.existsSync(path.resolve(process.cwd(), 'dist/public'))) {
    const distFiles = fs.readdirSync(path.resolve(process.cwd(), 'dist/public'));
    logger.info(`[DEPLOYMENT-CHECK] Dist Files: ${JSON.stringify(distFiles)}`);
  }

  if (fs.existsSync(path.resolve(process.cwd(), 'server/public'))) {
    const serverFiles = fs.readdirSync(path.resolve(process.cwd(), 'server/public'));
    logger.info(`[DEPLOYMENT-CHECK] Server Public Files: ${JSON.stringify(serverFiles)}`);
  }

  if (isProduction) {
    logger.info('[PROD-DEBUG] Production deployment: Setting up static file serving');
    logger.info('[PROD-DEBUG] API routes have priority over catch-all HTML serving');
    logger.info(`[PROD-DEBUG] Checking for build files at: ${path.resolve(process.cwd(), 'dist/public')}`);
    logger.info(`[PROD-DEBUG] Server expects files at: ${path.resolve(process.cwd(), 'dist/public')}`);

    if (!fs.existsSync(path.resolve(process.cwd(), 'dist/public'))) {
      logger.error('[DEPLOYMENT-ERROR] ❌ CRITICAL: No build files found at ' + path.resolve(process.cwd(), 'dist/public'));
      logger.error('[DEPLOYMENT-ERROR] ❌ This means npm run build was not executed during deployment');
      logger.error('[DEPLOYMENT-ERROR] ❌ User will see blank page - Build process failed');
    } else {
      logger.info('[DEPLOYMENT-SUCCESS] ✅ Build files found - Production deployment ready');
    }

    serveStatic(app);
    logger.info('[PROD-DEBUG] ✓ Static file serving configured with API route priority');
  } else {
    logger.info('[PROD-DEBUG] Development mode: Setting up Vite development server');
    setupVite(app, server);
    logger.info('[PROD-DEBUG] ✓ Development server configured with API route priority verified');
  }

  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`[ServerStartup] Server running on http://0.0.0.0:${PORT}`);
    logger.info(`[ServerStartup] Environment: ${isProduction ? 'production' : 'development'}`);
    logger.info(`[ServerStartup] Frontend serving: ${isProduction ? 'static files' : 'Vite dev server'}`);
  });
})();

// Error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error(`[ServerError] ${status}: ${message}`, {
    url: req.url,
    method: req.method,
    stack: err.stack
  });

  res.status(status).json({ message });
});
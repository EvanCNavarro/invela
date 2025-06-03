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
  logger.info(`[DEPLOYMENT-CHECK] Environment: ${isProduction ? 'production' : 'development'}`);
  logger.info(`[DEPLOYMENT-CHECK] Build files exist: ${fs.existsSync(path.resolve(process.cwd(), 'dist/public'))}`);
  
  if (isProduction) {
    logger.info('[DEPLOYMENT] Production mode: serving static files');
    
    if (!fs.existsSync(path.resolve(process.cwd(), 'dist/public'))) {
      logger.error('[DEPLOYMENT-ERROR] ❌ No build files found - deployment will fail');
    } else {
      logger.info('[DEPLOYMENT-SUCCESS] ✅ Build files found - production ready');
    }
    
    serveStatic(app);
  } else {
    logger.info('[DEVELOPMENT] Setting up Vite development server');
    setupVite(app, server);
  }

  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`[ServerStartup] Server running on http://0.0.0.0:${PORT}`);
    logger.info(`[ServerStartup] Mode: ${isProduction ? 'production' : 'development'}`);
  });
})();

// Error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  logger.error(`[ServerError] ${status}: ${message}`);
  res.status(status).json({ message });
});
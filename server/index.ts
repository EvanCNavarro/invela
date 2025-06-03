import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic } from "./vite";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5000;

// Simple logger
const logger = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`),
  error: (msg: string) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`)
};

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  setupAuth(app);
  await registerRoutes(app);
  const httpServer = createServer(app);

  // Environment detection
  const isProduction = process.env.NODE_ENV === 'production';
  
  logger.info(`[Environment] ${isProduction ? 'Production' : 'Development'} mode detected`);
  
  if (isProduction) {
    // Production: serve static files
    logger.info('[Production] Configuring static file serving');
    if (!fs.existsSync(path.resolve(process.cwd(), 'dist/public'))) {
      logger.error('[Production] Build files not found - deployment will fail');
    }
    serveStatic(app);
  } else {
    // Development: use Vite dev server
    logger.info('[Development] Setting up Vite development server');
    setupVite(app, httpServer);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
  });
})();

// Error handling
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error(`Error ${status}: ${message}`);
  res.status(status).json({ message });
});
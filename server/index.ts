import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic } from "./vite";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  setupAuth(app);
  await registerRoutes(app);
  
  const httpServer = createServer(app);
  
  // Environment detection
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: serve static files
    serveStatic(app);
  } else {
    // Development: use Vite dev server
    await setupVite(app, httpServer);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
})();

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});
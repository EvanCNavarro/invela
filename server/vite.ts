import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // Don't exit process on error - just log it
        viteLogger.error(msg, options);
        console.error("[Vite] Error:", msg);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // Serve static assets from public directory if they exist
  const publicDir = path.resolve(__dirname, "..", "client", "public");
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    log("Serving static assets from: " + publicDir);
  }
  
  // Only handle non-API routes with the catch-all handler
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes and let them be handled by the actual API handlers
    if (url.startsWith('/api') || url.startsWith('/ws') || url.startsWith('/api-docs')) {
      return next();
    }

    log(`Handling client-side route: ${url}`);

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      if (!fs.existsSync(clientTemplate)) {
        log(`ERROR: Client template not found at ${clientTemplate}`, "error");
        return next(new Error(`Client template not found at ${clientTemplate}`));
      }

      // Always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`)
      
      // Transform the template with Vite
      const page = await vite.transformIndexHtml(url, template);
      
      // Log successful rendering
      log(`Successfully served client route: ${url}`);
      
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error(`Error serving client route ${req.originalUrl}:`, e);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import * as vite from "vite";
import { nanoid } from "nanoid";

// Create a logger using the Vite logger if available
let viteLogger: any;
try {
  // @ts-ignore - We're handling potential import issues
  viteLogger = vite.createLogger ? vite.createLogger() : console;
} catch (e) {
  viteLogger = {
    info: console.info,
    warn: console.warn,
    error: console.error,
    clearScreen: () => {}
  };
}

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
  // Dynamically import the vite config
  let config = {};
  try {
    // Dynamic import of vite.config.ts
    const viteConfigModule = await import('../vite.config.js');
    config = viteConfigModule.default || {};
    log("Successfully loaded Vite config");
  } catch (error) {
    console.error("Error loading Vite config:", error);
    // Continue with empty config if import fails
  }

  // @ts-ignore - Handle potential compatibility issues with createServer
  const viteServer = await vite.createServer({
    ...config,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        // Don't exit process on error - just log it
        if (viteLogger.error) {
          viteLogger.error(msg, options);
        }
        console.error("[Vite] Error:", msg);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(viteServer.middlewares);
  
  // Serve static assets from public directory if they exist
  const publicDir = path.resolve("../client/public");
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
        "../client/index.html",
      );

      if (!fs.existsSync(clientTemplate)) {
        log(`ERROR: Client template not found at ${clientTemplate}`, "error");
        return next(new Error(`Client template not found at ${clientTemplate}`));
      }

      // Always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`)
      
      // Transform the template with Vite
      const page = await viteServer.transformIndexHtml(url, template);
      
      // Log successful rendering
      log(`Successfully served client route: ${url}`);
      
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      viteServer.ssrFixStacktrace(e as Error);
      console.error(`Error serving client route ${req.originalUrl}:`, e);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve("public");

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

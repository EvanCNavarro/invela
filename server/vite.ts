import { Express } from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import express from "express";

export async function setupVite(app: Express, server: any) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
    base: "/",
  });

  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  const serve = (path: string, cache: boolean = true) => {
    return express.static(path, {
      maxAge: cache ? "1d" : 0,
    });
  };

  // Handle HMR WebSocket upgrade
  server.on("upgrade", (request: any, socket: any, head: any) => {
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      vite.ws.handleUpgrade(request, socket, head, (ws: any) => {
        vite.ws.send("connected", { type: "connected" });
        ws.on("message", (data: any) => {
          try {
            const message = JSON.parse(data);
            if (message.type === "ping") {
              ws.send(JSON.stringify({ type: "pong" }));
            }
          } catch (e) {
            // ignore invalid messages
          }
        });
      });
    }
  });

  // In development, let Vite handle all frontend routes
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Skip API routes
      if (url.startsWith("/api/")) {
        return next();
      }

      // Let Vite handle the request
      const template = fs.readFileSync(
        path.resolve("client/index.html"),
        "utf-8",
      );
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");

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
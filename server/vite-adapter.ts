/**
 * Enhanced Vite Adapter for Replit Preview
 * 
 * This module solves the "Blocked request" error in Replit preview domains
 * by properly handling both the initial HTML and subsequent JavaScript module requests.
 * 
 * It integrates with Vite's transformation pipeline to ensure all modules are
 * properly processed before being sent to the browser.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { nanoid } from 'nanoid';

// Keep a reference to the Vite server instance
let viteDevServer: any = null;

/**
 * Initialize the Vite server for direct module handling
 */
async function getViteServer() {
  if (!viteDevServer) {
    try {
      logger.info('[ViteAdapter] Initializing dedicated Vite server for preview domains');
      
      viteDevServer = await createViteServer({
        configFile: path.resolve(process.cwd(), 'vite.config.ts'),
        server: {
          middlewareMode: true,
          hmr: false, // Disable HMR for our special instance to avoid conflicts
        },
        appType: 'custom',
      });
      
      logger.info('[ViteAdapter] Vite server initialized successfully');
    } catch (error) {
      logger.error(`[ViteAdapter] Failed to initialize Vite server: ${error}`);
      return null;
    }
  }
  
  return viteDevServer;
}

/**
 * Detect if the request is for a path that should be handled by the Vite dev server
 */
function isViteRequest(req: Request): boolean {
  const url = req.url;
  return url.startsWith('/@vite') || 
         url.startsWith('/@fs') || 
         url.endsWith('.js') || 
         url.endsWith('.css') || 
         url.endsWith('.html') ||
         url.endsWith('.svg') ||
         url.endsWith('.json') ||
         url.endsWith('.tsx') ||
         url.endsWith('.ts') ||
         url.includes('node_modules');
}

/**
 * Handle requests for JavaScript/TypeScript modules
 */
async function handleModuleRequest(req: Request, res: Response) {
  const vite = await getViteServer();
  if (!vite) {
    logger.error('[ViteAdapter] Cannot handle module request: Vite server not available');
    return false;
  }
  
  try {
    // Extract module path from the URL
    const modulePath = req.path;
    
    // Construct the filesystem path
    const rootDir = process.cwd();
    let fsPath: string;
    
    if (modulePath.startsWith('/src/')) {
      // For source files, look in the client directory
      fsPath = path.join(rootDir, 'client', modulePath);
    } else if (modulePath.startsWith('/@vite/') || modulePath.startsWith('/@fs/')) {
      // Let Vite handle special paths
      return false;
    } else {
      // For other files, try the root
      fsPath = path.join(rootDir, modulePath);
    }
    
    // Check if this file exists on disk
    if (fs.existsSync(fsPath)) {
      const fileContent = fs.readFileSync(fsPath, 'utf-8');
      
      // Use Vite's transform to handle the file content
      // This correctly processes TypeScript and JSX
      const transformedResult = await vite.transformRequest(modulePath);
      
      if (transformedResult) {
        // Set proper content type based on the file extension
        let contentType = 'application/javascript';
        if (modulePath.endsWith('.css')) {
          contentType = 'text/css';
        } else if (modulePath.endsWith('.html')) {
          contentType = 'text/html';
        } else if (modulePath.endsWith('.json')) {
          contentType = 'application/json';
        } else if (modulePath.endsWith('.svg')) {
          contentType = 'image/svg+xml';
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        // Send the transformed code
        res.send(transformedResult.code);
        return true;
      }
    }
  } catch (error) {
    logger.error(`[ViteAdapter] Error transforming module ${req.path}: ${error}`);
  }
  
  return false;
}

/**
 * Enhanced middleware to handle Vite blocked hosts
 */
export async function viteHostAdapter(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host || '';
  
  // Check if this is a UUID-style Replit preview domain that would be blocked
  const isBlockedPreviewDomain = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*picard\.replit\.dev/.test(host);
  
  // For normal routes, let Vite handle it
  if (!isBlockedPreviewDomain) {
    return next();
  }
  
  logger.info(`[ViteAdapter] Handling request for blocked Replit preview domain: ${host}`);
  
  // If it's a specific UUID-style Replit domain that would be blocked, handle it
  
  // For the root path, serve the main index.html with properly transformed script tags
  if (req.path === '/' || req.path === '') {
    const clientTemplate = path.resolve(process.cwd(), 'client', 'index.html');
    
    try {
      if (fs.existsSync(clientTemplate)) {
        const vite = await getViteServer();
        let html = fs.readFileSync(clientTemplate, 'utf-8');
        
        // Add a cache-busting parameter to ensure module loads correctly
        html = html.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
        
        // Transform the HTML through Vite if available
        if (vite) {
          try {
            html = await vite.transformIndexHtml(req.url, html);
          } catch (transformError) {
            logger.error(`[ViteAdapter] Error transforming index.html: ${transformError}`);
          }
        }
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(html);
      }
    } catch (error) {
      logger.error(`[ViteAdapter] Error reading client index.html: ${error}`);
    }
  }
  
  // For module requests, handle them with our specialized module handler
  if (isViteRequest(req)) {
    logger.debug(`[ReplitPreview] Preview request detected: ${req.method} ${req.url}`);
    const handled = await handleModuleRequest(req, res);
    
    if (handled) {
      return; // Request was handled successfully
    }
  }
  
  // Continue to the next middleware for any unhandled requests
  next();
}
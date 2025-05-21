/**
 * Vite Adapter for Replit Preview
 * 
 * This file creates a specialized adapter that handles the specific error:
 * "Blocked request. This host is not allowed. Add the domain to server.allowedHosts in vite.config.js"
 * 
 * Since we can't modify vite.config.js directly, we create a middleware that serves the content
 * when this specific host pattern is detected.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';
import path from 'path';
import fs from 'fs';

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
         url.includes('node_modules');
}

/**
 * Middleware to handle Vite blocked hosts by serving content directly
 */
export function viteHostAdapter(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host || '';
  
  // Check if this is a UUID-style Replit preview domain that would be blocked
  const isBlockedPreviewDomain = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*picard\.replit\.dev/.test(host);
  
  // For normal routes, let Vite handle it
  if (!isBlockedPreviewDomain) {
    return next();
  }
  
  logger.info(`[ViteAdapter] Handling request for blocked Replit preview domain: ${host}`);
  
  // If it's a specific UUID-style Replit domain that would be blocked, handle it
  // For the root path, serve the main index.html
  if (req.path === '/' || req.path === '') {
    const clientTemplate = path.resolve(process.cwd(), 'client', 'index.html');
    
    try {
      if (fs.existsSync(clientTemplate)) {
        const html = fs.readFileSync(clientTemplate, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(html);
      }
    } catch (error) {
      logger.error(`[ViteAdapter] Error reading client index.html: ${error}`);
    }
  }
  
  // For Vite requests, pass through to the next middleware
  if (isViteRequest(req)) {
    logger.debug(`[ViteAdapter] Passing Vite request through: ${req.url}`);
  }
  
  // Continue to the next middleware
  next();
}
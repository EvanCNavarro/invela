/**
 * Replit Preview Handler
 * 
 * This module provides special handling for Replit preview domains, particularly
 * for UUID-style preview domains which encounter Vite host validation issues.
 * Instead of trying to fix Vite's configuration (which we can't modify directly),
 * this module detects Replit preview requests and serves a special HTML page
 * that redirects users to the main workspace domain.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger.js';
import fs from 'fs';
import path from 'path';

// Detect if a request is coming from a Replit preview domain (UUID-style)
export function isReplitUuidPreviewDomain(req: Request): boolean {
  const host = req.headers.host || '';
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*picard\.replit\.dev/.test(host);
}

// Middleware to handle Replit preview domains
export function setupReplitPreviewHandler(app: any) {
  // Add special middleware at the beginning of the stack for UUID-style domains
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isPreviewDomain = isReplitUuidPreviewDomain(req);
    
    if (isPreviewDomain) {
      logger.info(`[ReplitPreview] Detected Replit UUID preview domain: ${req.headers.host}`);
      
      // For root path requests to UUID-style domains, serve our special redirect page
      if (req.path === '/' || req.path === '') {
        const previewFixPath = path.join(process.cwd(), 'client/public/preview-fix.html');
        
        if (fs.existsSync(previewFixPath)) {
          logger.info(`[ReplitPreview] Serving preview-fix.html to redirect the user`);
          return res.sendFile(previewFixPath);
        } else {
          logger.error(`[ReplitPreview] Missing preview-fix.html file at ${previewFixPath}`);
          // If the file doesn't exist, just set headers and continue
        }
      }
      
      // Set special headers to try to bypass validation issues
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    
    next();
  });
  
  logger.info('[ReplitPreview] Setting up minimal preview environment support');
  return true;
}

// Setup endpoints to help with debugging preview issues
export function setupPreviewApiEndpoints(app: any) {
  // Add a test endpoint to verify middleware is working
  app.get('/api/preview-test', (req: Request, res: Response) => {
    res.json({
      host: req.headers.host,
      isPreviewDomain: isReplitUuidPreviewDomain(req),
      message: 'Preview API endpoint is working'
    });
  });
  
  return true;
}
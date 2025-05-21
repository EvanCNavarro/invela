/**
 * Direct Replit Preview Handler
 * 
 * This module provides a simple way to handle requests from Replit UUID-style preview domains.
 * It serves a special HTML page that redirects these requests to the main workspace domain.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Detect if a request is from a Replit UUID-style preview domain
 */
export function isUuidPreviewDomain(req: Request): boolean {
  const host = req.headers.host || '';
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*picard\.replit\.dev/.test(host);
}

/**
 * Middleware to handle Replit preview domains
 */
export function setupDirectPreviewHandler(app: any) {
  // Register an early middleware that intercepts all requests from UUID preview domains
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Check if it's a UUID preview domain
    if (isUuidPreviewDomain(req)) {
      // Get the host domain so we can customize our redirection
      const host = req.headers.host || '';
      logger.debug(`[PreviewRedirect] Request from blocked UUID preview domain: ${host}`);
      
      // Only handle GET requests to root and HTML paths
      if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'))) {
        // Send a simple HTML page with JavaScript that redirects to the main workspace domain
        const mainDomain = 'workspace.EvanCNavarro.repl.co';
        const html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redirecting to Invela...</title>
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
              h1 { color: #333; }
              .loader { display: inline-block; width: 50px; height: 50px; border: 3px solid #f3f3f3; 
                       border-radius: 50%; border-top: 3px solid #3498db; animation: spin 1s linear infinite; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .container { max-width: 600px; margin: 0 auto; }
              .message { margin: 2rem 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Redirecting to Invela Platform</h1>
              <div class="loader"></div>
              <div class="message">
                <p>This Replit preview domain (${host}) cannot load the app directly due to Vite host validation.</p>
                <p>You will be redirected to the main workspace domain in a moment...</p>
                <p>If you are not redirected, <a href="https://${mainDomain}${req.url}" id="redirect-link">click here</a>.</p>
              </div>
            </div>
            <script>
              // Redirect after a short delay
              setTimeout(() => {
                window.location.href = "https://${mainDomain}${req.url}";
              }, 1500);
            </script>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
    }
    
    // Continue with normal request processing for non-preview domains
    next();
  });
  
  logger.info('[DirectPreviewHandler] Successfully set up preview domain handler');
  return true;
}
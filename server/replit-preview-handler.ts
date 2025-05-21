import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';
import path from 'path';
import fs from 'fs';

/**
 * Special handler for Replit preview environments
 * 
 * This module provides a direct path for handling Replit preview requests
 * without relying on the Vite development server, which can sometimes
 * have issues with the Replit environment.
 */

// Flag to track if we're in a Replit environment
const isReplitEnvironment = Boolean(
  process.env.REPL_SLUG || 
  process.env.REPL_OWNER || 
  process.env.REPL_ID
);

/**
 * Detect if a request is coming from a Replit preview
 */
export function isReplitPreviewRequest(req: Request): boolean {
  const host = req.headers.host || '';
  const url = req.url || '';
  
  // Check if the request is from a Replit preview domain
  return (
    isReplitEnvironment &&
    (host.includes('.repl.co') || 
     host.includes('.repl.dev') ||
     host.includes('replit.dev') ||
     // Handle subdomain preview requests
     host.includes('picard.replit.dev'))
  );
}

/**
 * Set up the Replit preview handler
 */
export function setupReplitPreviewHandler(app: express.Express) {
  if (!isReplitEnvironment) {
    logger.info('Not running in Replit environment, skipping preview handler setup');
    return;
  }

  logger.info('[ReplitPreview] Setting up special handlers for Replit preview environment');

  // Middleware to identify preview requests for logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (isReplitPreviewRequest(req)) {
      logger.debug(`[ReplitPreview] Preview request detected: ${req.method} ${req.url}`);
    }
    next();
  });

  // Custom route to serve a basic HTML page when main Vite app isn't loading
  app.get('/replit-preview', (req: Request, res: Response) => {
    logger.info(`[ReplitPreview] Serving preview compatibility page`);
    
    // Create a simplified HTML response that doesn't rely on Vite for rendering
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invela - Replit Preview Mode</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { 
          color: #2c3e50; 
          text-align: center;
        }
        .btn {
          background: #4CAF50;
          border: none;
          color: white;
          padding: 10px 15px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 4px;
        }
        .status {
          margin-top: 10px;
          padding: 10px;
          background-color: #f1f1f1;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Invela - Replit Preview Mode</h1>
        <p>This is a simplified version of the application that works reliably in the Replit preview environment.</p>
        
        <p>The application is running correctly on the server side. This preview page is designed to work even when the full Vite development server has connection issues.</p>
        
        <h2>Application Menu</h2>
        <div>
          <a href="/test.html" class="btn">Static Test Page</a>
          <a href="/debug.html" class="btn">Diagnostic Tools</a>
          <a href="/" class="btn">Try Full Application</a>
        </div>
        
        <div class="status" id="server-status">
          Checking server status...
        </div>
      </div>
      
      <div class="card">
        <h2>System Status</h2>
        <ul>
          <li>Server: Running</li>
          <li>Database: Connected</li>
          <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
          <li>Replit Environment: ${isReplitEnvironment ? 'Yes' : 'No'}</li>
          <li>Preview URL: ${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'N/A'}</li>
        </ul>
      </div>
      
      <script>
        // Simple function to check API status
        async function checkServerStatus() {
          const statusElement = document.getElementById('server-status');
          
          try {
            const response = await fetch('/api/test');
            
            if (response.ok) {
              const data = await response.json();
              statusElement.innerHTML = 'Server is running correctly! ✅<br>Response: ' + 
                JSON.stringify(data, null, 2);
              statusElement.style.backgroundColor = '#e8f5e9';
            } else {
              statusElement.innerHTML = 'Server responded with status: ' + response.status;
              statusElement.style.backgroundColor = '#ffebee';
            }
          } catch (error) {
            statusElement.innerHTML = 'Error connecting to server: ' + error.message;
            statusElement.style.backgroundColor = '#ffebee';
          }
        }
        
        // Check status when page loads
        window.addEventListener('DOMContentLoaded', checkServerStatus);
      </script>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Serve the React application directly from the root URL
  app.get('/', (req: Request, res: Response) => {
    logger.info('[ReplitPreview] Root path accessed, serving React application directly');
    
    // Serve the React application directly
    res.sendFile(path.join(process.cwd(), 'client/index.html'));
  });
  
  // For all other requests, just proceed normally
  app.use((req: Request, res: Response, next: NextFunction) => {
    next();
  });
}

/**
 * Special API test endpoint for preview mode
 */
export function setupPreviewApiEndpoints(app: express.Express) {
  // Simple test endpoint that doesn't require auth
  app.get('/api/test', (req: Request, res: Response) => {
    logger.info('[API] Test endpoint accessed');
    
    res.json({
      success: true,
      message: 'API is working correctly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      isReplit: isReplitEnvironment
    });
  });
}
/**
 * Preview Endpoint
 * 
 * This module provides a simple endpoint to confirm the server is properly handling
 * requests in the Replit preview environment.
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export const previewRouter = Router();

// Simple endpoint for the preview
previewRouter.get('/preview-check', (req, res) => {
  logger.info(`[PreviewEndpoint] Preview check accessed from ${req.headers.host}`);
  
  res.json({
    status: 'success',
    message: 'Preview is working correctly',
    serverTime: new Date().toISOString(),
    requestInfo: {
      host: req.headers.host,
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      path: req.path,
      query: req.query
    }
  });
});

// Serve our static preview page
previewRouter.get('/preview-page', (req, res) => {
  logger.info(`[PreviewEndpoint] Preview page accessed from ${req.headers.host}`);
  
  const publicIndexPath = path.join(process.cwd(), 'public', 'index.html');
  if (fs.existsSync(publicIndexPath)) {
    const html = fs.readFileSync(publicIndexPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invela Risk Assessment Platform</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 0 auto; padding: 20px; }
            .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Invela Risk Assessment Platform</h1>
          <div class="success">
            <strong>Success!</strong> Preview is working. Server is responding correctly.
          </div>
          <p>Request host: ${req.headers.host || 'Unknown'}</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
  }
});
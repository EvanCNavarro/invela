import express from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger';

/**
 * Creates a simple Express app that serves a static HTML file
 * This is designed to be a standalone minimal server just for the preview
 */
export function createSimplePreviewApp() {
  const app = express();
  
  // Root handler
  app.get('*', (req, res) => {
    logger.info(`[SimplePreview] Request to ${req.url} from ${req.headers.host}`);
    
    try {
      // Serve either the working.html from public or the root index.html
      const workingHtmlPath = path.join(process.cwd(), 'public', 'working.html');
      const rootIndexPath = path.join(process.cwd(), 'index.html');
      
      if (fs.existsSync(workingHtmlPath)) {
        logger.info(`[SimplePreview] Serving working.html for preview`);
        const html = fs.readFileSync(workingHtmlPath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.send(html);
      } else if (fs.existsSync(rootIndexPath)) {
        logger.info(`[SimplePreview] Serving root index.html for preview`);
        const html = fs.readFileSync(rootIndexPath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.send(html);
      } else {
        // Fallback to a very simple HTML response
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invela - Preview Working</title>
              <style>
                body { font-family: system-ui; max-width: 600px; margin: 0 auto; padding: 20px; }
                .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; }
              </style>
            </head>
            <body>
              <h1>Invela Risk Assessment Platform</h1>
              <div class="success">
                <strong>Success!</strong> Preview is working. Server is responding.
              </div>
              <p>Request path: ${req.url}</p>
              <p>Host: ${req.headers.host}</p>
              <p>Time: ${new Date().toLocaleString()}</p>
            </body>
          </html>
        `);
      }
    } catch (err) {
      logger.error(`[SimplePreview] Error serving preview:`, err);
      return res.status(500).send('Error serving preview content');
    }
  });
  
  return app;
}
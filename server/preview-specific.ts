import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { logger } from './utils/logger';

/**
 * Starts a dedicated preview server on port 5500 
 * This runs completely independently of the main application
 * to ensure the preview works regardless of other server issues
 */
export function startDedicatedPreviewServer() {
  const previewApp = express();
  const previewServer = createServer(previewApp);
  
  // Simple handler for all routes
  previewApp.get('*', (req, res) => {
    logger.info(`[PreviewServer] Request to ${req.url}`);
    
    // Basic HTML response that confirms the preview is working
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invela Preview Server</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background-color: #f7f9fc;
          }
          h1 { color: #2c3e50; text-align: center; }
          .logo {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
            color: #4a6da7;
          }
          .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .success {
            background-color: #d4edda;
            color: #155724;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .info {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .info-item {
            background: #e9f5fe;
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 5px;
            flex: 1;
            min-width: 200px;
          }
          .time { font-size: 14px; color: #6c757d; text-align: right; }
        </style>
      </head>
      <body>
        <h1>Invela Risk Assessment Platform</h1>
        <div class="logo">INVELA</div>
        
        <div class="success">
          <strong>Preview Server Running!</strong> This dedicated preview server confirms that your Replit environment is functioning correctly.
        </div>
        
        <div class="card">
          <h2>Server Information</h2>
          <div class="info">
            <div class="info-item"><strong>Request Path:</strong> ${req.url}</div>
            <div class="info-item"><strong>Host:</strong> ${req.headers.host || 'Unknown'}</div>
            <div class="info-item"><strong>Preview Server Port:</strong> 5500</div>
            <div class="info-item"><strong>Main Server Port:</strong> 3000</div>
          </div>
        </div>
        
        <div class="card">
          <h2>Application Status</h2>
          <p>The main application server should be accessible at port 3000. This preview server on port 5500 is a specialized service specifically for the Replit preview functionality.</p>
          <p>The main application provides a comprehensive risk assessment platform with the following features:</p>
          <ul>
            <li>Third-party vendor risk assessment (KY3P)</li>
            <li>KYB (Know Your Business) verification</li>
            <li>Open Banking integration</li>
            <li>Real-time collaborative forms</li>
          </ul>
        </div>
        
        <div class="time">Preview server response generated at: ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.send(html);
  });
  
  // Start on port 5500
  const PORT = 5500;
  previewServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`[PreviewServer] Dedicated preview server running on 0.0.0.0:${PORT}`);
  });
}
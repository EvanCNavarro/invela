/**
 * ========================================
 * Storybook Subdomain Proxy Configuration
 * ========================================
 * 
 * Express middleware to handle Storybook subdomain routing
 * and serve the built Storybook files when accessed via subdomain.
 * 
 * @module server/storybook-proxy
 * @version 1.0.0
 * @since 2025-05-23
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create middleware to handle Storybook subdomain requests
 * 
 * @param app Express application instance
 */
export function setupStorybookProxy(app: express.Application) {
  // Middleware to detect Storybook subdomain
  app.use((req, res, next) => {
    const host = req.get('host') || '';
    const isStorybookSubdomain = host.startsWith('storybook.');
    
    if (isStorybookSubdomain) {
      // Serve Storybook static files
      const storybookPath = path.join(__dirname, '..', 'storybook-static');
      
      // Check if it's the root Storybook request
      if (req.path === '/' || req.path === '/index.html') {
        return res.sendFile(path.join(storybookPath, 'index.html'));
      }
      
      // Serve static assets
      express.static(storybookPath)(req, res, (err) => {
        if (err) {
          // If file not found in Storybook, serve index.html for SPA routing
          res.sendFile(path.join(storybookPath, 'index.html'));
        }
      });
    } else {
      next();
    }
  });
  
  // Development route for Storybook (when not using subdomain)
  if (process.env.NODE_ENV === 'development') {
    app.get('/storybook', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Design System</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              padding: 2rem;
              max-width: 600px;
              margin: 0 auto;
              line-height: 1.6;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 1.5rem;
              margin: 1rem 0;
            }
            .button {
              background: #2563eb;
              color: white;
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 6px;
              text-decoration: none;
              display: inline-block;
              margin: 0.5rem 0;
            }
            .code {
              background: #f1f5f9;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <h1>🎨 Design System Access</h1>
          
          <div class="card">
            <h2>Development Mode</h2>
            <p>Start the Storybook development server:</p>
            <code class="code">npm run storybook</code>
            <br><br>
            <a href="http://localhost:6006" class="button">Open Storybook (localhost:6006)</a>
          </div>
          
          <div class="card">
            <h2>Production Subdomain</h2>
            <p>Once deployed, your design system will be available at:</p>
            <code class="code">https://storybook.your-domain.replit.app</code>
            <br><br>
            <p>To build for deployment:</p>
            <code class="code">npm run storybook:deploy</code>
          </div>
          
          <div class="card">
            <h2>Component Library</h2>
            <p>Explore our comprehensive component documentation including:</p>
            <ul>
              <li>Enhanced Table with sorting and selection</li>
              <li>Button variants and states</li>
              <li>Form inputs with validation</li>
              <li>Design system guidelines</li>
            </ul>
          </div>
        </body>
        </html>
      `);
    });
  }
}

/**
 * Enhanced Logger for Storybook Operations
 */
export const storybookLogger = {
  info: (message: string, data?: any) => {
    console.log(`%c[Storybook Proxy] ${message}`, 'color: #2563eb; font-weight: bold;', data || '');
  },
  error: (message: string, data?: any) => {
    console.error(`%c[Storybook Proxy] ${message}`, 'color: #dc2626; font-weight: bold;', data || '');
  }
};
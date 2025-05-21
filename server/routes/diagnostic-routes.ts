import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

export const diagnosticRouter = Router();

// Simple diagnostic endpoint that doesn't require auth
diagnosticRouter.get('/preview/', (req: Request, res: Response) => {
  // Log diagnostic information about the request
  logger.info(`[Diagnostic] Preview page accessed: ${req.url}`);
  logger.info(`[Diagnostic] Headers: ${JSON.stringify(req.headers)}`);
  
  // Create a simple HTML response with diagnostic information
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Application Diagnostic Page</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 { color: #2c3e50; }
        .card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status-ok { color: #28a745; }
        .status-error { color: #dc3545; }
        pre {
          background: #f1f1f1;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }
        .test-btn {
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
      </style>
    </head>
    <body>
      <h1>Application Diagnostic Page</h1>
      
      <div class="card">
        <h2>Environment Information</h2>
        <ul>
          <li>Node Environment: ${process.env.NODE_ENV || 'Not set'}</li>
          <li>Port: ${process.env.PORT || 'Not set'}</li>
          <li>Host: ${req.headers.host || 'Not available'}</li>
          <li>Origin: ${req.headers.origin || 'Not available'}</li>
          <li>User Agent: ${req.headers['user-agent'] || 'Not available'}</li>
          <li>Replit Specific:
            <ul>
              <li>REPL_SLUG: ${process.env.REPL_SLUG || 'Not set'}</li>
              <li>REPL_OWNER: ${process.env.REPL_OWNER || 'Not set'}</li>
              <li>REPL_ID: ${process.env.REPL_ID || 'Not set'}</li>
            </ul>
          </li>
        </ul>
      </div>
      
      <div class="card">
        <h2>Request Information</h2>
        <pre>${JSON.stringify({
          method: req.method,
          url: req.url,
          originalUrl: req.originalUrl,
          protocol: req.protocol,
          secure: req.secure,
          ip: req.ip,
        }, null, 2)}</pre>
      </div>
      
      <div class="card">
        <h2>API Test</h2>
        <button class="test-btn" id="testApiBtn">Test API Connection</button>
        <div id="apiResult"></div>
      </div>
      
      <div class="card">
        <h2>Next Steps</h2>
        <p>Try these links to test functionality:</p>
        <ul>
          <li><a href="/">Home Page</a></li>
          <li><a href="/api/test">API Test Endpoint</a></li>
        </ul>
      </div>
      
      <script>
        document.getElementById('testApiBtn').addEventListener('click', async () => {
          const resultEl = document.getElementById('apiResult');
          resultEl.innerHTML = 'Testing API connection...';
          
          try {
            const response = await fetch('/api/test', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            const data = await response.json();
            resultEl.innerHTML = '<pre class="status-ok">' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            resultEl.innerHTML = '<pre class="status-error">Error: ' + error.message + '</pre>';
          }
        });
      </script>
    </body>
    </html>
  `;
  
  res.set('Content-Type', 'text/html');
  res.send(html);
});

// API test endpoint
diagnosticRouter.get('/api/test', (req: Request, res: Response) => {
  logger.info('[Diagnostic] Test API endpoint accessed');
  
  res.json({
    success: true,
    message: 'API is working properly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple test page 
diagnosticRouter.get('/test-page', (req: Request, res: Response) => {
  logger.info('[TestEndpoint] Test page accessed');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Page</title>
    </head>
    <body>
      <h1>Test Page Working!</h1>
      <p>The application is running correctly.</p>
      <p>Current time: ${new Date().toLocaleString()}</p>
    </body>
    </html>
  `);
});
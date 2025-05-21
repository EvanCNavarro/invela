import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Simple test route that returns a JSON response
router.get('/api/test', (req, res) => {
  logger.info('[TestRoute] Test API endpoint accessed');
  res.json({ 
    status: 'success', 
    message: 'Server is running correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Plain HTML endpoint for testing without Vite frontend
router.get('/test-page', (req, res) => {
  logger.info('[TestRoute] Test page accessed');
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Server Test</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .success { color: green; }
          .timestamp { color: gray; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>Server Test Page</h1>
        <p class="success">✅ If you can see this, the Express server is running correctly!</p>
        <p class="timestamp">Timestamp: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

export default router;
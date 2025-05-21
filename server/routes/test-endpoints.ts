import { Router } from 'express';
import { logger } from '../utils/logger';
import { db } from '@db';
import { sql } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

const router = Router();

// Simple test endpoint that returns a JSON response
router.get('/api/test', (req, res) => {
  logger.info('[TestEndpoint] Test API endpoint accessed');
  res.json({ 
    status: 'success', 
    message: 'Server is running correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database test endpoint to verify database connectivity
router.get('/api/test-database', async (req, res) => {
  logger.info('[TestEndpoint] Database test endpoint accessed');
  try {
    // Simple query to check if database is accessible
    const result = await db.execute(sql`SELECT NOW() as server_time`);
    res.json({
      status: 'success',
      message: 'Database connection is working',
      timestamp: new Date().toISOString(),
      server_time: result?.[0]?.server_time || 'unknown'
    });
  } catch (error) {
    logger.error('[TestEndpoint] Database test failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Simple HTML test page
router.get('/test-page', (req, res) => {
  logger.info('[TestEndpoint] Test page accessed');
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
        <p>Server is running in <strong>${process.env.NODE_ENV || 'development'}</strong> mode.</p>
        <p>Go to <a href="/preview/">Diagnostics Page</a> for more tests.</p>
      </body>
    </html>
  `);
});

// Direct working preview page - specially designed to work in Replit preview
router.get('/working-preview', (req, res) => {
  logger.info('[PreviewEndpoint] Working preview page accessed');
  try {
    const previewHtml = fs.readFileSync(path.join(process.cwd(), 'public', 'working-preview.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(previewHtml);
  } catch (err) {
    logger.error('[PreviewEndpoint] Error reading working-preview.html:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invela Preview</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .error { color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Invela Platform</h1>
          <p class="error">Could not load preview page. Server is running but encountered an error.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>Mode: ${process.env.NODE_ENV || 'development'}</p>
          <p>Try accessing <a href="/api/test">/api/test</a> to check API functionality.</p>
        </body>
      </html>
    `);
  }
});

export default router;
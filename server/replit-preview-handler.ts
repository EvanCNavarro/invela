import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';

/**
 * Special handler for Replit preview environments
 * 
 * This module provides compatibility for Replit preview requests
 * to ensure the application works properly in the Replit environment.
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

  logger.info('[ReplitPreview] Setting up minimal preview environment support');

  // Just add debug logging for preview requests
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (isReplitPreviewRequest(req)) {
      logger.debug(`[ReplitPreview] Preview request detected: ${req.method} ${req.url}`);
    }
    next();
  });
  
  // No special handling - let the Vite development server handle all routing
  // This ensures the React application with all its routes works properly
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
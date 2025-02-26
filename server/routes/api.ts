/**
 * Main API Routes - Centralizes all API route definitions
 * 
 * This file imports and combines all API route modules, making them available
 * under the /api endpoint. It demonstrates proper modularization and organization
 * of Express routes in a TypeScript environment.
 * 
 * Best practices implemented:
 * 1. Modular route organization
 * 2. Comprehensive error handling
 * 3. Detailed logging
 * 4. Type safety with TypeScript
 */

import express, { Request, Response, NextFunction } from 'express';
import exampleRoutes from './example';

// Create main router
const router = express.Router();

// Server info endpoint
router.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'API Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Mount example routes
router.use('/example', exampleRoutes);

// Fallback for undefined routes
router.use('*', (req: Request, res: Response) => {
  console.warn(`[API] Undefined route accessed: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// API-specific error handler
router.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  console.error('[API] Error in API routes:', err);
  
  // If headers have already been sent, let the default error handler deal with it
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    status: 'error',
    message: 'An error occurred while processing your request',
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

export default router; 
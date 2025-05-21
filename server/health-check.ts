/**
 * Health Check Module
 * 
 * This module provides a health check endpoint that returns 200 OK
 * which is essential for Replit's deployment health checks.
 */

import { Router } from 'express';

/**
 * Creates a router with health check endpoints
 * @returns Express Router with health check endpoints
 */
export function createHealthCheckRouter() {
  const router = Router();
  
  // Root path handler for Replit health checks
  router.get('/', (req, res) => {
    console.log('[HealthCheck] Received health check request');
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      message: 'Invela Platform is running'
    });
  });
  
  // Dedicated health check endpoint (useful for specific checks)
  router.get('/health', (req, res) => {
    console.log('[HealthCheck] Received health check request on /health');
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      message: 'Invela Platform is running'
    });
  });
  
  return router;
}
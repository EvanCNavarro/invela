/**
 * Deployment Configuration Helper
 * 
 * This module provides optimized configuration for production deployments,
 * ensuring the application works properly with Replit Autoscale.
 */

import { Server } from 'http';
import { logger } from './utils/logger';

/**
 * Configure server for proper deployment
 * 
 * @param server HTTP server instance
 * @param isProduction Whether we're in production mode
 */
export function configureForDeployment(server: Server, isProduction: boolean): void {
  const HOST = process.env.HOST || '0.0.0.0';
  const PORT = parseInt(process.env.PORT || '8080', 10);
  
  if (isProduction) {
    // PRODUCTION MODE: Only use port 8080 for deployment
    logger.info('[Deployment] Production mode detected - Using single-port configuration (8080 only)');
    
    // Close any existing listeners to ensure we only use port 8080
    server.close(() => {
      logger.info('[Deployment] Closed any existing listeners');
      
      // Listen only on port 8080 for Autoscale compatibility
      server.listen(PORT, HOST, () => {
        logger.info(`[Deployment] Production server running on ${HOST}:${PORT} (Autoscale compatible)`);
        logger.info(`[Deployment] Environment: production`);
      });
    });
    
    return;
  }
  
  // For development mode, we don't need to do anything special
  // The dual port configuration is handled in server/index.ts
  logger.info('[Deployment] Development mode - no special configuration applied');
}

/**
 * Check and adjust production environment
 * 
 * @returns Whether the current environment is production
 */
export function checkProductionEnvironment(): boolean {
  // Check if we're running in production mode
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    logger.info('[Deployment] Production environment detected');
    
    // Set expected environment variables for production
    if (!process.env.PORT) {
      process.env.PORT = '8080';
      logger.info('[Deployment] Setting default PORT=8080 for production');
    }
  }
  
  return isProduction;
}

/**
 * Optimize the application for production deployment
 */
export function optimizeForDeployment(): void {
  // Disable development-only features in production
  if (process.env.NODE_ENV === 'production') {
    logger.info('[Deployment] Optimizing application for production deployment');
    
    // Disable unnecessary file system operations
    process.env.DISABLE_FS_OPERATIONS = 'true';
    
    // Reduce logging verbosity
    process.env.LOG_LEVEL = 'info';
    
    // Force WebSocket to only use port 8080
    process.env.WS_PORT = '8080';
  }
}
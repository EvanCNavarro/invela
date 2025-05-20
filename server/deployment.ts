/**
 * Deployment Configuration
 *
 * This module provides deployment-specific configuration for Replit Autoscale
 */

import { logger } from './utils/logger';

/**
 * Configure the server for deployment
 */
export function configureForDeployment(): void {
  // Always use port 8080 for deployment
  process.env.PORT = '8080';
  
  // Set production mode
  process.env.NODE_ENV = 'production';
  
  // Log deployment configuration
  logger.info('===========================================');
  logger.info('🚀 DEPLOYMENT CONFIGURATION ACTIVATED');
  logger.info('===========================================');
  logger.info(`- PORT: ${process.env.PORT} (Autoscale standard)`);
  logger.info(`- NODE_ENV: ${process.env.NODE_ENV}`);
  logger.info(`- HOST: 0.0.0.0 (required for Autoscale)`);
  logger.info('===========================================');
}

/**
 * Override port configuration for Autoscale
 * 
 * @param requestedPort The port requested by the application code
 * @returns Always port 8080 for deployment
 */
export function getDeploymentPort(requestedPort: number): number {
  // In deployment, only use port 8080, regardless of what's requested
  if (process.env.NODE_ENV === 'production') {
    if (requestedPort !== 8080) {
      logger.warn(`Requested port ${requestedPort} overridden to 8080 for Autoscale compatibility`);
    }
    return 8080;
  }
  
  // In development, use the requested port
  return requestedPort;
}

/**
 * Check if the application is running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
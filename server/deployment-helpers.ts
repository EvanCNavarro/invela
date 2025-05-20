/**
 * Deployment Helpers
 * 
 * Utilities for configuring the server for deployment on Replit Autoscale
 */

import { logger } from './utils/logger';

/**
 * Get the deployment port
 * 
 * In production, always returns 8080 for Autoscale compatibility
 * 
 * @returns Port number to use
 */
export function getDeploymentPort(): number {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, always use port 8080 for Autoscale
    return 8080;
  }
  
  // In development, use environment variable or default
  return parseInt(process.env.PORT || '8080', 10);
}

/**
 * Get the deployment host
 * 
 * @returns Host to bind to
 */
export function getDeploymentHost(): string {
  return process.env.HOST || '0.0.0.0';
}

/**
 * Log deployment configuration information
 * 
 * @param port Port being used
 * @param host Host being used
 */
export function logDeploymentInfo(port: number, host: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  logger.info(`Deployment configuration:`);
  logger.info(`- Environment: ${isProduction ? 'production' : 'development'}`);
  logger.info(`- Port: ${port}`);
  logger.info(`- Host: ${host}`);
  logger.info(`- Node version: ${process.version}`);
  
  if (isProduction) {
    logger.info('Production mode: Using optimized deployment configuration');
  } else {
    logger.info('Development mode: Using development configuration');
  }
}
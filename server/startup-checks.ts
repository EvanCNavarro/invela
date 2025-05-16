/**
 * Application Startup Health Checks
 * 
 * This module provides health checks that run at application startup
 * to verify that required dependencies and services are functioning correctly.
 */

import { Logger } from './services/db-connection-service';
import { checkDatabaseConnection } from './services/db-connection-service';

const logger = new Logger('StartupChecks');

/**
 * Performs a database connectivity check
 * Retries several times before failing
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError: unknown;

  while (retryCount < maxRetries) {
    try {
      logger.log(`Database health check attempt ${retryCount + 1}/${maxRetries}`);
      await checkDatabaseConnection();
      logger.log('Database health check passed');
      return true;
    } catch (error) {
      lastError = error;
      retryCount++;
      
      if (retryCount < maxRetries) {
        const delay = 3000 * retryCount; // Increasing delay with each retry
        logger.warn(`Database health check failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('Database health check failed after multiple attempts', lastError);
  return false;
}

/**
 * Run all startup health checks
 * Returns true if all checks pass, false otherwise
 */
export async function runStartupChecks(): Promise<boolean> {
  logger.log('Running application startup health checks...');
  
  try {
    // Check database connectivity
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      logger.error('Database health check failed. Application may not function correctly.');
      return false;
    }
    
    // Additional health checks could be added here in the future
    
    logger.log('All startup health checks passed!');
    return true;
  } catch (error) {
    logger.error('Error running startup health checks', error);
    return false;
  }
}
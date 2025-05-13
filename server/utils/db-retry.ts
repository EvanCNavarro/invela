/**
 * Database Retry Utility
 * 
 * This utility provides a way to retry database operations when they fail
 * due to connection issues, with exponential backoff.
 */

import { Logger } from '../services/logger';

const logger = new Logger('DBRetry');

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  operation?: string;
}

/**
 * Execute a database operation with retry capabilities
 * 
 * @param operation Function to execute
 * @param options Retry options
 * @returns Result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 500,
    operation: operationName = 'database operation'
  } = options;
  
  let retryCount = 0;
  let lastError: Error | null = null;
  
  while (retryCount <= maxRetries) {
    try {
      const result = await operation();
      
      if (retryCount > 0) {
        // Log success after retries
        logger.info(`Successfully completed ${operationName} after ${retryCount} retries`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryCount++;
      
      if (retryCount <= maxRetries) {
        // Calculate backoff delay with jitter
        const delay = Math.floor(
          baseDelay * Math.pow(2, retryCount - 1) * (1 + Math.random() * 0.1)
        );
        
        logger.warn(
          `Retry attempt ${retryCount}/${maxRetries} for ${operationName} after ${delay}ms delay: ${lastError.message}`
        );
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Max retries reached
        logger.error(
          `Failed ${operationName} after ${maxRetries} retry attempts: ${lastError.message}`,
          lastError
        );
        throw lastError;
      }
    }
  }
  
  // This should never happen, but TypeScript needs it
  throw lastError || new Error(`Unknown error in ${operationName}`);
}

/**
 * Check if an error is a database connection error
 * 
 * @param error Error to check
 * @returns True if it's a connection error
 */
export function isConnectionError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  return (
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('socket') ||
    message.includes('unreachable')
  );
}

export default {
  withRetry,
  isConnectionError
};
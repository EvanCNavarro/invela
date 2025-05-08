/**
 * Transaction Manager
 * 
 * This module provides transaction management utilities for ensuring
 * database operations are performed atomically.
 */

import { db } from '@db';
import { logger } from '../utils/logger';
import { performance } from 'perf_hooks';

/**
 * Execute a function within a database transaction
 * 
 * This function provides a convenient way to wrap a series of database
 * operations in a transaction, ensuring they either all succeed or all fail.
 * 
 * @param callback Function to execute within the transaction
 * @returns The result of the callback function
 */
export async function withTransactionContext<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Execute the callback within the transaction
      return await callback(tx);
    });
    
    const elapsedMs = performance.now() - startTime;
    
    logger.info(`[TransactionManager] Transaction completed successfully`, {
      elapsedMs: Math.round(elapsedMs)
    });
    
    return result;
  } catch (error) {
    const elapsedMs = performance.now() - startTime;
    
    logger.error(`[TransactionManager] Transaction failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Math.round(elapsedMs)
    });
    
    throw error;
  }
}

/**
 * Execute a database operation with retry logic
 * 
 * This function attempts to execute a database operation and will
 * retry it if it fails due to transient errors.
 * 
 * @param operation Function to execute
 * @param options Retry options
 * @returns The result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 500,
    operationName = 'Database operation'
  } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        logger.info(`[TransactionManager] ${operationName} succeeded after ${attempt} attempts`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Only retry if we haven't exceeded max retries
      if (attempt < maxRetries) {
        logger.warn(`[TransactionManager] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying...`, {
          error: lastError.message,
          attempt,
          maxRetries,
          retryDelay
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        logger.error(`[TransactionManager] ${operationName} failed after ${maxRetries} attempts`, {
          error: lastError.message,
          stack: lastError.stack,
          attempts: maxRetries
        });
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}
/**
 * Transaction Manager Service
 * 
 * This module provides functions for managing database transactions to ensure atomic operations.
 * It ensures that form submissions either completely succeed or completely fail,
 * preventing inconsistent states like submitted forms with missing files.
 * 
 * @module transaction-manager
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
// Import the database connection
let db: { query: (sql: string, params?: any[]) => Promise<any>, connect: () => Promise<any> };

try {
  db = require('../db').db;
} catch (error) {
  console.error('Database module not found, creating a mock implementation');
  // Create a mock implementation for development/testing
  db = {
    query: async () => ({ rows: [] }),
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {}
    })
  };
}

// Add namespace context to logs
const logContext = { service: 'TransactionManager' };

/**
 * Options for transaction execution
 */
interface TransactionOptions {
  /** Maximum number of retries for a transaction */
  maxRetries?: number;
  /** Initial delay in milliseconds between retries */
  initialRetryDelay?: number;
  /** Multiplier for retry delay for each subsequent retry */
  retryBackoffMultiplier?: number;
  /** Callback for logging or handling retry attempts */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Default transaction options
 */
const defaultTransactionOptions: Required<TransactionOptions> = {
  maxRetries: 3,
  initialRetryDelay: 100, // 100ms
  retryBackoffMultiplier: 2,
  onRetry: (error, attempt) => {
    logger.warn(`Transaction retry attempt ${attempt}`, { error: error.message });
  }
};

/**
 * Execute a function within a database transaction
 * 
 * This function wraps the provided callback in a database transaction,
 * automatically handling commits, rollbacks, and retries in case of conflicts.
 * 
 * @param callback Function to execute within the transaction
 * @param options Transaction execution options
 * @returns The result of the callback function
 * @throws Any errors that occur during transaction execution (after retries)
 */
export async function withTransaction<T>(
  callback: (client: Pool) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  // Merge options with defaults
  const opts: Required<TransactionOptions> = { ...defaultTransactionOptions, ...options };
  
  // Get a client from the pool
  const client = await db.connect();
  
  try {
    let attempt = 0;
    let lastError: Error | null = null;
    
    // Try the transaction up to maxRetries times
    while (attempt <= opts.maxRetries) {
      try {
        // Start transaction
        await client.query('BEGIN');
        
        // Execute callback with transaction client
        const result = await callback(client as unknown as Pool);
        
        // Commit transaction
        await client.query('COMMIT');
        
        // Return result
        return result;
      } catch (error: any) {
        // Rollback transaction
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('Error rolling back transaction', { 
            originalError: error.message,
            rollbackError
          });
        }
        
        // Store last error
        lastError = error;
        
        // Check if we should retry
        if (attempt >= opts.maxRetries) {
          // No more retries
          break;
        }
        
        // Call retry callback
        opts.onRetry(error, attempt + 1);
        
        // Calculate delay with exponential backoff
        const delay = opts.initialRetryDelay * Math.pow(opts.retryBackoffMultiplier, attempt);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increment attempt counter
        attempt++;
      }
    }
    
    // If we get here, all retry attempts failed
    throw lastError || new Error('Transaction failed after retries');
  } finally {
    // Release client back to pool
    client.release();
  }
}

/**
 * Execute a database query with automatic retries
 * 
 * This function executes the provided query with automatic retries,
 * useful for non-transactional operations that still need retry logic.
 * 
 * @param queryFn Function that executes the query
 * @param options Retry options
 * @returns The result of the query
 * @throws Any errors that occur during query execution (after retries)
 */
export async function withRetry<T>(
  queryFn: () => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  // Merge options with defaults
  const opts: Required<TransactionOptions> = { ...defaultTransactionOptions, ...options };
  
  let attempt = 0;
  let lastError: Error | null = null;
  
  // Try the query up to maxRetries times
  while (attempt <= opts.maxRetries) {
    try {
      // Execute the query
      return await queryFn();
    } catch (error: any) {
      // Store last error
      lastError = error;
      
      // Check if we should retry
      if (attempt >= opts.maxRetries) {
        // No more retries
        break;
      }
      
      // Call retry callback
      opts.onRetry(error, attempt + 1);
      
      // Calculate delay with exponential backoff
      const delay = opts.initialRetryDelay * Math.pow(opts.retryBackoffMultiplier, attempt);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increment attempt counter
      attempt++;
    }
  }
  
  // If we get here, all retry attempts failed
  throw lastError || new Error('Query failed after retries');
}

export default {
  withTransaction,
  withRetry
};

/**
 * Transaction Manager Service
 * 
 * This service provides a standardized approach to working with database transactions,
 * ensuring consistent transaction handling across the application.
 * 
 * Features:
 * - Unified transaction management for all database operations
 * - Comprehensive logging for transaction lifecycle
 * - Proper error handling for transactions
 * - Utility methods for transaction-aware database operations
 */

import { PoolClient } from 'pg';
import { db, pool } from '@db';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { logger } from '../utils/logger';

const transactionLogger = logger.child({ module: 'TransactionManager' });

/**
 * Start a new database transaction
 * 
 * @returns A transaction client to be used for operations within the transaction
 */
export async function startTransaction(): Promise<PoolClient> {
  try {
    transactionLogger.debug('Starting new transaction');
    
    // Get a client from the pool
    const client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    transactionLogger.debug('Transaction started successfully');
    
    return client;
  } catch (error) {
    transactionLogger.error('Failed to start transaction', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
}

/**
 * Commit a database transaction
 * 
 * @param client The transaction client to commit
 */
export async function commitTransaction(client: PoolClient): Promise<void> {
  try {
    transactionLogger.debug('Committing transaction');
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Release client back to pool
    client.release();
    
    transactionLogger.debug('Transaction committed successfully');
  } catch (error) {
    transactionLogger.error('Failed to commit transaction', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Try to rollback on commit failure
    try {
      await client.query('ROLLBACK');
      client.release();
      transactionLogger.debug('Transaction rolled back after commit failure');
    } catch (rollbackError) {
      transactionLogger.error('Failed to rollback after commit failure', {
        error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        originalError: error instanceof Error ? error.message : String(error)
      });
      
      client.release(true); // Release with error
    }
    
    throw error;
  }
}

/**
 * Rollback a database transaction
 * 
 * @param client The transaction client to rollback
 */
export async function rollbackTransaction(client: PoolClient): Promise<void> {
  try {
    transactionLogger.debug('Rolling back transaction');
    
    // Rollback transaction
    await client.query('ROLLBACK');
    
    // Release client back to pool
    client.release();
    
    transactionLogger.debug('Transaction rolled back successfully');
  } catch (error) {
    transactionLogger.error('Failed to rollback transaction', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Force release client on rollback failure
    client.release(true);
    
    throw error;
  }
}

/**
 * Execute a database query within a transaction
 * 
 * @param client The transaction client to use
 * @param query The SQL query to execute
 * @param params The parameters for the query
 * @returns The query result
 */
export async function executeInTransaction(
  client: PoolClient,
  query: string,
  params: any[] = []
): Promise<any> {
  try {
    transactionLogger.debug('Executing query in transaction', {
      query,
      paramCount: params.length
    });
    
    const result = await client.query(query, params);
    
    transactionLogger.debug('Query executed successfully', {
      rowCount: result.rowCount
    });
    
    return result;
  } catch (error) {
    transactionLogger.error('Error executing query in transaction', {
      error: error instanceof Error ? error.message : String(error),
      query,
      paramCount: params.length,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
}

/**
 * Create a transaction-aware Drizzle instance
 * 
 * @param client The transaction client to use
 * @returns A Drizzle instance bound to the transaction
 */
export function withTransaction(client: PoolClient) {
  // Create Drizzle instance with the client as a custom pool-like object
  return drizzle({ client: client as any });
}

/**
 * Execute a function within a transaction and handle committing or rolling back
 * 
 * @param fn The function to execute within the transaction
 * @returns The result of the function
 */
export async function withTransactionContext<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  let client: PoolClient | null = null;
  
  try {
    // Start transaction with enhanced error capture
    try {
      client = await startTransaction();
    } catch (txStartError) {
      console.error('[Transaction Manager] Failed to start transaction', {
        error: txStartError instanceof Error ? txStartError.message : String(txStartError),
        stack: txStartError instanceof Error ? txStartError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Rethrow with more contextual information
      throw new Error(`Transaction initialization failed: ${txStartError instanceof Error ? txStartError.message : String(txStartError)}`);
    }
    
    // Execute function with the transaction client
    let result: T;
    try {
      result = await fn(client);
    } catch (fnError) {
      console.error('[Transaction Manager] Error during transaction execution', {
        error: fnError instanceof Error ? fnError.message : String(fnError),
        stack: fnError instanceof Error ? fnError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Rollback and rethrow with context
      if (client) {
        await rollbackTransaction(client);
      }
      throw fnError;
    }
    
    // Commit the transaction
    try {
      await commitTransaction(client);
    } catch (commitError) {
      console.error('[Transaction Manager] Failed to commit transaction', {
        error: commitError instanceof Error ? commitError.message : String(commitError),
        stack: commitError instanceof Error ? commitError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Rethrow with more contextual information
      throw new Error(`Transaction commit failed: ${commitError instanceof Error ? commitError.message : String(commitError)}`);
    }
    
    return result;
  } catch (error) {
    // If we have an active client but haven't properly rolled back or committed yet
    if (client) {
      try {
        await rollbackTransaction(client);
      } catch (rollbackError) {
        console.error('[Transaction Manager] Failed to rollback transaction during error handling', {
          originalError: error instanceof Error ? error.message : String(error),
          rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          timestamp: new Date().toISOString()
        });
      }
    }
    
    throw error;
  }
}
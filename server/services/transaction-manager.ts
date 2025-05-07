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
import { db } from '@db';
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
    const client = await db.runtime.client.connect();
    
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
  return drizzle(client);
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
  const client = await startTransaction();
  
  try {
    const result = await fn(client);
    await commitTransaction(client);
    return result;
  } catch (error) {
    await rollbackTransaction(client);
    throw error;
  }
}
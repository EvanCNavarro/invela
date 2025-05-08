/**
 * Transaction Manager Service - FIXED VERSION
 * 
 * This service provides a standardized approach to working with database transactions,
 * ensuring consistent transaction handling across the application.
 * 
 * Features:
 * - Unified transaction management for all database operations
 * - Comprehensive logging for transaction lifecycle
 * - Proper error handling for transactions
 * - Utility methods for transaction-aware database operations
 * - FIXED: Improved handling of aborted transactions
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
    
    // Add transaction metadata to the client for tracking purposes
    (client as any).__transactionStartTime = Date.now();
    (client as any).__transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Begin transaction with a unique comment for debugging
    await client.query(`BEGIN; -- Transaction ID: ${(client as any).__transactionId}`);
    
    console.log(`[Transaction Manager] ✅ Transaction ${(client as any).__transactionId} started successfully`);
    transactionLogger.debug('Transaction started successfully', {
      transactionId: (client as any).__transactionId,
      timestamp: new Date().toISOString()
    });
    
    return client;
  } catch (error) {
    transactionLogger.error('Failed to start transaction', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced console logging for immediate visibility
    console.error('[Transaction Manager] 🔴 TRANSACTION START FAILURE:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
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
    const transactionId = (client as any).__transactionId || 'unknown';
    const transactionDuration = (client as any).__transactionStartTime ? 
      `${(Date.now() - (client as any).__transactionStartTime)/1000}s` : 'unknown';
    
    console.log(`[Transaction Manager] 🔄 Committing transaction ${transactionId} (duration: ${transactionDuration})`);
    transactionLogger.debug('Committing transaction', {
      transactionId,
      duration: transactionDuration,
      timestamp: new Date().toISOString()
    });
    
    // Check if transaction is already aborted
    const isAborted = await isTransactionAborted(client);
    
    if (isAborted) {
      console.error(`[Transaction Manager] ❌ Cannot commit transaction ${transactionId} - transaction is aborted`);
      
      // Since the transaction is aborted, we can't commit it - we need to rollback
      await rollbackTransaction(client);
      
      // Throw an error to indicate that commit failed due to aborted transaction
      throw new Error(`Cannot commit aborted transaction ${transactionId}`);
    }
    
    // Commit transaction - only if it's not aborted
    await client.query('COMMIT');
    
    // Release client back to pool
    client.release();
    
    console.log(`[Transaction Manager] ✅ Transaction ${transactionId} committed successfully`);
    transactionLogger.debug('Transaction committed successfully', {
      transactionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const transactionId = (client as any).__transactionId || 'unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAbortedError = errorMessage.includes('transaction is aborted');
    
    // Only log as error if not an explicit aborted transaction check we did ourselves
    if (!isAbortedError || !errorMessage.includes('Cannot commit aborted transaction')) {
      transactionLogger.error('Failed to commit transaction', {
        transactionId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        isAborted: isAbortedError
      });
      
      console.error(`[Transaction Manager] 🔴 COMMIT FAILURE for transaction ${transactionId}:`, {
        error: errorMessage,
        isAborted: isAbortedError,
        timestamp: new Date().toISOString()
      });
    }
    
    // Try to rollback on commit failure, but only if we haven't already done so
    if (!errorMessage.includes('Cannot commit aborted transaction')) {
      try {
        console.log(`[Transaction Manager] 🔄 Rolling back transaction ${transactionId} after commit failure`);
        await client.query('ROLLBACK');
        client.release();
        transactionLogger.debug('Transaction rolled back after commit failure', {
          transactionId, 
          timestamp: new Date().toISOString()
        });
      } catch (rollbackError) {
        transactionLogger.error('Failed to rollback after commit failure', {
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          originalError: errorMessage,
          transactionId,
          timestamp: new Date().toISOString()
        });
        
        console.error(`[Transaction Manager] 🔴 ROLLBACK FAILURE after commit failure for transaction ${transactionId}:`, {
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          originalError: errorMessage,
          timestamp: new Date().toISOString()
        });
        
        client.release(true); // Release with error
      }
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
    const transactionId = (client as any).__transactionId || 'unknown';
    const transactionDuration = (client as any).__transactionStartTime ? 
      `${(Date.now() - (client as any).__transactionStartTime)/1000}s` : 'unknown';
    
    console.log(`[Transaction Manager] 🔄 Rolling back transaction ${transactionId} (duration: ${transactionDuration})`);
    transactionLogger.debug('Rolling back transaction', {
      transactionId,
      duration: transactionDuration,
      timestamp: new Date().toISOString()
    });
    
    // Check if transaction is already aborted
    const isAborted = await isTransactionAborted(client);
    
    if (isAborted) {
      console.warn(`[Transaction Manager] ⚠️ Transaction ${transactionId} is already aborted, using special rollback approach`);
      
      // For aborted transactions, we need to use a different approach:
      // 1. First try a regular rollback which might fail
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.warn(`[Transaction Manager] ⚠️ First rollback attempt failed for aborted transaction ${transactionId}, trying a second approach`, {
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
        });
        
        // 2. If the first rollback fails, try to reset the connection with a new transaction and rollback
        try {
          // This creates a new transaction and immediately rolls it back
          await client.query('BEGIN; ROLLBACK;');
          console.log(`[Transaction Manager] ✅ Successfully reset aborted transaction ${transactionId} with BEGIN/ROLLBACK sequence`);
        } catch (resetError) {
          console.error(`[Transaction Manager] 🔴 Failed to reset aborted transaction ${transactionId}`, {
            error: resetError instanceof Error ? resetError.message : String(resetError)
          });
        }
      }
    } else {
      // Normal rollback for non-aborted transactions
      await client.query('ROLLBACK');
    }
    
    // Release client back to pool - with error flag true if we detected an aborted transaction
    client.release(isAborted);
    
    console.log(`[Transaction Manager] ✅ Transaction ${transactionId} rolled back successfully ${isAborted ? '(after abort)' : ''}`);
    transactionLogger.debug('Transaction rolled back successfully', {
      transactionId,
      wasAborted: isAborted,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const transactionId = (client as any).__transactionId || 'unknown';
    
    transactionLogger.error('Failed to rollback transaction', {
      transactionId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      isAborted: error instanceof Error && error.message.includes('transaction is aborted')
    });
    
    // Add enhanced console error for immediate visibility
    console.error(`[Transaction Manager] 🔥 ROLLBACK FAILURE for transaction ${transactionId}:`, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      isAborted: error instanceof Error && error.message.includes('transaction is aborted'),
      source: 'rollbackTransaction'
    });
    
    // Force release client on rollback failure
    client.release(true);
    
    throw error;
  }
}

/**
 * Check if a transaction is aborted
 * 
 * @param client The transaction client to check
 * @returns True if the transaction is aborted, false otherwise
 */
async function isTransactionAborted(client: PoolClient): Promise<boolean> {
  try {
    // Execute a simple query to see if it throws "transaction is aborted"
    await client.query('SELECT 1');
    return false; // If we get here, transaction is not aborted
  } catch (error) {
    if (error instanceof Error && error.message.includes('transaction is aborted')) {
      return true;
    }
    // Some other error occurred - rethrow
    throw error;
  }
}

/**
 * Error categories for transaction errors
 */
export enum TransactionErrorType {
  TX_ERROR_ABORTED = 'transaction_aborted',
  TX_ERROR_DEADLOCK = 'deadlock_detected',
  TX_ERROR_CONSTRAINT = 'constraint_violation',
  TX_ERROR_QUERY = 'query_execution_error',
  TX_ERROR_CONNECTION = 'connection_error',
  TX_ERROR_UNKNOWN = 'unknown_error'
}

/**
 * Categorize a database error
 * 
 * @param error The error to categorize
 * @returns The error category
 */
export function categorizeError(error: any): TransactionErrorType {
  if (!error) {
    return TransactionErrorType.TX_ERROR_UNKNOWN;
  }
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('transaction is aborted')) {
    return TransactionErrorType.TX_ERROR_ABORTED;
  }
  
  if (errorMessage.includes('deadlock detected')) {
    return TransactionErrorType.TX_ERROR_DEADLOCK;
  }
  
  if (
    errorMessage.includes('violates') && 
    (errorMessage.includes('constraint') || 
     errorMessage.includes('unique') || 
     errorMessage.includes('foreign key') ||
     errorMessage.includes('check constraint'))
  ) {
    return TransactionErrorType.TX_ERROR_CONSTRAINT;
  }
  
  if (
    errorMessage.includes('connection') && 
    (errorMessage.includes('closed') || 
     errorMessage.includes('terminated') || 
     errorMessage.includes('lost'))
  ) {
    return TransactionErrorType.TX_ERROR_CONNECTION;
  }
  
  return TransactionErrorType.TX_ERROR_QUERY;
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
  const transactionId = (client as any).__transactionId || 'unknown';
  try {
    // Check if transaction is already aborted before executing query
    const isAborted = await isTransactionAborted(client);
    if (isAborted) {
      console.error(`[Transaction Manager] ❌ Cannot execute query in aborted transaction ${transactionId}`);
      const abortedError = new Error(`Cannot execute query in aborted transaction ${transactionId}`);
      (abortedError as any).errorType = TransactionErrorType.TX_ERROR_ABORTED;
      throw abortedError;
    }
    
    // Log query execution (truncate very long queries for clarity)
    const truncatedQuery = query.length > 200 ? 
      `${query.substring(0, 200)}... [${query.length - 200} more chars]` : query;
    
    console.log(`[Transaction Manager] 🔄 Executing query in transaction ${transactionId}`, {
      query: truncatedQuery,
      paramCount: params.length
    });
    
    transactionLogger.debug('Executing query in transaction', {
      transactionId,
      query: truncatedQuery,
      paramCount: params.length,
      timestamp: new Date().toISOString()
    });
    
    // Execute the query
    const startTime = Date.now();
    const result = await client.query(query, params);
    const duration = Date.now() - startTime;
    
    console.log(`[Transaction Manager] ✅ Query executed successfully in transaction ${transactionId} in ${duration}ms`, {
      rowCount: result.rowCount || 0
    });
    
    transactionLogger.debug('Query executed successfully', {
      transactionId,
      duration: `${duration}ms`,
      rowCount: result.rowCount,
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    const errorCategory = categorizeError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[Transaction Manager] 🔴 Error executing query in transaction ${transactionId}:`, {
      error: errorMessage,
      query: query.length > 100 ? `${query.substring(0, 100)}...` : query,
      paramCount: params.length,
      errorType: errorCategory,
      timestamp: new Date().toISOString()
    });
    
    transactionLogger.error('Error executing query in transaction', {
      transactionId,
      error: errorMessage,
      query: query.length > 200 ? `${query.substring(0, 200)}...` : query,
      paramCount: params.length,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: errorCategory,
      timestamp: new Date().toISOString()
    });
    
    // Add error category to the error object for better handling upstream
    if (error instanceof Error) {
      (error as any).errorType = errorCategory;
    }
    
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
  let result: T | null = null;
  let caughtError: any = null;
  
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
      throw txStartError; // Re-throw to outer try-catch
    }
    
    // Execute the function with the transaction client
    try {
      // CRITICAL FIX: We need to handle errors from the function and:
      // 1. Detect if it's a transaction aborted error
      // 2. Convert it to a standard error if needed
      // 3. Ensure we don't try to commit an aborted transaction
      result = await fn(client);
    } catch (fnError) {
      caughtError = fnError;
      
      // Add diagnostic data to the error
      if (fnError instanceof Error) {
        (fnError as any).transactionId = (client as any).__transactionId;
        (fnError as any).timestamp = new Date().toISOString();
        
        // Categorize the error
        (fnError as any).errorType = categorizeError(fnError);
      }
      
      console.error(`[Transaction Manager] ❌ Error in transaction function:`, {
        error: fnError instanceof Error ? fnError.message : String(fnError),
        transactionId: (client as any).__transactionId,
        errorType: (fnError as any)?.errorType || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      // Check if transaction is aborted and set a flag
      try {
        const isAborted = await isTransactionAborted(client);
        (fnError as any).isTransactionAborted = isAborted;
        
        if (isAborted) {
          console.error(`[Transaction Manager] 🔥 Transaction ${(client as any).__transactionId} is aborted after function error`);
        }
      } catch (abortCheckError) {
        console.error(`[Transaction Manager] Failed to check if transaction is aborted:`, {
          error: abortCheckError instanceof Error ? abortCheckError.message : String(abortCheckError),
          originalError: fnError instanceof Error ? fnError.message : String(fnError)
        });
      }
      
      // Re-throw to outer try-catch to ensure proper transaction handling
      throw fnError;
    }
    
    // Function executed successfully, commit the transaction
    try {
      // CRITICAL FIX: Always verify the transaction isn't aborted before attempting commit
      const isAborted = await isTransactionAborted(client);
      
      if (isAborted) {
        console.error(`[Transaction Manager] 🚨 Transaction ${(client as any).__transactionId} is aborted but function did not throw an error`);
        // Instead of trying to commit, roll back
        await rollbackTransaction(client);
        throw new Error(`Transaction ${(client as any).__transactionId} is aborted before commit`);
      } else {
        // Only commit if not aborted
        await commitTransaction(client);
      }
    } catch (commitError) {
      // If commit fails and it's not our explicit check above, ensure we roll back
      if (commitError instanceof Error && !commitError.message.includes('Transaction') && !commitError.message.includes('is aborted before commit')) {
        console.error(`[Transaction Manager] 🔴 Failed to commit transaction:`, {
          error: commitError instanceof Error ? commitError.message : String(commitError),
          transactionId: (client as any).__transactionId
        });
        
        try {
          await rollbackTransaction(client);
        } catch (rollbackError) {
          console.error(`[Transaction Manager] 🔥 Failed to rollback after commit error:`, {
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            commitError: commitError instanceof Error ? commitError.message : String(commitError)
          });
        }
      }
      
      throw commitError; // Re-throw to outer try-catch
    }
    
    return result as T;
  } catch (error) {
    // Handle any error from any phase of the transaction
    if (client) {
      try {
        // Check if transaction is aborted or if we need to roll back
        const isAborted = error instanceof Error && 
          (error.message.includes('transaction is aborted') || 
           (error as any)?.isTransactionAborted === true);
        
        console.log(`[Transaction Manager] 🔄 Rolling back transaction due to error:`, {
          error: error instanceof Error ? error.message : String(error),
          transactionId: (client as any).__transactionId,
          isAborted
        });
        
        // Attempt to roll back the transaction
        await rollbackTransaction(client);
      } catch (rollbackError) {
        console.error(`[Transaction Manager] 🔥 Failed to rollback transaction:`, {
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          originalError: error instanceof Error ? error.message : String(error),
          transactionId: (client as any).__transactionId
        });
        
        // Don't rethrow the rollback error; we want the original error
      }
    }
    
    throw caughtError || error;
  }
}
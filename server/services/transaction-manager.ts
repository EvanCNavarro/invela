/**
 * Transaction Manager
 * 
 * A service for handling database transactions to ensure atomic operations
 * across multiple database tables. This helps maintain data integrity by
 * ensuring that all operations in a transaction either complete successfully
 * or are rolled back if any operation fails.
 */

import { pool } from '../../db/index';
import { PoolClient } from 'pg';
import createLogger from '../utils/logger';

// Create a logger for this service
const logger = createLogger('TransactionManager');

/**
 * Run a function within a database transaction
 * 
 * This function handles creating, committing, and rolling back transactions.
 * It ensures that the client is released back to the pool even if an error occurs.
 * 
 * @param callback Function to execute within the transaction
 * @returns The result of the callback function
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    logger.info('[TransactionManager] Beginning transaction');
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    logger.info('[TransactionManager] Committing transaction');
    await client.query('COMMIT');
    
    return result;
  } catch (error) {
    logger.error('[TransactionManager] Error in transaction, rolling back', { error });
    await client.query('ROLLBACK');
    throw error;
  } finally {
    logger.info('[TransactionManager] Releasing client');
    client.release();
  }
}

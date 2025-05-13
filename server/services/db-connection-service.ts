/**
 * Database Connection Service
 * 
 * Provides robust database connection handling with retry capabilities
 * for dealing with connection timeout issues.
 */

import { sql } from 'drizzle-orm';
import { db } from '@db';
import { Logger } from './logger';
import { withRetry, isConnectionError } from '../utils/db-retry';

const logger = new Logger('DBConnectionService');

interface QueryOptions {
  maxRetries?: number;
  baseDelay?: number;
  operationName?: string;
}

/**
 * Execute a database query with retry capabilities
 * 
 * @param queryFn Function that performs the database query
 * @param options Options for retry behavior
 * @returns Result of the query
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 500,
    operationName = 'database query'
  } = options;
  
  return withRetry(queryFn, {
    maxRetries,
    baseDelay,
    operation: operationName
  });
}

/**
 * Execute a simple SQL query with retry capabilities
 * 
 * @param query SQL query to execute
 * @param params Parameters for the query
 * @param options Options for retry behavior
 * @returns Query result
 */
export async function querySql<T>(
  query: string,
  params: any[] = [],
  options: QueryOptions = {}
): Promise<T> {
  return executeWithRetry(
    () => db.execute(sql.raw(query, params)) as Promise<T>,
    { ...options, operationName: options.operationName || `SQL query: ${query.substring(0, 50)}...` }
  );
}

/**
 * Ping the database to check connectivity
 * 
 * @returns True if the database is reachable
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    const result = await executeWithRetry(
      () => db.execute(sql`SELECT 1 as ping`),
      { maxRetries: 2, baseDelay: 300, operationName: 'database ping' }
    );
    
    return result.rows.length > 0 && 'ping' in result.rows[0];
  } catch (error) {
    logger.error('Database ping failed', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Check if a specific error is related to database connection issues
 * 
 * @param error Error to check
 * @returns True if it's a connection error
 */
export function isDatabaseConnectionError(error: Error): boolean {
  return isConnectionError(error);
}

export default {
  executeWithRetry,
  querySql,
  pingDatabase,
  isDatabaseConnectionError
};
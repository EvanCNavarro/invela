/**
 * Database Connection Retry Utility
 * 
 * This utility provides retry logic with exponential backoff for database operations
 * to handle temporary connection issues with Neon PostgreSQL.
 */
import { db } from '@db';
import { sql } from 'drizzle-orm';
import { Logger } from '../services/logger';

const logger = new Logger('DatabaseRetry');

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  operation?: string;
  logErrors?: boolean;
}

/**
 * Execute a database operation with retry logic
 * 
 * @param operation Function that performs the database operation
 * @param options Retry configuration options
 * @returns Result of the database operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    operation: operationName = 'Database operation',
    logErrors = true
  } = options;

  let retryCount = 0;
  let lastError: Error;

  while (retryCount < maxRetries) {
    try {
      // Attempt the database operation
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on connection timeout errors
      if (!error.message?.includes('timeout') && !error.message?.includes('connection')) {
        if (logErrors) {
          logger.error(`${operationName} failed with non-connection error:`, error);
        }
        throw error;
      }

      retryCount++;
      
      if (retryCount >= maxRetries) {
        if (logErrors) {
          logger.error(`${operationName} failed after ${maxRetries} retries:`, error);
        }
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, retryCount - 1) + Math.random() * 1000,
        maxDelay
      );
      
      if (logErrors) {
        logger.warn(
          `${operationName} failed with connection error, retrying in ${Math.round(delay)}ms (attempt ${retryCount}/${maxRetries}):`,
          error.message
        );
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  throw lastError;
}

/**
 * Test the database connection with a simple query
 * 
 * @returns True if connection is successful, false otherwise
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await withRetry(
      () => db.execute(sql`SELECT 1`),
      { operation: 'Connection test', logErrors: false, maxRetries: 1 }
    );
    return true;
  } catch (error) {
    return false;
  }
}
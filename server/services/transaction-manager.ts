/**
 * Transaction Manager Service
 * 
 * This service provides a transactional execution framework for operations that require atomic guarantees.
 * It ensures that related operations either all succeed or all fail together, maintaining data consistency.
 */

import { db } from '@db';
import { Logger } from '../utils/logger';

const logger = new Logger('TransactionManager');

/**
 * Options for transactional execution
 */
export interface TransactionOptions {
  /**
   * Name or identifier for the transaction (for logging purposes)
   */
  name?: string;
  
  /**
   * Maximum retry attempts for failed transactions
   */
  maxRetries?: number;
  
  /**
   * Whether to include detailed error information in the result
   */
  includeDetailedErrors?: boolean;
}

/**
 * Result of a transactional execution
 */
export interface TransactionResult<T> {
  /**
   * Whether the transaction was successful
   */
  success: boolean;
  
  /**
   * The result of the transaction function (if successful)
   */
  result?: T;
  
  /**
   * Error information (if unsuccessful)
   */
  error?: {
    message: string;
    details?: any;
    stack?: string;
  };
}

export class TransactionManager {
  /**
   * Execute a function within a database transaction
   * 
   * This method ensures all database operations in the provided function
   * are executed atomically - either all succeed or all are rolled back.
   * 
   * @param txFunction Function to execute within the transaction
   * @param options Transaction options
   * @returns Promise resolving to the transaction result
   */
  static async executeInTransaction<T>(
    txFunction: (tx: any) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const {
      name = 'unnamed-transaction',
      maxRetries = 0,
      includeDetailedErrors = false
    } = options;
    
    let retryCount = 0;
    
    // Start with an initial delay of 100ms, doubled on each retry
    let retryDelay = 100;
    
    // Function to handle retry logic
    const executeWithRetries = async (): Promise<TransactionResult<T>> => {
      try {
        logger.info(`Starting transaction: ${name}`, {
          attempt: retryCount + 1,
          maxRetries
        });
        
        // Execute the function within a transaction
        const result = await db.transaction(async (tx) => {
          return await txFunction(tx);
        });
        
        logger.info(`Transaction completed successfully: ${name}`);
        
        return {
          success: true,
          result
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        logger.error(`Transaction failed: ${name}`, {
          error: errorMessage,
          attempt: retryCount + 1,
          maxRetries
        });
        
        // Check if we should retry
        if (retryCount < maxRetries) {
          retryCount++;
          
          // Exponential backoff with jitter
          const jitter = Math.floor(Math.random() * 100);
          const delay = retryDelay + jitter;
          retryDelay *= 2;
          
          logger.info(`Retrying transaction in ${delay}ms: ${name}`, {
            attempt: retryCount,
            maxRetries
          });
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Retry the transaction
          return executeWithRetries();
        }
        
        // We've exhausted retries or no retries were configured
        return {
          success: false,
          error: {
            message: errorMessage,
            details: includeDetailedErrors ? error : undefined,
            stack: includeDetailedErrors ? errorStack : undefined
          }
        };
      }
    };
    
    // Start the execution process
    return executeWithRetries();
  }
}

/**
 * Database Retry Utility (Enhanced for Neon PostgreSQL)
 * 
 * This utility provides advanced functions to handle database query retries,
 * specifically optimized for Neon PostgreSQL's serverless architecture and 
 * control plane rate limiting behavior.
 * 
 * It integrates with our NeonConnectionService for robust handling of
 * connection issues, rate limits, and automatic recovery.
 */

import { logger } from './logger';
import { neonConnection } from '../services/neon-connection-service';

// Create a dedicated logger for database retries
const retryLogger = logger.child({ module: 'DbRetry' });

// Enhanced retry settings
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 2000;
const MAX_RETRY_DELAY = 30000;
const RATE_LIMIT_DELAY = 8000;

/**
 * Checks if an error is related to database connection or rate limiting
 * Enhanced to detect more Neon-specific error patterns
 * 
 * @param error The error to check
 * @returns True if the error is connection or rate limit related
 */
export function isConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('control plane') ||
      message.includes('socket hang up') ||
      // Also check for Neon-specific error codes
      (error as any)?.code === 'XX000' || 
      ((error as any)?.severity === 'ERROR' && (error as any)?.code === '08006')
    );
  }
  return false;
}

/**
 * Checks if an error is specifically a rate limit error
 * Enhanced to detect more Neon-specific rate limit patterns
 * 
 * @param error The error to check
 * @returns True if this is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('exceeded the rate limit') ||
      message.includes('control plane request failed') ||
      // Neon-specific error code for control plane rate limits
      (error as any)?.code === 'XX000'
    );
  }
  return false;
}

/**
 * Executes a database query with automatic retries
 * (Legacy version maintained for backwards compatibility)
 * 
 * @param operation The database operation function to execute
 * @param maxRetries Maximum number of retry attempts (default: MAX_RETRY_ATTEMPTS)
 * @param initialDelay Initial delay in ms before retrying (default: INITIAL_RETRY_DELAY)
 * @returns The result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRY_ATTEMPTS,
  initialDelay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  // Use the enhanced implementation that integrates with NeonConnectionService
  return executeWithRetry(operation, {
    maxRetries,
    initialDelayMs: initialDelay,
    useNeonConnection: true
  });
}

/**
 * Enhanced database operation executor with comprehensive retry logic
 * 
 * This function uses the NeonConnectionService for consistent connection
 * management and intelligent rate limit handling.
 * 
 * @param operation The async database operation to execute
 * @param options Optional retry configuration
 * @returns The result of the operation
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (error: any, attempt: number) => void;
    useNeonConnection?: boolean; // Whether to use the Neon Connection Service
  } = {}
): Promise<T> {
  // If specifically requested to use NeonConnectionService (default behavior)
  if (options.useNeonConnection !== false) {
    return neonConnection.executeQuery(async () => {
      return operation();
    }, options.maxRetries || MAX_RETRY_ATTEMPTS);
  }
  
  // Fall back to standalone retry logic if explicitly not using NeonConnection
  const maxRetries = options.maxRetries ?? MAX_RETRY_ATTEMPTS;
  const initialDelayMs = options.initialDelayMs ?? INITIAL_RETRY_DELAY;
  const maxDelayMs = options.maxDelayMs ?? MAX_RETRY_DELAY;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt, don't retry
      if (attempt >= maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff + jitter
      let delay = Math.min(
        maxDelayMs, 
        initialDelayMs * Math.pow(2, attempt)
      );
      const jitter = Math.floor(Math.random() * (0.3 * delay)); // 30% jitter
      delay += jitter;
      
      // Add extra delay for rate limit errors
      if (isRateLimitError(error)) {
        const extraDelay = RATE_LIMIT_DELAY * Math.pow(1.5, attempt);
        delay += extraDelay;
        retryLogger.warn(`Rate limit error detected. Adding ${Math.round(extraDelay)}ms extra delay.`);
      }
      
      retryLogger.info(`Database operation failed. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      // Call optional onRetry callback
      if (options.onRetry) {
        options.onRetry(error, attempt);
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all attempts failed
  retryLogger.error(`Database operation failed after ${maxRetries} attempts:`, lastError);
  throw lastError;
}

/**
 * Check if database connection is healthy
 * 
 * Uses the NeonConnectionService to check if the database is accessible
 * 
 * @returns Promise resolving to true if healthy, false otherwise
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    return await neonConnection.isHealthy();
  } catch (error) {
    retryLogger.error('Database health check failed:', error);
    return false;
  }
}
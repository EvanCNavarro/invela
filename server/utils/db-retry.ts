/**
 * Database Retry Utility
 * 
 * This utility provides functions to handle database query retries,
 * specifically targeting rate limiting issues with Neon PostgreSQL.
 */

// Maximum number of retry attempts for queries
const MAX_RETRY_ATTEMPTS = 3;

// Initial delay before first retry (ms)
const INITIAL_RETRY_DELAY = 1000;

// Additional delay for rate limit errors (ms)
const RATE_LIMIT_DELAY = 3000;

/**
 * Checks if an error is related to database connection or rate limiting
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
      message.includes('control plane')
    );
  }
  return false;
}

/**
 * Checks if an error is specifically a rate limit error
 * 
 * @param error The error to check
 * @returns True if this is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('exceeded the rate limit')
    );
  }
  return false;
}

/**
 * Executes a database query with automatic retries
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
      let delay = initialDelay * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 500); // Add up to 500ms of jitter
      delay += jitter;
      
      // Add extra delay for rate limit errors
      if (isRateLimitError(error)) {
        delay += RATE_LIMIT_DELAY;
        console.warn(`Rate limit error detected. Adding ${RATE_LIMIT_DELAY}ms extra delay.`);
      }
      
      console.log(`Database operation failed. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all attempts failed
  throw lastError;
}
/**
 * Database Connection Retry Utility
 * 
 * This utility provides retry logic with exponential backoff for database operations
 * to handle temporary connection issues with Neon PostgreSQL.
 */

import { db } from "@db";
import { sql } from "drizzle-orm";
import { Logger } from "../services/logger";

const logger = new Logger("DBRetry");

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
    initialDelay = 500,
    maxDelay = 5000,
    operation: operationName = "Database operation",
    logErrors = true,
  } = options;

  let attempt = 0;
  let delay = initialDelay;
  let lastError: Error = new Error("Retry failed");

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Determine if this error is retryable
      const isConnectionError = isRetryableError(lastError);
      
      if (!isConnectionError || attempt >= maxRetries) {
        if (logErrors) {
          logger.error(`${operationName} failed after ${attempt} attempts:`, lastError);
        }
        throw lastError;
      }
      
      if (logErrors) {
        logger.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, 
          lastError.message);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff with jitter
      delay = Math.min(delay * 2, maxDelay) * (0.8 + Math.random() * 0.4);
    }
  }
  
  throw lastError;
}

/**
 * Test the database connection with a simple query
 * 
 * @returns True if connection is successful, false otherwise
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Simple test query
    const result = await withRetry(
      () => db.execute(sql`SELECT 1 AS test`), 
      { 
        maxRetries: 1, 
        operation: "Test database connection",
        logErrors: false 
      }
    );
    return true;
  } catch (error) {
    logger.error("Database connection test failed:", error);
    return false;
  }
}

/**
 * Determine if an error is retryable based on error message patterns
 * 
 * @param error The error to check
 * @returns True if the error is retryable
 */
function isRetryableError(error: Error): boolean {
  if (!error || !error.message) return false;
  
  const errorMessage = error.message.toLowerCase();
  
  // Connection-related errors that are typically transient
  return (
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("socket") ||
    errorMessage.includes("network") ||
    errorMessage.includes("econnreset") ||
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("could not connect") ||
    errorMessage.includes("connection terminated") ||
    errorMessage.includes("terminating connection") ||
    errorMessage.includes("pool") ||
    errorMessage.includes("too many clients")
  );
}
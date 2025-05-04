/**
 * Progress Validator Utility
 * 
 * This utility provides functions to validate and normalize progress values
 * throughout the application, ensuring consistent type handling and valid ranges.
 * 
 * It addresses several key issues that caused progress tracking inconsistencies:
 * 1. Type conversion issues (string vs number)
 * 2. Range validation (ensuring progress is 0-100)
 * 3. SQL type casting consistency
 * 4. Undefined/null handling
 */

import { logger } from './logger';
import { SQL, sql } from 'drizzle-orm';

/**
 * Validates and normalizes a progress value to ensure it's a proper number
 * between 0 and 100.
 * 
 * @param progress The progress value to validate (can be number, string, or undefined)
 * @param fallback The fallback value to use if progress is invalid (default: 0)
 * @returns A normalized progress number between 0 and 100
 */
export function validateProgress(progress: number | string | undefined | null, fallback = 0): number {
  // Handle undefined or null
  if (progress === undefined || progress === null) {
    return fallback;
  }
  
  // Convert string to number if needed
  const numericProgress = typeof progress === 'string' ? parseFloat(progress) : progress;
  
  // Handle NaN
  if (isNaN(numericProgress)) {
    logger.warn(`Invalid progress value: ${progress}, using fallback: ${fallback}`);
    return fallback;
  }
  
  // Clamp to valid range 0-100
  return Math.max(0, Math.min(100, numericProgress));
}

/**
 * Creates an SQL expression for progress that ensures proper type casting
 * for database operations.
 * 
 * @param progress The progress value to cast to integer in SQL
 * @returns An SQL expression with proper type casting
 */
export function getProgressSqlValue(progress: number | string | undefined | null): SQL<unknown> {
  const validatedProgress = validateProgress(progress);
  // Use explicit SQL CAST to INTEGER to ensure consistent type handling
  return sql`CAST(${validatedProgress} AS INTEGER)`;
}

/**
 * Validates and normalizes a progress value for database update operations,
 * with detailed logging for debugging purposes.
 * 
 * @param taskId The ID of the task being updated (for logging)
 * @param progress The progress value to validate
 * @param options Optional configuration
 * @returns A validated progress number between 0 and 100
 */
export function validateProgressForUpdate(
  taskId: number,
  progress: number | string | undefined | null,
  options: {
    source?: string;
    debug?: boolean;
    context?: Record<string, any>;
  } = {}
): number {
  const { source = 'unknown', debug = false, context = {} } = options;
  const originalValue = progress;
  const validatedValue = validateProgress(progress);
  
  // Log detailed information if debug is enabled or values don't match
  if (debug || originalValue !== validatedValue) {
    logger.info(`[Progress Validation] Task ${taskId} progress value normalized:`, {
      taskId,
      source,
      originalValue,
      originalType: typeof originalValue,
      validatedValue,
      wasChanged: originalValue !== validatedValue,
      ...context
    });
  }
  
  return validatedValue;
}

/**
 * Checks if two progress values are significantly different
 * (useful for determining if an update is needed)
 * 
 * @param a First progress value
 * @param b Second progress value
 * @param threshold The significance threshold (default: 0.1)
 * @returns True if values are significantly different
 */
export function isProgressDifferent(
  a: number | string | undefined | null,
  b: number | string | undefined | null,
  threshold = 0.1
): boolean {
  const normalizedA = validateProgress(a);
  const normalizedB = validateProgress(b);
  
  return Math.abs(normalizedA - normalizedB) >= threshold;
}

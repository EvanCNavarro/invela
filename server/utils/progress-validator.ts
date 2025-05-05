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
 * @param options Additional options for validation behavior
 * @returns A normalized progress number between 0 and 100
 */
export function validateProgress(
  progress: number | string | undefined | null, 
  fallback = 0,
  options: {
    avoidMidpointBias?: boolean,
    forceRounding?: boolean,
    log?: boolean
  } = {}
): number {
  // Destructure options with defaults
  const { 
    avoidMidpointBias = true, 
    forceRounding = true,
    log = false 
  } = options;
  
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
  
  // Clamp to valid range 0-100 before any special processing
  let result = Math.max(0, Math.min(100, numericProgress));
  
  // Apply midpoint bias correction (avoid stopping at 25%, 50%, 75%)
  // This ensures that progress calculations don't artificially get stuck at these values
  if (avoidMidpointBias) {
    const biasedPoints = [25, 26, 50, 75];
    const isBiasedPoint = biasedPoints.some(point => 
      Math.abs(result - point) < 0.01 || Math.abs(result - point) === 0
    );
    
    if (isBiasedPoint) {
      // If we're at exactly 25%, bump to 27%
      // If we're at exactly 50%, bump to 51%
      // If we're at exactly 75%, bump to 76%
      // This prevents unnatural pauses in progress bar
      if (Math.abs(result - 25) < 0.01 || Math.abs(result - 26) < 0.01) {
        if (log) logger.info(`Avoiding 25/26% midpoint bias, adjusting to 27%`);
        result = 27;
      } else if (Math.abs(result - 50) < 0.01) {
        if (log) logger.info(`Avoiding 50% midpoint bias, adjusting to 51%`);
        result = 51;
      } else if (Math.abs(result - 75) < 0.01) {
        if (log) logger.info(`Avoiding 75% midpoint bias, adjusting to 76%`);
        result = 76;
      }
    }
  }
  
  // Force integer rounding if requested
  if (forceRounding) {
    result = Math.round(result);
  }
  
  return result;
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
    taskType?: string;
    avoidMidpointBias?: boolean;
  } = {}
): number {
  const { 
    source = 'unknown', 
    debug = false, 
    context = {},
    taskType = 'unknown',
    avoidMidpointBias = true
  } = options;
  
  const originalValue = progress;
  
  // Apply special rules for KY3P tasks to avoid 26% midpoint bias
  const useAvoidMidpointBias = avoidMidpointBias || taskType === 'ky3p';
  
  // Validate the progress value with bias correction for KY3P tasks
  const validatedValue = validateProgress(progress, 0, {
    avoidMidpointBias: useAvoidMidpointBias,
    forceRounding: true,
    log: debug
  });
  
  // Log detailed information if debug is enabled or values don't match
  if (debug || originalValue !== validatedValue) {
    logger.info(`[Progress Validation] Task ${taskId} progress value normalized:`, {
      taskId,
      taskType,
      source,
      originalValue,
      originalType: typeof originalValue,
      validatedValue,
      wasChanged: originalValue !== validatedValue,
      biasAvoidance: useAvoidMidpointBias,
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

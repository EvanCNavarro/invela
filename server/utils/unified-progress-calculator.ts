/**
 * Unified Progress Calculator (Extension Helper)
 * 
 * This utility provides additional helper functions that complement
 * the existing unified-task-progress module. It serves as an expansion
 * for specific use cases while maintaining compatibility with the
 * existing unified approach.
 * 
 * NOTE: The core progress calculation functionality is already implemented
 * in server/utils/unified-task-progress.ts. This file provides supplementary
 * utilities that work alongside that implementation.
 */

import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { tasks } from '@db/schema';
import { FormResponseType } from './unified-form-response-handler';

// Re-export the core functionality from unified-task-progress.ts
export { updateTaskProgress, updateTaskProgressAndBroadcast } from './unified-task-progress';

/**
 * Format progress value for SQL storage (helper that matches existing implementation)
 * 
 * This function ensures that progress values are properly formatted for
 * database storage, avoiding issues with type conversion or validation.
 */
export function getProgressSqlValue(progress: number): number {
  // Ensure progress is within valid range (0-100)
  const validatedProgress = Math.max(0, Math.min(100, progress));
  
  // Round to nearest integer to avoid floating point issues
  return Math.round(validatedProgress);
}

/**
 * Preserve existing progress in certain scenarios
 * 
 * Some operations should preserve the existing progress rather than
 * recalculating it. This function determines when to preserve progress.
 */
export function shouldPreserveProgress(
  operation: string,
  metadata: Record<string, any> | null | undefined
): boolean {
  // Preserve progress during edits if metadata indicates
  if (operation === 'edit' && metadata?.preserveProgress === true) {
    return true;
  }
  
  // Preserve progress during clear operations if indicated
  if (operation === 'clear' && metadata?.preserveProgress === true) {
    return true;
  }
  
  // Don't preserve progress during submissions
  if (operation === 'submit') {
    return false;
  }
  
  // Default to not preserving
  return false;
}

/**
 * Determine if a task is at 100% progress
 * 
 * This utility helps avoid the "midpoint bias" by ensuring that tasks are truly
 * at 100% progress when all fields are completed and the submission is valid.
 */
export function isTaskComplete(
  progress: number,
  metadata: Record<string, any> | null | undefined
): boolean {
  // Task is complete if:
  // 1. Progress is 100%
  // 2. Has a submission flag or date
  // 3. No validation errors are present
  
  const hasSubmissionFlag = metadata?.submitted === true;
  const hasSubmissionDate = !!metadata?.submittedAt || !!metadata?.submission_date;
  const hasValidationErrors = metadata?.validationErrors && 
    (Array.isArray(metadata.validationErrors) ? 
      metadata.validationErrors.length > 0 : 
      Object.keys(metadata.validationErrors).length > 0);
  
  return progress === 100 && 
    (hasSubmissionFlag || hasSubmissionDate) && 
    !hasValidationErrors;
}

/**
 * Standardized status constants for task system
 * 
 * This file provides a single source of truth for all status constants
 * used throughout the task system, ensuring consistency across
 * different task types and endpoints.
 */

/**
 * Response status enum for field responses
 * Used consistently across all form types (KYB, KY3P, Open Banking)
 */
export enum ResponseStatus {
  EMPTY = 'empty',      // No response provided yet
  PARTIAL = 'partial',  // Partially completed
  COMPLETE = 'complete', // Fully completed
  INVALID = 'invalid'   // Response provided but invalid
}

/**
 * Task status enum for overall task status
 */
export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  READY_FOR_SUBMISSION = 'ready_for_submission',
  SUBMITTED = 'submitted'
}

/**
 * Normalize status values to prevent case sensitivity issues
 * All status comparisons should use this function
 * 
 * @param status Status string to normalize
 * @returns Normalized status string (lowercase)
 */
export function normalizeStatus(status: string): string {
  return (status || '').toLowerCase();
}

/**
 * Check if a response status is equivalent to COMPLETE
 * This handles case sensitivity and null/undefined values
 * 
 * @param status Status to check
 * @returns boolean indicating if status is equivalent to COMPLETE
 */
export function isStatusComplete(status: string): boolean {
  return normalizeStatus(status) === normalizeStatus(ResponseStatus.COMPLETE);
}

/**
 * Check if a task is submitted based on status
 * 
 * @param status Task status to check
 * @returns boolean indicating if task is in SUBMITTED status
 */
export function isTaskSubmitted(status: string): boolean {
  return normalizeStatus(status) === normalizeStatus(TaskStatus.SUBMITTED);
}

/**
 * Determine task status from progress percentage and metadata
 * This is the single source of truth for mapping progress to status
 * 
 * @param progress Progress percentage (0-100)
 * @param hasSubmissionData Whether the task has submission data
 * @returns Appropriate task status
 */
export function getStatusFromProgress(
  progress: number,
  hasSubmissionData: boolean = false
): TaskStatus {
  // Validate progress value
  const validatedProgress = Math.max(0, Math.min(100, progress));
  
  // Always prioritize submission data
  if (hasSubmissionData) {
    return TaskStatus.SUBMITTED;
  }
  
  // Map progress to status using standard rules
  if (validatedProgress === 0) {
    return TaskStatus.NOT_STARTED;
  } else if (validatedProgress < 100) {
    return TaskStatus.IN_PROGRESS;
  } else {
    return TaskStatus.READY_FOR_SUBMISSION;
  }
}

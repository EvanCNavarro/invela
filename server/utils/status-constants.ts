/**
 * Status Constants Module
 * 
 * This file provides standardized status enums and utility functions
 * to ensure consistent status handling across all parts of the application.
 * 
 * By centralizing these constants, we eliminate issues with case sensitivity,
 * inconsistent naming, and scattered status logic.
 */

/**
 * Task statuses
 * 
 * These represent the possible states of a task in the system.
 */
export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  READY_FOR_SUBMISSION = 'ready_for_submission',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

/**
 * Response statuses
 * 
 * These represent the possible states of a form field response.
 */
export enum ResponseStatus {
  EMPTY = 'EMPTY',
  INCOMPLETE = 'INCOMPLETE',
  COMPLETE = 'COMPLETE',
  INVALID = 'INVALID'
}

/**
 * Normalize a task status string to the standard enum value
 * 
 * @param status Status string to normalize
 * @returns Normalized status from TaskStatus enum
 */
export function normalizeTaskStatus(status: string | null | undefined): TaskStatus {
  if (!status) return TaskStatus.NOT_STARTED;
  
  const normalized = status.toLowerCase().trim();
  
  if (normalized === 'not started' || normalized === 'not_started' || normalized === 'notstarted') {
    return TaskStatus.NOT_STARTED;
  } else if (normalized === 'in progress' || normalized === 'in_progress' || normalized === 'inprogress') {
    return TaskStatus.IN_PROGRESS;
  } else if (normalized === 'ready for submission' || normalized === 'ready_for_submission' || normalized === 'readyforsubmission') {
    return TaskStatus.READY_FOR_SUBMISSION;
  } else if (normalized === 'submitted' || normalized === 'complete' || normalized === 'completed') {
    return TaskStatus.SUBMITTED;
  } else if (normalized === 'approved' || normalized === 'accepted') {
    return TaskStatus.APPROVED;
  } else if (normalized === 'rejected' || normalized === 'declined') {
    return TaskStatus.REJECTED;
  } else if (normalized === 'needs revision' || normalized === 'needs_revision' || normalized === 'revision needed') {
    return TaskStatus.NEEDS_REVISION;
  } else if (normalized === 'expired' || normalized === 'timeout') {
    return TaskStatus.EXPIRED;
  } else if (normalized === 'cancelled' || normalized === 'canceled') {
    return TaskStatus.CANCELLED;
  }
  
  // If unknown status, try to match to closest one
  for (const enumKey in TaskStatus) {
    if (normalized.includes(TaskStatus[enumKey as keyof typeof TaskStatus].toLowerCase())) {
      return TaskStatus[enumKey as keyof typeof TaskStatus];
    }
  }
  
  // Default to in_progress as safest option
  return TaskStatus.IN_PROGRESS;
}

/**
 * Normalize a response status string to the standard enum value
 * 
 * @param status Status string to normalize
 * @returns Normalized status from ResponseStatus enum
 */
export function normalizeResponseStatus(status: string | null | undefined): ResponseStatus {
  if (!status) return ResponseStatus.EMPTY;
  
  const normalized = status.toUpperCase().trim();
  
  if (normalized === 'EMPTY' || normalized === 'NOT_STARTED' || normalized === 'NOT STARTED') {
    return ResponseStatus.EMPTY;
  } else if (normalized === 'INCOMPLETE' || normalized === 'IN_PROGRESS' || normalized === 'IN PROGRESS' || normalized === 'PARTIAL') {
    return ResponseStatus.INCOMPLETE;
  } else if (normalized === 'COMPLETE' || normalized === 'COMPLETED' || normalized === 'SUBMITTED' || normalized === 'DONE') {
    return ResponseStatus.COMPLETE;
  } else if (normalized === 'INVALID' || normalized === 'ERROR' || normalized === 'FAILED') {
    return ResponseStatus.INVALID;
  }
  
  // Default to INCOMPLETE as safest option
  return ResponseStatus.INCOMPLETE;
}

/**
 * Check if two status values are equivalent, ignoring case and format differences
 * 
 * @param status1 First status to compare
 * @param status2 Second status to compare
 * @returns True if the statuses are equivalent
 */
export function areStatusesEquivalent(status1: string | null | undefined, status2: string | null | undefined): boolean {
  if (!status1 && !status2) return true;
  if (!status1 || !status2) return false;
  
  return normalizeResponseStatus(status1) === normalizeResponseStatus(status2);
}

/**
 * Calculate task status based on progress
 * 
 * @param progress Task progress (0-100)
 * @param hasSubmissionData Whether the task has submission data
 * @returns Appropriate task status
 */
export function getStatusFromProgress(progress: number, hasSubmissionData: boolean): TaskStatus {
  if (hasSubmissionData) {
    return TaskStatus.SUBMITTED;
  } else if (progress === 0) {
    return TaskStatus.NOT_STARTED;
  } else if (progress < 100) {
    return TaskStatus.IN_PROGRESS;
  } else {
    return TaskStatus.READY_FOR_SUBMISSION;
  }
}

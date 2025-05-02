import { TaskStatus } from '@db/schema';
import { logger } from './client-logger';

/**
 * UI display names for form/task status values
 * These map database values to user-facing text
 */
export const FormStatusDisplayNames: Record<string, string> = {
  'not_started': 'Not Started',
  'in_progress': 'In Progress',
  'ready_for_submission': 'Ready for Submission',
  'submitted': 'Submitted',
  'completed': 'Completed',
  'approved': 'Approved',
  'rejected': 'Rejected'
};

/**
 * Form UI state - different from task submission status!
 * This is used for the internal form loading state machine.
 */
export type FormLoadingState = 
  | { status: 'idle' }
  | { status: 'loading-fields'; requestId?: string }
  | { status: 'loading-data'; requestId?: string; hasFields: boolean }
  | { status: 'form-ready'; formInitialized: boolean }
  | { status: 'error'; message: string; code: string };

/**
 * Form Submission State - based on database TaskStatus
 * Maps to the actual task's status in the database.
 */
export type FormSubmissionState = 
  | 'not_started'
  | 'in_progress'
  | 'ready_for_submission'
  | 'submitted'
  | 'completed'
  | 'approved';

/**
 * Calculates task status based on progress percentage
 * @param progress Progress percentage (0-100)
 * @param isSubmitted Whether the form has been submitted
 * @returns Appropriate task status
 */
export function calculateTaskStatus(progress: number, isSubmitted: boolean = false): FormSubmissionState {
  if (isSubmitted) {
    return 'submitted';
  }
  
  if (progress === 0) {
    return 'not_started';
  } else if (progress < 100) {
    return 'in_progress';
  } else if (progress === 100) {
    return 'ready_for_submission';
  }
  
  // Fallback - should never reach this
  logger.warn('Unexpected progress value in calculateTaskStatus:', progress);
  return 'in_progress';
}

/**
 * Get color for status badge based on task status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'not_started':
      return 'gray';
    case 'in_progress':
      return 'blue';
    case 'ready_for_submission':
      return 'orange';
    case 'submitted':
    case 'completed':
      return 'green';
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Check if task requires review based on its status
 */
export function isTaskReadyForReview(status: string): boolean {
  return status === 'ready_for_submission';
}

/**
 * Check if a form can be edited based on its status
 */
export function isFormEditable(status: string): boolean {
  return [
    'not_started',
    'in_progress',
    'ready_for_submission'
  ].includes(status);
}

/**
 * Check if a form is in a completed state (submitted or beyond)
 */
export function isFormCompleted(status: string): boolean {
  return [
    'submitted',
    'completed',
    'approved'
  ].includes(status);
}
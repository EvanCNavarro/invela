/**
 * Task-related type definitions
 */

/**
 * Task status enum
 */
export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  READY_FOR_SUBMISSION = 'ready_for_submission',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EMAIL_SENT = 'email_sent'
}
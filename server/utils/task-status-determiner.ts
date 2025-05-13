/**
 * Task Status Determiner
 * 
 * This utility provides a consistent way to determine a task's status based on
 * its progress, submission state, and other factors. It ensures all task types
 * (KYB, KY3P, Open Banking) follow the same status determination logic.
 */

import { TaskStatus } from '../types';
import { logger } from './logger';

/**
 * Input for determining task status
 */
type StatusDeterminationInput = {
  /** Current progress value (0-100) */
  progress: number;
  /** Current task status */
  currentStatus: string;
  /** Whether task has a submission date */
  hasSubmissionDate: boolean;
  /** Whether task has been marked as submitted */
  hasSubmittedFlag: boolean;
  /** Whether any responses exist for this task */
  hasResponses: boolean;
  /** Timestamp for diagnostics */
  timestamp?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
};

/**
 * Determines the appropriate task status based on standard business rules.
 * 
 * Unified status determination logic follows these rules:
 * 1. If task is submitted (has submission date), status = SUBMITTED
 * 2. If progress = 100% and not submitted, status = READY_FOR_SUBMISSION
 * 3. If progress = 0%, status = NOT_STARTED
 * 4. If 0% < progress < 100%, status = IN_PROGRESS
 * 
 * @param input Status determination input parameters
 * @returns The appropriate task status
 */
export function determineTaskStatus(input: StatusDeterminationInput): TaskStatus {
  const {
    progress,
    currentStatus,
    hasSubmissionDate,
    hasSubmittedFlag,
    hasResponses,
    timestamp = new Date().toISOString(),
    metadata = {}
  } = input;
  
  // Derive effective hasResponses from progress - if progress > 0, the task MUST have responses
  const effectiveHasResponses = hasResponses || progress > 0;
  
  // Log key info for debugging status transitions
  console.log('[STATUS DETERMINATION] Calculating status for task with:', {
    progress,
    currentStatus,
    hasSubmissionDate,
    hasSubmittedFlag,
    hasResponses,
    effectiveHasResponses,
    timestamp
  });
  
  // Rule 1: If task has been submitted (has submission date or submitted flag), always use SUBMITTED
  if (hasSubmissionDate || hasSubmittedFlag) {
    console.log('[STATUS DETERMINATION] Task is submitted, setting to SUBMITTED');
    return TaskStatus.SUBMITTED;
  }
  
  // Rule 2: If progress is 100% but not submitted, use READY_FOR_SUBMISSION
  if (progress === 100) {
    console.log('[STATUS DETERMINATION] Task has 100% progress but is not submitted, setting to READY_FOR_SUBMISSION');
    return TaskStatus.READY_FOR_SUBMISSION;
  }
  
  // Rule 3: If progress is 0% and no responses, use NOT_STARTED
  if (progress === 0 && !effectiveHasResponses) {
    console.log('[STATUS DETERMINATION] Task has 0% progress and no responses, setting to NOT_STARTED');
    return TaskStatus.NOT_STARTED;
  }
  
  // Rule 4: Otherwise, task is in progress (0% < progress < 100% or has responses)
  console.log('[STATUS DETERMINATION] Task has partial progress or responses, setting to IN_PROGRESS');
  return TaskStatus.IN_PROGRESS;
}

/**
 * Determines if a task status change is valid based on business rules
 * 
 * @param currentStatus Current task status
 * @param newStatus Proposed new status
 * @returns True if status change is valid, false otherwise
 */
export function isValidStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  // Don't allow transitioning from SUBMITTED to any other status
  if (currentStatus === TaskStatus.SUBMITTED && newStatus !== TaskStatus.SUBMITTED) {
    logger.warn(`Invalid status transition: ${currentStatus} → ${newStatus}`, {
      message: 'Submitted tasks cannot change status',
      timestamp: new Date().toISOString()
    });
    return false;
  }
  
  // All other transitions are valid
  return true;
}

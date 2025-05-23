/**
 * Task Types Definition
 * 
 * This file contains shared type definitions for tasks across the application.
 */

/**
 * Task Status Enum - represents the possible states of a task in the system
 */
export enum TaskStatus {
  PENDING = 'pending',
  NOT_STARTED = 'not_started',
  EMAIL_SENT = 'email_sent',
  COMPLETED = 'completed',
  FAILED = 'failed',
  IN_PROGRESS = 'in_progress',
  READY_FOR_SUBMISSION = 'ready_for_submission',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

/**
 * Progress mapping for task statuses
 */
export const taskStatusToProgress: Record<TaskStatus, number> = {
  [TaskStatus.PENDING]: 0,
  [TaskStatus.NOT_STARTED]: 0,
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.IN_PROGRESS]: 50,
  [TaskStatus.READY_FOR_SUBMISSION]: 75,
  [TaskStatus.SUBMITTED]: 90,
  [TaskStatus.APPROVED]: 100,
  [TaskStatus.COMPLETED]: 100,
  [TaskStatus.FAILED]: 100,
  [TaskStatus.REJECTED]: 100,
  [TaskStatus.ARCHIVED]: 100
};

/**
 * Task update interface for WebSocket messaging
 */
export interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, any>;
}

// Export a TaskStatusValues object for code that uses string values
export const TaskStatusValues = {
  PENDING: 'pending' as TaskStatus,
  NOT_STARTED: 'not_started' as TaskStatus,
  EMAIL_SENT: 'email_sent' as TaskStatus,
  IN_PROGRESS: 'in_progress' as TaskStatus,
  READY_FOR_SUBMISSION: 'ready_for_submission' as TaskStatus,
  SUBMITTED: 'submitted' as TaskStatus,
  APPROVED: 'approved' as TaskStatus,
  COMPLETED: 'completed' as TaskStatus,
  FAILED: 'failed' as TaskStatus,
  REJECTED: 'rejected' as TaskStatus,
  ARCHIVED: 'archived' as TaskStatus
};
/**
 * Type declarations for task-related functions and utilities
 */

declare module '../services/tasks' {
  export type TaskStatus = 
    | 'not_started' 
    | 'in_progress' 
    | 'ready_for_submission' 
    | 'submitted' 
    | 'approved' 
    | 'completed' 
    | 'email_sent';

  export type TaskType = 'user_onboarding' | 'company_kyb';

  export interface TaskProgressRange {
    min: number;
    max: number;
  }

  export interface TaskStateTransition {
    next: TaskStatus[];
    progress: TaskProgressRange;
  }

  export interface TaskTypeTransition {
    [status: string]: TaskStateTransition;
  }

  export interface TaskTypeTransitions {
    [taskType: string]: TaskTypeTransition;
  }

  export const TASK_TYPE_TRANSITIONS: TaskTypeTransitions;
  
  export function getTaskStatus(): {
    NOT_STARTED: 'not_started';
    IN_PROGRESS: 'in_progress';
    READY_FOR_SUBMISSION: 'ready_for_submission';
    SUBMITTED: 'submitted';
    APPROVED: 'approved';
    COMPLETED: 'completed';
    EMAIL_SENT: 'email_sent';
  };

  export function validateTaskStatusTransition(
    taskType: string,
    currentStatus: string,
    newStatus: string
  ): { valid: boolean; error?: string };

  export function getProgressForStatus(
    taskType: string,
    status: string
  ): number;
} 
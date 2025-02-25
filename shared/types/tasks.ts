/**
 * @file tasks.ts
 * @description Shared task types for client-server communication.
 * These types ensure consistent data structures for task operations.
 */

/**
 * Task status enumeration.
 * Defines all possible states a task can be in.
 * Used as a const object for both type and value access.
 */
export const TaskStatus = {
  EMAIL_SENT: 'email_sent',
  COMPLETED: 'completed',
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
} as const;

/**
 * Task status type.
 * TypeScript utility type that extracts the string literal union type from the TaskStatus object.
 */
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

/**
 * Task interface.
 * Represents the complete structure of a task in the system.
 */
export interface Task {
  id: number;
  title: string;
  description?: string;
  task_type: string;
  task_scope: string;
  status: TaskStatus;
  priority: string;
  progress: number;
  assigned_to?: number;
  created_by?: number;
  company_id: number;
  user_email?: string;
  due_date?: string;
  completion_date?: string;
  files_requested: string[];
  files_uploaded: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
} 
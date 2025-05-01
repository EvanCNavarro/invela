/**
 * Task-related type definitions
 */

// Task metadata is a key-value store that can have any properties
export type TaskMetadata = Record<string, any>;

// Task status types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'archived';

export type TaskScope = 'user' | 'company';

export type TaskType = 'kyb' | 'ky3p' | 'open_banking' | 'user_onboarding' | 'custom';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  task_type: TaskType;
  task_scope: TaskScope;
  assigned_to: number | null;
  company_id: number | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  user_email: string | null;
  metadata: TaskMetadata | null;
}

/**
 * Task type definitions for the application
 */

/**
 * Task status options
 */
export type TaskStatus = 
  | 'pending' 
  | 'assigned' 
  | 'in_progress' 
  | 'submitted' 
  | 'rejected' 
  | 'completed' 
  | 'archived';

/**
 * Task type options
 */
export type TaskType = 
  | 'kyb' 
  | 'company_kyb' 
  | 'sp_ky3p_assessment' 
  | 'open_banking' 
  | 'open_banking_survey' 
  | 'company_card' 
  | 'user_onboarding' 
  | 'general';

/**
 * Task scope options
 */
export type TaskScope = 'personal' | 'company';

/**
 * Task interface representing a task in the system
 */
export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  task_scope?: TaskScope;
  assigned_to?: number | null;
  created_by?: number | null;
  company_id: number;
  due_date?: Date | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  completed_at?: Date | null;
  metadata?: Record<string, any> | null;
  priority?: 'low' | 'medium' | 'high' | null;
  progress?: number;
  user_email?: string | null;
  dependencies?: number[] | null;
  template_id?: number | null;
}

/**
 * Task submission data interface
 */
export interface TaskSubmission {
  taskId: number;
  formData: Record<string, any>;
  formType: string;
  files?: any[];
  status?: 'draft' | 'submitted';
  metadata?: Record<string, any>;
}

// Provide an object with enum-like values for external code that needs them as values
export const TaskStatusValues = {
  PENDING: 'pending' as TaskStatus,
  ASSIGNED: 'assigned' as TaskStatus,
  IN_PROGRESS: 'in_progress' as TaskStatus,
  SUBMITTED: 'submitted' as TaskStatus,
  REJECTED: 'rejected' as TaskStatus,
  COMPLETED: 'completed' as TaskStatus,
  ARCHIVED: 'archived' as TaskStatus
};

export const TaskTypeValues = {
  KYB: 'kyb' as TaskType,
  COMPANY_KYB: 'company_kyb' as TaskType,
  KY3P: 'sp_ky3p_assessment' as TaskType,
  OPEN_BANKING: 'open_banking' as TaskType,
  OPEN_BANKING_SURVEY: 'open_banking_survey' as TaskType,
  COMPANY_CARD: 'company_card' as TaskType,
  USER_ONBOARDING: 'user_onboarding' as TaskType,
  GENERAL: 'general' as TaskType
};

export const TaskScopeValues = {
  PERSONAL: 'personal' as TaskScope,
  COMPANY: 'company' as TaskScope
};

export default {
  TaskStatusValues,
  TaskTypeValues,
  TaskScopeValues
};

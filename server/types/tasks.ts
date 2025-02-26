/**
 * @file tasks.ts
 * @description Task related types for client-server communication
 * These types ensure consistent task formats between the client and server.
 */

/**
 * Enumeration of all possible task statuses
 * Represents the lifecycle of a task from creation to completion
 */
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Defines the structure of a task in the system
 * Used for tracking background processes and their progress
 */
export interface Task {
  id: number;
  company_id: number;
  type: string;
  status: TaskStatus;
  progress: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
}

/**
 * Parameters for creating a new task
 * The minimum required information to start a task
 */
export interface CreateTaskParams {
  company_id: number;
  type: string;
  metadata?: Record<string, any>;
}

/**
 * Parameters for updating an existing task
 * Only allows updating specific mutable properties
 */
export interface UpdateTaskParams {
  status?: TaskStatus;
  progress?: number;
  metadata?: Record<string, any>;
  error_message?: string;
}

/**
 * Response format for successful task creation
 */
export interface CreateTaskResponse {
  task_id: number;
} 
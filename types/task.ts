/**
 * Task Types Definition - Centralized task-related type definitions and enums
 * 
 * Provides comprehensive type definitions for task management across the enterprise
 * risk assessment platform. Includes status enumerations, progress mappings, and
 * interface definitions for WebSocket messaging and task state management.
 * 
 * Features:
 * - Task status enumeration with string value mapping
 * - Progress percentage calculations for each status
 * - WebSocket message interfaces for real-time updates
 */

// ========================================
// ENUMS
// ========================================

/**
 * Task Status Enumeration - Comprehensive task lifecycle states
 * 
 * Defines all possible states a task can have throughout its lifecycle from
 * creation to completion. Used for task state management, progress tracking,
 * and workflow automation across the platform.
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

// ========================================
// CONSTANTS
// ========================================

/**
 * Task status progress mapping for percentage calculations
 * 
 * Maps each task status to its corresponding completion percentage for
 * progress tracking and visual indicators throughout the application.
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
 * Task status string values for compatibility with legacy code
 * 
 * Provides typed string constants for components that require string
 * values while maintaining type safety through TaskStatus casting.
 */
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

// ========================================
// INTERFACES
// ========================================

/**
 * Task update interface for real-time WebSocket messaging
 * 
 * Defines the structure for task update messages broadcast through
 * WebSocket connections for real-time task status synchronization.
 * 
 * @param id - Unique task identifier
 * @param status - Current task status from TaskStatus enum
 * @param progress - Completion percentage (0-100)
 * @param metadata - Optional additional task-specific data
 */
export interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, unknown>;
}

// ========================================
// EXPORTS
// ========================================


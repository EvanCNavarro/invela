// Task status definitions
export enum TaskStatus {
  PENDING = 'pending',
  EMAIL_SENT = 'email_sent',
  COMPLETED = 'completed',
  FAILED = 'failed'
};

// Progress mapping for task statuses
export const taskStatusToProgress: Record<TaskStatus, number> = {
  [TaskStatus.PENDING]: 0,
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.COMPLETED]: 100,
  [TaskStatus.FAILED]: 100,
};

// Task type for WebSocket updates
export interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, any>;
}

// API Error class for standardized error handling
export class APIError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// WebSocket related types
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

export interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, any>;
}

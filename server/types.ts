// Task status definitions
export enum TaskStatus {
  PENDING = 'pending',
  NOT_STARTED = 'not_started',
  EMAIL_SENT = 'email_sent',
  COMPLETED = 'completed',
  FAILED = 'failed',
  IN_PROGRESS = 'in_progress',
  READY_FOR_SUBMISSION = 'ready_for_submission',
  SUBMITTED = 'submitted',
  APPROVED = 'approved'
};

// Progress mapping for task statuses
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
};

// Task type for WebSocket updates
export interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, any>;
}

// WebSocket message types for improved type safety
export type MessageType = 
  | 'task_update'       // Task updates (status, progress)
  | 'task_updated'      // New-style task updates (status, progress)
  | 'company_updated'   // Company data updated
  | 'user_updated'      // User data updated
  | 'notification'      // General notification
  | 'tutorial_update'   // Tutorial progress updates
  | 'tutorial_updated'  // New-style tutorial updates
  | 'company_tabs_updated' // Company tabs updated
  | 'tabs_updated'      // New-style tabs updated
  | 'file_uploaded'     // File upload notification
  | 'form_updated'      // Form data updated
  | 'form_submission_completed'; // Form submission completed

// Network Visualization types
export type RiskBucket = 'low' | 'medium' | 'high' | 'critical';

export interface NetworkNode {
  id: number;
  name: string;
  relationshipId: number;
  relationshipType: string;
  relationshipStatus: string;
  riskScore: number;
  riskBucket: RiskBucket;
  accreditationStatus: string;
  revenueTier: string;
  category: string;
}

export interface NetworkCenter {
  id: number;
  name: string;
  riskScore: number;
  riskBucket: RiskBucket;
  accreditationStatus: string;
  revenueTier: string;
  category: string;
}

export interface NetworkVisualizationData {
  center: NetworkCenter;
  nodes: NetworkNode[];
}

// Sankey Flow Visualization types
export interface SankeyNode {
  id: string;
  name: string;
  category: string;
  count: number;
  color: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  sourceColor: string;
  targetColor: string;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}
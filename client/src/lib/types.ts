/**
 * Shared type definitions for the application
 */

/**
 * MessageHandler type for WebSocket subscribers
 */
export type MessageHandler = (data: any) => void;

/**
 * WebSocket Message Interface
 * 
 * This represents the standard format for messages exchanged over WebSocket
 */
export interface WebSocketMessage {
  // The message type/event name
  type: string;
  
  // The message payload (preferred format - newer API)
  payload?: any;
  
  // Alternative payload field (for backwards compatibility - older API)
  data?: any;
  
  // Optional timestamp
  timestamp?: string;
}

/**
 * File Vault Update Message
 * 
 * Specific interface for file vault update events
 */
export interface FileVaultUpdateMessage {
  // Company ID that the update is for
  companyId: number;
  
  // Optional file ID if a specific file was updated
  fileId?: number;
  
  // The action that triggered this update
  action: 'added' | 'updated' | 'deleted' | 'refresh';
  
  // ISO timestamp of the update
  timestamp: string;
}

/**
 * Form Submission Message
 * 
 * Interface for form submission status updates
 */
export interface FormSubmissionMessage {
  // Task ID that the submission is for
  taskId: number;
  
  // Form type (e.g., 'company_kyb', 'sp_ky3p_assessment')
  formType: string;
  
  // Submission status
  status: 'success' | 'error' | 'in_progress';
  
  // Company ID that the form is associated with
  companyId: number;
  
  // Optional file details if a file was generated
  fileId?: number;
  fileName?: string;
  
  // Optional tabs that were unlocked as a result of this submission
  unlockedTabs?: string[];
  
  // Timestamp of the update
  timestamp: string;
}

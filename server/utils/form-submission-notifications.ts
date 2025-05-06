/**
 * Form Submission Notifications Utils
 * 
 * This module provides standardized functions for sending form submission notifications
 * via WebSocket using the unified WebSocket service.
 */

import { broadcastFormSubmission, broadcastTaskUpdate } from './unified-websocket';

// Define the action item interface to properly include the metadata field
interface ActionItem {
  type: string;
  description: string;
  icon: string;
  metadata?: Record<string, any>;
}

interface SubmissionNotificationOptions {
  formType: string;
  taskId: number;
  companyId: number;
  fileName?: string;
  fileId?: number;
  submissionDate?: string; // ISO timestamp
  status?: 'submitted' | 'in_progress' | 'error' | 'completed';
  progress?: number; // 0-100
  error?: string;
  message?: string;
  unlockedTabs?: string[];
  metadata?: Record<string, any>;
}

/**
 * Send a form submission success notification
 */
export function sendFormSubmissionSuccess(options: SubmissionNotificationOptions) {
  const { formType, taskId, companyId, fileName, fileId, submissionDate, unlockedTabs, metadata = {} } = options;
  
  const now = new Date().toISOString();
  const submissionTimestamp = submissionDate || now;
  
  // Create actions array for the notification
  const actions: ActionItem[] = [
    {
      type: 'form_submission',
      description: 'Form submitted successfully',
      icon: 'check-circle'
    }
  ];
  
  // Add file generation action if a file was generated
  if (fileId && fileName) {
    actions.push({
      type: 'file_generation',
      description: 'PDF file generated',
      icon: 'file-text',
      metadata: { fileId } // Use metadata instead of data
    });
  }
  
  // Add dashboard unlock action if tabs were unlocked
  if (unlockedTabs && unlockedTabs.length > 0) {
    actions.push({
      type: 'dashboard_access',
      description: 'Dashboard access granted',
      icon: 'unlock'
    });
  }
  
  // Send the form submission notification
  broadcastFormSubmission(
    formType,
    taskId,
    companyId,
    {
      fileName,
      fileId,
      submissionDate: submissionTimestamp,
      unlockedTabs,
      status: 'submitted',
      message: 'Form submitted successfully',
      completedActions: actions,
      ...metadata
    }
  );
  
  // Also send a task update notification for redundancy
  broadcastTaskUpdate(
    taskId,
    100, // 100% progress for successful submission
    'submitted',
    {
      formType,
      submissionComplete: true,
      fileId,
      fileName,
      submissionDate: submissionTimestamp,
      unlockedTabs,
      ...metadata
    }
  );
  
  console.log(`[FormNotifications] Sent success notification for ${formType} task ${taskId}`);
  
  return true;
}

/**
 * Send a form submission error notification
 */
export function sendFormSubmissionError(options: SubmissionNotificationOptions) {
  const { formType, taskId, companyId, error, message, metadata = {} } = options;
  
  const errorMessage = message || error || 'An error occurred during form submission';
  
  // Send the task update notification with error status
  broadcastTaskUpdate(
    taskId,
    options.progress || 0, // Keep current progress or reset to 0
    'error',
    {
      formType,
      error: errorMessage,
      submissionDate: new Date().toISOString(),
      ...metadata
    }
  );
  
  console.log(`[FormNotifications] Sent error notification for ${formType} task ${taskId}: ${errorMessage}`);
  
  return true;
}

/**
 * Send a form submission in-progress notification
 */
export function sendFormSubmissionInProgress(options: SubmissionNotificationOptions) {
  const { formType, taskId, companyId, progress = 50, message, metadata = {} } = options;
  
  // Send the task update notification with in_progress status
  broadcastTaskUpdate(
    taskId,
    progress,
    'in_progress',
    {
      formType,
      submissionDate: new Date().toISOString(),
      message: message || 'Form submission in progress',
      ...metadata
    }
  );
  
  console.log(`[FormNotifications] Sent in-progress notification for ${formType} task ${taskId} (${progress}%)`);
  
  return true;
}
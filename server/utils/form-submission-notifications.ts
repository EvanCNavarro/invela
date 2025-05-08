/**
 * Form Submission Notifications Utils
 * 
 * This module provides standardized functions for sending form submission notifications
 * via WebSocket using both the enhanced WebSocket service and the unified WebSocket service
 * for maximum compatibility and reliability.
 */

import { broadcastFormSubmission as unifiedBroadcastFormSubmission, broadcastTaskUpdate as unifiedBroadcastTaskUpdate } from './unified-websocket';
import { 
  broadcastFormSubmission, 
  broadcastTaskUpdate, 
  sendFormSubmissionError as sendFormSubmissionErrorWs 
} from '../services/websocket';

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
  
  // Ensure metadata has submission_date for UI display
  const enhancedMetadata = {
    ...metadata,
    submission_date: submissionTimestamp,
  };

  // Send the form submission notification with updated API
  broadcastFormSubmission({
    taskId,
    formType,
    status: 'submitted',
    companyId,
    metadata: {
      fileName,
      fileId,
      submissionDate: submissionTimestamp,
      unlockedTabs,
      message: 'Form submitted successfully',
      completedActions: actions,
      ...enhancedMetadata
    }
  });
  
  // Also send a task update notification for redundancy with updated API
  broadcastTaskUpdate({
    taskId,
    progress: 100, // 100% progress for successful submission
    status: 'submitted',
    metadata: {
      formType,
      submissionComplete: true,
      fileId,
      fileName,
      // Include submissionDate as a separate property
      submissionDate: submissionTimestamp,
      unlockedTabs,
      ...enhancedMetadata // Use the enhanced metadata with submission_date
    }
  });
  
  console.log(`[FormNotifications] Sent success notification for ${formType} task ${taskId}`);
  
  return true;
}

/**
 * Send a form submission error notification
 * 
 * This enhanced version uses both the enhanced WebSocket service and the unified WebSocket service
 * for maximum compatibility and reliability.
 */
export function sendFormSubmissionError(options: SubmissionNotificationOptions) {
  const { formType, taskId, companyId, error, message, metadata = {} } = options;
  
  const errorMessage = message || error || 'An error occurred during form submission';
  const submissionTimestamp = new Date().toISOString();
  
  // Ensure metadata has submission_date for UI display
  const enhancedMetadata = {
    ...metadata,
    submission_date: submissionTimestamp,
    errorCode: metadata.errorCode || 'FORM_SUBMISSION_ERROR',
    errorPhase: metadata.errorPhase || 'submission',
    errorOrigin: metadata.errorOrigin || 'form_handler',
    recoverable: metadata.recoverable !== false // Default to true unless explicitly set to false
  };
  
  try {
    // Use the enhanced WebSocket service's specialized error function
    sendFormSubmissionError({
      taskId,
      formType,
      companyId,
      error: errorMessage,
      message: `Form submission failed: ${errorMessage}`,
      metadata: enhancedMetadata
    });
    
    // Also send via the task update channel for maximum compatibility
    broadcastTaskUpdate({
      taskId,
      progress: options.progress !== undefined ? options.progress : null, // Keep current progress if specified
      status: 'error',
      metadata: {
        formType,
        error: errorMessage,
        submissionDate: submissionTimestamp,
        ...enhancedMetadata
      }
    });
    
    // For maximum backward compatibility, also use the unified implementation
    try {
      unifiedBroadcastTaskUpdate({
        taskId,
        progress: options.progress || 0,
        status: 'error',
        metadata: {
          formType,
          error: errorMessage,
          submissionDate: submissionTimestamp,
          ...enhancedMetadata
        }
      });
    } catch (unifiedError) {
      console.warn('[FormNotifications] Failed to send via unified implementation:', unifiedError);
    }
    
    console.log(`[FormNotifications] Sent enhanced error notification for ${formType} task ${taskId}: ${errorMessage}`);
  } catch (error) {
    console.error('[FormNotifications] Failed to send error notification:', error);
    
    // Fall back to the simplest implementation if all else fails
    try {
      broadcastTaskUpdate({
        taskId,
        status: 'error',
        metadata: { error: errorMessage }
      });
    } catch {
      console.error('[FormNotifications] All error notification attempts failed');
    }
  }
  
  return true;
}

/**
 * Send a form submission in-progress notification
 */
export function sendFormSubmissionInProgress(options: SubmissionNotificationOptions) {
  const { formType, taskId, companyId, progress = 50, message, metadata = {} } = options;
  
  const submissionTimestamp = new Date().toISOString();
  
  // Ensure metadata has submission_date for UI display
  const enhancedMetadata = {
    ...metadata,
    submission_date: submissionTimestamp,
  };
  
  // Send the task update notification with in_progress status using updated API
  broadcastTaskUpdate({
    taskId,
    progress,
    status: 'in_progress',
    metadata: {
      formType,
      // Include submissionDate as a separate property
      submissionDate: submissionTimestamp,
      message: message || 'Form submission in progress',
      ...enhancedMetadata
    }
  });
  
  console.log(`[FormNotifications] Sent in-progress notification for ${formType} task ${taskId} (${progress}%)`);
  
  return true;
}
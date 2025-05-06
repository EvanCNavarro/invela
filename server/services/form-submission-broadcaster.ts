/**
 * Form Submission Broadcaster
 * 
 * This module provides a standardized way to broadcast form submission events
 * via WebSockets. It ensures consistent messaging for all form types:
 * - KYB
 * - KY3P
 * - Open Banking
 */

import { logger } from '../utils/logger';

interface FormSubmissionData {
  taskId: number;
  formType: 'kyb' | 'ky3p' | 'open_banking';
  status: string;
  companyId: number;
  fileId?: string | number;
  submissionDate?: string;
  progress?: number;
  metadata?: Record<string, any>;
  source?: string;
}

interface TaskUpdateData {
  id: number;
  status: string;
  progress: number;
  metadata?: Record<string, any>;
}

/**
 * Broadcast form submission events through various channels
 * 
 * This function sends WebSocket messages on multiple channels to ensure
 * clients receive the update, with fallbacks for different client types.
 */
export async function broadcastFormSubmission(data: FormSubmissionData): Promise<{
  success: boolean;
  channels: string[];
  error?: string;
}> {
  const { taskId, formType, status, companyId } = data;
  const timestamp = new Date().toISOString();
  const channels: string[] = [];
  
  try {
    // Get WebSocket broadcast function
    const { broadcast } = require('./websocket');
    
    // 1. Broadcast on the specific form_submission channel
    try {
      broadcast('form_submission', {
        taskId,
        formType,
        status,
        companyId,
        timestamp,
        submissionDate: data.submissionDate || timestamp,
        fileId: data.fileId,
        source: data.source || 'form-submission-broadcaster'
      });
      channels.push('form_submission');
      
      logger.debug(`[Form Broadcaster] Sent message on 'form_submission' channel`, {
        taskId,
        formType
      });
    } catch (error) {
      logger.error(`[Form Broadcaster] Error broadcasting on 'form_submission' channel`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        taskId,
        formType
      });
    }
    
    // 2. Broadcast on the task_update channel (for dashboard updates)
    try {
      broadcast('task_update', {
        id: taskId,
        status,
        progress: data.progress || 100,
        metadata: {
          ...(data.metadata || {}),
          lastUpdated: timestamp,
          submissionDate: data.submissionDate || timestamp,
          broadcastSource: data.source || 'form-submission-broadcaster'
        }
      });
      channels.push('task_update');
      
      logger.debug(`[Form Broadcaster] Sent message on 'task_update' channel`, {
        taskId,
        formType
      });
    } catch (error) {
      logger.error(`[Form Broadcaster] Error broadcasting on 'task_update' channel`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        taskId,
        formType
      });
    }
    
    // 3. Broadcast on the generic form_submission_complete channel (as fallback)
    try {
      broadcast('form_submission_complete', {
        taskId,
        formType,
        status,
        timestamp,
        source: data.source || 'form-submission-broadcaster'
      });
      channels.push('form_submission_complete');
      
      logger.debug(`[Form Broadcaster] Sent message on 'form_submission_complete' channel`, {
        taskId,
        formType
      });
    } catch (error) {
      logger.error(`[Form Broadcaster] Error broadcasting on 'form_submission_complete' channel`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        taskId,
        formType
      });
    }
    
    return {
      success: channels.length > 0,
      channels
    };
  } catch (error) {
    logger.error(`[Form Broadcaster] Critical error in broadcaster`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      formType
    });
    
    return {
      success: false,
      channels,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send a delayed broadcast after a specified time period
 * 
 * This is useful for ensuring clients receive updates even if they
 * reconnect after a brief disconnection.
 */
export function scheduleDelayedBroadcast(
  data: FormSubmissionData,
  delayMs: number = 2000
): void {
  setTimeout(() => {
    logger.debug(`[Form Broadcaster] Sending delayed broadcast after ${delayMs}ms`, {
      taskId: data.taskId,
      formType: data.formType,
      delay: delayMs
    });
    
    // Use a source that indicates this is a delayed broadcast
    broadcastFormSubmission({
      ...data,
      source: `delayed-broadcast-${delayMs}ms`
    })
      .then((result) => {
        if (result.success) {
          logger.debug(`[Form Broadcaster] Delayed broadcast successful`, {
            taskId: data.taskId,
            formType: data.formType,
            channels: result.channels,
            delay: delayMs
          });
        } else {
          logger.warn(`[Form Broadcaster] Delayed broadcast failed`, {
            taskId: data.taskId,
            formType: data.formType,
            error: result.error,
            delay: delayMs
          });
        }
      })
      .catch((error) => {
        logger.error(`[Form Broadcaster] Error in delayed broadcast`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          taskId: data.taskId,
          formType: data.formType,
          delay: delayMs
        });
      });
  }, delayMs);
}

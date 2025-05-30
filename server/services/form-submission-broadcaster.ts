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
import { broadcastTaskUpdate } from "../utils/unified-websocket";
import { broadcast as unifiedBroadcast } from '../utils/unified-websocket';

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
    // 1. Use our enhanced WebSocket service for form submission events
    let websocketSuccess = false;
    
    try {
      // Use the unified WebSocket broadcast system for form submission events
      // This provides consistent, reliable broadcasting aligned with the application's architecture
      unifiedBroadcast('form_submission_completed', {
        taskId,
        formType,
        status: 'submitted',
        companyId,
        submissionDate: new Date().toISOString()
      });
      
      channels.push('form_submission_completed');
      websocketSuccess = true;
      
      logger.debug(`[Form Broadcaster] Successfully broadcast form submission via unified WebSocket`, {
        taskId,
        formType,
        companyId,
        status: 'submitted'
      });
    } catch (broadcastError) {
      logger.warn(`[Form Broadcaster] Error broadcasting form submission via unified WebSocket`, {
        error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error',
        taskId,
        formType
      });
    }
    
    // If enhanced WebSocket service didn't work, try unified broadcast system
    if (!websocketSuccess) {
      try {
        unifiedBroadcast('form_submission_completed', {
          taskId,
          formType,
          status,
          companyId,
          timestamp,
          submissionDate: data.submissionDate || timestamp,
          fileId: data.fileId,
          source: data.source || 'form-submission-broadcaster'
        });
        channels.push('form_submission_completed');
        websocketSuccess = true;
        
        logger.debug(`[Form Broadcaster] Sent message using unified broadcast service`, {
          taskId,
          formType
        });
      } catch (unifiedError) {
        logger.error(`[Form Broadcaster] Error using unified broadcast service`, {
          error: unifiedError instanceof Error ? unifiedError.message : 'Unknown error',
          taskId,
          formType
        });
        
        // Last resort, try legacy broadcast
        try {
          const { broadcast } = require('./websocket');
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
          websocketSuccess = true;
          
          logger.debug(`[Form Broadcaster] Sent message using legacy broadcast`, {
            taskId,
            formType
          });
        } catch (legacyError) {
          logger.error(`[Form Broadcaster] All broadcast methods failed`, {
            error: legacyError instanceof Error ? legacyError.message : 'Unknown error',
            taskId,
            formType
          });
        }
      }
    }
    
    // 2. Broadcast task update for dashboard updates
    let taskUpdateSuccess = false;
    
    try {
      // Use unified WebSocket broadcast system for task updates
      // Maintains consistency with application's homogeneous broadcasting architecture
      unifiedBroadcast('task_update', {
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
      taskUpdateSuccess = true;
      
      logger.debug(`[Form Broadcaster] Successfully broadcast task update via unified WebSocket`, {
        taskId,
        formType,
        status,
        progress: data.progress || 100
      });
    } catch (broadcastError) {
      logger.warn(`[Form Broadcaster] Error using enhanced WebSocket for task update, falling back to unified`, {
        error: enhancedError instanceof Error ? enhancedError.message : 'Unknown error',
        taskId,
        formType
      });
    }
    
    // If enhanced task update didn't work, fall back to unified broadcast
    if (!taskUpdateSuccess) {
      try {
        unifiedBroadcast('task_updated', {
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
        channels.push('task_updated');
        taskUpdateSuccess = true;
        
        logger.debug(`[Form Broadcaster] Sent task update using unified broadcast service`, {
          taskId,
          formType
        });
      } catch (unifiedError) {
        logger.error(`[Form Broadcaster] All task update methods failed`, {
          error: unifiedError instanceof Error ? unifiedError.message : 'Unknown error',
          taskId,
          formType
        });
      }
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

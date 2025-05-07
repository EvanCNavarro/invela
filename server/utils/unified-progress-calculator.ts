/**
 * Unified Progress Calculator (Extension Helper)
 * 
 * This utility provides additional helper functions that complement
 * the existing unified-task-progress module. It serves as an expansion
 * for specific use cases while maintaining compatibility with the
 * existing unified approach.
 * 
 * NOTE: The core progress calculation functionality is already implemented
 * in server/utils/unified-task-progress.ts. This file provides supplementary
 * utilities that work alongside that implementation.
 */

import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { tasks } from '@db/schema';
import { FormResponseType } from './unified-form-response-handler';
import { db } from '@db';
import { WebSocket, WebSocketServer } from 'ws';

// Re-export the core functionality from unified-task-progress.ts
export { updateTaskProgress } from './unified-task-progress';

// Import WebSocket utilities with robust fallback mechanisms
import { 
  broadcast as broadcastToClients 
} from '../services/websocket';

// Import unified WebSocket implementation
import { 
  broadcastTaskUpdate as unifiedBroadcastTaskUpdate,
  getWebSocketServer
} from '../utils/unified-websocket';

/**
 * Enhanced version of updateTaskProgressAndBroadcast with fallback mechanisms
 * This method attempts to update the task progress and then reliably broadcast
 * the update to clients, with several layers of fallback mechanisms.
 * 
 * @param taskId The task ID to update
 * @param taskType The task type (kyb, ky3p, open_banking, etc.)
 * @param options Additional options for the update
 * @returns The updated progress value
 */
// Define the result type for progress updates to fix type errors
interface ProgressUpdateResult {
  progress: number;
  status: string;
  [key: string]: any;
}

export async function updateTaskProgressAndBroadcast(
  taskId: number,
  taskType: string,
  options: {
    debug?: boolean;
    forceUpdate?: boolean;
    forceProgress?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<number> {
  try {
    // First update the task progress in the database
    const { updateTaskProgress } = await import('./unified-task-progress');
    const result = await updateTaskProgress(taskId, taskType, options);
    
    // Create a unique message ID for tracking this broadcast
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Attempt to broadcast using multiple approaches for maximum reliability
    let broadcastSuccess = false;
    const errors: any[] = [];
    
    // Approach 1: Try the unified implementation first
    try {
      await unifiedBroadcastTaskUpdate({
        taskId,
        progress: result.progress,
        status: result.status,
        metadata: {
          ...options.metadata,
          messageId,
          source: 'unified-progress-calculator',
          timestamp: new Date().toISOString()
        }
      });
      broadcastSuccess = true;
      logger.debug(`[UnifiedProgressCalc] Successfully broadcast task update using unified implementation`, { 
        taskId, messageId 
      });
    } catch (unifiedError) {
      errors.push({
        method: 'unified',
        error: unifiedError instanceof Error ? unifiedError.message : String(unifiedError)
      });
    }
    
    // Approach 2: Try the websocket service as fallback
    if (!broadcastSuccess) {
      try {
        await broadcastToClients('task_update', {
          taskId,
          progress: result.progress,
          status: result.status,
          metadata: {
            ...options.metadata,
            messageId,
            source: 'unified-progress-calculator-fallback',
            timestamp: new Date().toISOString()
          }
        });
        broadcastSuccess = true;
        logger.debug(`[UnifiedProgressCalc] Successfully broadcast task update using WebSocket service`, { 
          taskId, messageId 
        });
      } catch (serviceError) {
        errors.push({
          method: 'service',
          error: serviceError instanceof Error ? serviceError.message : String(serviceError)
        });
      }
    }
    
    // Approach 3: Direct broadcast as last resort
    if (!broadcastSuccess) {
      try {
        // Get WebSocket server instance
        const wss = getWebSocketServer();
        
        if (wss && wss.clients && wss.clients.size > 0) {
          let successCount = 0;
          
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              try {
                client.send(JSON.stringify({
                  type: 'task_update',
                  taskId,
                  progress: result.progress,
                  status: result.status,
                  metadata: {
                    ...options.metadata,
                    messageId,
                    source: 'direct-fallback',
                    timestamp: new Date().toISOString()
                  }
                }));
                successCount++;
              } catch (sendError) {
                // Individual client error, continue with others
              }
            }
          });
          
          if (successCount > 0) {
            broadcastSuccess = true;
            logger.info(`[WebSocket] Broadcast task_update to ${successCount} clients via direct fallback`, {
              messageId,
              taskId,
              activeClients: successCount
            });
          }
        }
      } catch (directError) {
        errors.push({
          method: 'direct',
          error: directError instanceof Error ? directError.message : String(directError)
        });
      }
    }
    
    // Log success or failure
    if (broadcastSuccess) {
      logger.info(`[UnifiedProgressCalc] Successfully broadcast task update for task ${taskId}`, {
        progress: result.progress,
        status: result.status,
        messageId
      });
    } else {
      logger.error(`[UnifiedProgressCalc] Failed to broadcast task update for task ${taskId}. Will retry on next update.`, {
        errors,
        progress: result.progress,
        status: result.status,
        messageId
      });
    }
    
    return result.progress || 0;
  } catch (error) {
    logger.error('[UnifiedProgressCalc] Error in progress update and broadcast:', {
      taskId,
      taskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Re-throw so the caller knows something went wrong
    throw error;
  }
}

/**
 * Calculate and broadcast progress for a task
 * 
 * This function provides a simplified interface for calculating and broadcasting
 * task progress with improved error handling and reporting.
 * 
 * @param taskId The task ID to update
 * @param taskType The task type (kyb, ky3p, open_banking, etc.)
 * @param options Additional options for the update
 * @returns The updated progress value
 */
export async function updateAndBroadcastProgress(
  taskId: number,
  taskType: string,
  options: {
    debug?: boolean;
    forceUpdate?: boolean;
    forceProgress?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<number> {
  try {
    return await updateTaskProgressAndBroadcast(taskId, taskType, options);
  } catch (error) {
    logger.error(`[KY3P] Error updating and broadcasting progress for task ${taskId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Fallback: Try to just update the progress in the database without broadcasting
    try {
      const { updateTaskProgress } = await import('./unified-task-progress');
      const result = await updateTaskProgress(taskId, taskType, options);
      return result.progress || 0;
    } catch (dbError) {
      logger.error(`[KY3P] Critical error: Failed even basic progress update for task ${taskId}:`, {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
      throw dbError;
    }
  }
}

/**
 * Format progress value for SQL storage (helper that matches existing implementation)
 * 
 * This function ensures that progress values are properly formatted for
 * database storage, avoiding issues with type conversion or validation.
 */
export function getProgressSqlValue(progress: number): number {
  // Ensure progress is within valid range (0-100)
  const validatedProgress = Math.max(0, Math.min(100, progress));
  
  // Round to nearest integer to avoid floating point issues
  return Math.round(validatedProgress);
}

/**
 * Preserve existing progress in certain scenarios
 * 
 * Some operations should preserve the existing progress rather than
 * recalculating it. This function determines when to preserve progress.
 */
export function shouldPreserveProgress(
  operation: string,
  metadata: Record<string, any> | null | undefined
): boolean {
  // Preserve progress during edits if metadata indicates
  if (operation === 'edit' && metadata?.preserveProgress === true) {
    return true;
  }
  
  // Preserve progress during clear operations if indicated
  if (operation === 'clear' && metadata?.preserveProgress === true) {
    return true;
  }
  
  // Don't preserve progress during submissions
  if (operation === 'submit') {
    return false;
  }
  
  // Default to not preserving
  return false;
}

/**
 * Determine if a task is at 100% progress
 * 
 * This utility helps avoid the "midpoint bias" by ensuring that tasks are truly
 * at 100% progress when all fields are completed and the submission is valid.
 */
export function isTaskComplete(
  progress: number,
  metadata: Record<string, any> | null | undefined
): boolean {
  // Task is complete if:
  // 1. Progress is 100%
  // 2. Has a submission flag or date
  // 3. No validation errors are present
  
  const hasSubmissionFlag = metadata?.submitted === true;
  const hasSubmissionDate = !!metadata?.submittedAt || !!metadata?.submission_date;
  const hasValidationErrors = metadata?.validationErrors && 
    (Array.isArray(metadata.validationErrors) ? 
      metadata.validationErrors.length > 0 : 
      Object.keys(metadata.validationErrors).length > 0);
  
  return progress === 100 && 
    (hasSubmissionFlag || hasSubmissionDate) && 
    !hasValidationErrors;
}

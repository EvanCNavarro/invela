/**
 * Task Status Middleware
 * 
 * This middleware ensures consistent task status handling,
 * particularly for submission state transitions.
 * 
 * Key features:
 * - Guarantees submitted tasks always have 100% progress
 * - Broadcasts updates via WebSockets for real-time UI updates
 * - Provides comprehensive detection of submission indicators
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastTaskUpdate } from '../utils/unified-websocket';
import { logger } from '../utils/logger';

/**
 * Middleware to ensure a task is marked as submitted
 * Used after operations that should result in task submission
 */
export const ensureTaskSubmitted = (taskIdParam: string = 'taskId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let taskId: number;
      // Get task ID from req.params or req.body
      if (req.params && req.params[taskIdParam]) {
        taskId = parseInt(req.params[taskIdParam]);
      } else if (req.body && req.body.taskId) {
        taskId = parseInt(req.body.taskId);
      } else {
        logger.debug('[TaskStatusMiddleware] No task ID found in request', {
          params: req.params,
          body: typeof req.body === 'object' ? 'Present' : 'Missing'
        });
        return next();
      }
      
      if (isNaN(taskId)) {
        logger.warn('[TaskStatusMiddleware] Invalid task ID', { taskId: req.params[taskIdParam] });
        return next();
      }
      
      // Check if the task has a submission date
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        logger.warn('[TaskStatusMiddleware] Task not found', { taskId });
        return next();
      }
      
      // Enhanced submission detection - check multiple indicators
      const metadata = task.metadata || {};
      const hasSubmissionDate = !!metadata.submissionDate || !!metadata.submission_date;
      const hasSubmittedFlag = !!metadata.submitted || !!metadata.explicitlySubmitted;
      const hasFileId = !!metadata.fileId;
      
      const needsStatusFix = 
        (hasSubmissionDate || hasSubmittedFlag || hasFileId) && 
        task.status !== 'submitted';
      
      const needsProgressFix = 
        (task.status === 'submitted' || hasSubmissionDate || hasSubmittedFlag || hasFileId) && 
        task.progress !== 100;
      
      if (needsStatusFix || needsProgressFix) {
        logger.info('[TaskStatusMiddleware] Fixing task submission state', {
          taskId,
          currentStatus: task.status,
          currentProgress: task.progress,
          hasSubmissionDate,
          hasSubmittedFlag,
          hasFileId,
          needsStatusFix,
          needsProgressFix
        });
        
        // Update task status to "submitted" and ensure progress is 100%
        const updatedTask = await db.update(tasks)
          .set({ 
            status: 'submitted',
            progress: 100, // Ensure progress is 100% when submitted
            metadata: {
              ...metadata,
              submitted: true,
              lastSubmissionFix: new Date().toISOString()
            }
          })
          .where(eq(tasks.id, taskId))
          .returning();
        
        logger.info('[TaskStatusMiddleware] Task updated to submitted state', {
          taskId,
          status: 'submitted',
          progress: 100
        });
        
        // Broadcast the update to all connected clients
        try {
          await broadcastTaskUpdate({
            taskId: taskId,
            status: 'submitted',
            progress: 100,
            metadata: {
              ...metadata,
              submitted: true,
              lastSubmissionFix: new Date().toISOString()
            }
          });
          
          logger.info('[TaskStatusMiddleware] WebSocket update broadcasted', { taskId });
        } catch (wsError) {
          logger.error('[TaskStatusMiddleware] Error broadcasting WebSocket update', {
            taskId,
            error: wsError instanceof Error ? wsError.message : String(wsError)
          });
          // Continue execution even if broadcast fails
        }
      }
      
      // Continue with the next middleware or route handler
      next();
    } catch (error) {
      logger.error('[TaskStatusMiddleware] Error ensuring task submitted', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      next(error);
    }
  };
};

/**
 * Enhanced utility method to fix task status to SUBMITTED with 100% progress
 * and broadcast the update via WebSockets
 * 
 * Key improvements:
 * 1. Comprehensive submission indicator detection
 * 2. Structured logging for better diagnostics
 * 3. WebSocket broadcasting to update clients in real-time
 * 4. Enhanced metadata with reconciliation timestamps
 * 
 * @param taskId The ID of the task to fix
 * @param options Optional configuration settings
 * @returns Promise<boolean> Success status
 */
export async function fixTaskSubmittedStatus(
  taskId: number, 
  options: { 
    forceUpdate?: boolean,
    skipBroadcast?: boolean
  } = {}
): Promise<boolean> {
  const { forceUpdate = false, skipBroadcast = false } = options;
  const operationId = `task_fix_${taskId}_${Date.now()}`;
  
  logger.info('[TaskStatusMiddleware] Starting submission status fix', {
    taskId,
    operationId,
    forceUpdate,
    skipBroadcast
  });
  
  try {
    // Get the task with full details
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      logger.warn('[TaskStatusMiddleware] Task not found', { taskId, operationId });
      return false;
    }
    
    // Enhanced submission detection - check multiple indicators
    const metadata = task.metadata || {};
    const hasSubmissionDate = !!metadata.submissionDate || !!metadata.submission_date;
    const hasSubmittedFlag = !!metadata.submitted || !!metadata.explicitlySubmitted;
    const hasFileId = !!metadata.fileId;
    const isTerminalState = task.status === 'submitted' || task.status === 'completed';
    
    // Log all submission indicators for diagnostics
    logger.debug('[TaskStatusMiddleware] Task submission indicators', {
      taskId,
      hasSubmissionDate,
      hasSubmittedFlag,
      hasFileId,
      isTerminalState,
      currentStatus: task.status,
      currentProgress: task.progress,
      operationId
    });
    
    // Determine if task needs fixing
    const isSubmitted = hasSubmissionDate || hasSubmittedFlag || hasFileId || isTerminalState;
    const needsStatusFix = isSubmitted && !isTerminalState;
    const needsProgressFix = isSubmitted && task.progress !== 100;
    
    // Only proceed if the task needs fixing or we're forcing an update
    if (!forceUpdate && !needsStatusFix && !needsProgressFix) {
      // For submitted tasks with correct progress, nothing to fix
      if (task.status === 'submitted' && task.progress === 100) {
        logger.info('[TaskStatusMiddleware] Task already has correct submission state', {
          taskId,
          status: task.status,
          progress: task.progress,
          operationId
        });
        return true;
      }
      
      logger.info('[TaskStatusMiddleware] Task does not need submission fixes', {
        taskId,
        status: task.status,
        progress: task.progress,
        isSubmitted,
        operationId
      });
      return false;
    }
    
    logger.info('[TaskStatusMiddleware] Applying submission fixes to task', {
      taskId,
      fromStatus: task.status,
      fromProgress: task.progress,
      toStatus: 'submitted',
      toProgress: 100,
      operationId
    });
    
    // Update task with submtted status and 100% progress
    const updatedData = { 
      status: 'submitted' as const,
      progress: 100, // Always set progress to 100% for submitted tasks
      metadata: {
        ...metadata,
        submitted: true,
        lastSubmissionFix: new Date().toISOString(),
        reconciliationTimestamp: new Date().toISOString(),
        // Ensure we have both date formats for maximum compatibility
        submissionDate: metadata.submissionDate || metadata.submission_date || new Date().toISOString(),
        submission_date: metadata.submission_date || metadata.submissionDate || new Date().toISOString()
      }
    };
    
    // Apply the update to the database
    const result = await db.update(tasks)
      .set(updatedData)
      .where(eq(tasks.id, taskId))
      .returning();
    
    // Check if update was successful
    if (!result || result.length === 0) {
      logger.error('[TaskStatusMiddleware] Failed to update task', {
        taskId,
        operationId
      });
      return false;
    }
    
    logger.info('[TaskStatusMiddleware] Successfully updated task status and progress', {
      taskId,
      newStatus: 'submitted',
      newProgress: 100,
      operationId
    });
    
    // Broadcast the update via WebSocket if not skipped
    if (!skipBroadcast) {
      try {
        // Broadcast both message formats for maximum compatibility
        await broadcastTaskUpdate({
          taskId,
          status: 'submitted',
          progress: 100,
          metadata: updatedData.metadata
        });
        
        logger.info('[TaskStatusMiddleware] WebSocket update broadcast successful', {
          taskId,
          operationId
        });
      } catch (wsError) {
        logger.error('[TaskStatusMiddleware] Error broadcasting WebSocket update', {
          taskId,
          error: wsError instanceof Error ? wsError.message : String(wsError),
          stack: wsError instanceof Error ? wsError.stack : undefined,
          operationId
        });
        // Continue execution even if broadcast fails
      }
    }
    
    return true;
  } catch (error) {
    logger.error('[TaskStatusMiddleware] Error fixing task submitted status', {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      operationId
    });
    return false;
  }
}
/**
 * Task Status Enforcement Utility
 * 
 * This utility ensures that all submitted tasks maintain a consistent state
 * with proper status and progress values across the application.
 * 
 * Key features:
 * - Enforces submitted status always has 100% progress
 * - Provides consistent detection of submission indicators
 * - Broadcasts updates via WebSockets for real-time UI updates
 * - Supports all task types (KYB, KY3P, Open Banking)
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from './logger';
import { broadcastTaskUpdate } from './unified-websocket';
import { MessageType, TaskStatus } from '../types';

// Constants for consistency
const PROGRESS_COMPLETE = 100;
const SUBMITTED_STATUS = 'submitted';

/**
 * Task status update result
 */
interface TaskStatusUpdateResult {
  success: boolean;
  taskId: number;
  message?: string;
  oldStatus?: string;
  newStatus?: string;
  oldProgress?: number;
  newProgress?: number;
  wasFixed?: boolean;
  timestamp?: string;
  error?: string;
}

/**
 * Task status enforcement options
 */
interface TaskStatusOptions {
  forceUpdate?: boolean;
  skipBroadcast?: boolean;
  debug?: boolean;
  transactionId?: string;
  source?: string;
}

/**
 * Ensure a submitted task has 100% progress
 * 
 * This function ensures that any task with "submitted" status
 * always has 100% progress in the database and broadcasts the update
 * to all connected clients.
 * 
 * @param taskId Task ID to enforce status for
 * @param options Options for enforcement behavior
 * @returns Promise with the result of the enforcement
 */
export async function enforceSubmittedTaskStatus(
  taskId: number,
  options: TaskStatusOptions = {}
): Promise<TaskStatusUpdateResult> {
  const { 
    forceUpdate = false, 
    skipBroadcast = false,
    debug = false,
    transactionId = `enforce_status_${Date.now()}`,
    source = 'status_enforcer'
  } = options;
  
  logger.info('[TaskStatusEnforcer] Starting status enforcement', {
    taskId,
    forceUpdate,
    skipBroadcast,
    transactionId,
    source
  });
  
  try {
    // 1. Fetch current task state
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      logger.warn('[TaskStatusEnforcer] Task not found', { taskId, transactionId });
      return {
        success: false,
        taskId,
        error: 'TASK_NOT_FOUND',
        message: `Task ${taskId} not found`
      };
    }
    
    // 2. Check for submission indicators
    const metadata = task.metadata || {};
    
    // Primary submission indicators
    const hasSubmissionDate = !!metadata.submissionDate || !!metadata.submission_date;
    const hasSubmittedFlag = !!metadata.submitted || !!metadata.explicitlySubmitted;
    const hasFileId = !!metadata.fileId;
    
    // Secondary submission indicators (specific to form types)
    const hasFormFileId = !!metadata.formFileId;
    const hasKy3pFormFile = !!metadata.ky3pFormFile || !!metadata.securityFormFile;
    const hasSubmissionTimestamp = !!metadata.submissionTimestamp || !!metadata.submittedAt;
    
    // Compile all indicators for comprehensive detection
    const submissionIndicators = {
      hasSubmissionDate,
      hasSubmittedFlag,
      hasFileId,
      hasFormFileId,
      hasKy3pFormFile,
      hasSubmissionTimestamp,
      status: task.status,
      progress: task.progress,
      metadata: Object.keys(metadata)
    };
    
    if (debug) {
      logger.debug('[TaskStatusEnforcer] Task submission indicators', {
        taskId,
        ...submissionIndicators,
        transactionId
      });
    }
    
    // 3. Determine if this task has been submitted
    const isSubmittedStatus = task.status === SUBMITTED_STATUS;
    const hasAnySubmissionIndicator = 
      hasSubmissionDate || 
      hasSubmittedFlag || 
      hasFileId || 
      hasFormFileId || 
      hasKy3pFormFile || 
      hasSubmissionTimestamp;
    
    const isSubmitted = isSubmittedStatus || hasAnySubmissionIndicator;
    
    if (!isSubmitted && !forceUpdate) {
      logger.info('[TaskStatusEnforcer] Task is not submitted, no action needed', {
        taskId,
        status: task.status,
        progress: task.progress,
        transactionId
      });
      
      return {
        success: true,
        taskId,
        wasFixed: false,
        message: 'Task is not submitted, no action needed',
        oldStatus: task.status,
        oldProgress: task.progress
      };
    }
    
    // 4. Check if task needs fixing
    const needsStatusFix = isSubmitted && task.status !== SUBMITTED_STATUS;
    const needsProgressFix = isSubmitted && task.progress !== PROGRESS_COMPLETE;
    
    if (!needsStatusFix && !needsProgressFix && !forceUpdate) {
      logger.info('[TaskStatusEnforcer] Task already has correct submission state', {
        taskId,
        status: task.status,
        progress: task.progress,
        transactionId
      });
      
      return {
        success: true,
        taskId,
        wasFixed: false,
        message: 'Task already has correct submission state',
        oldStatus: task.status,
        oldProgress: task.progress
      };
    }
    
    // 5. Fix the task status and progress
    logger.info('[TaskStatusEnforcer] Fixing task submission state', {
      taskId,
      fromStatus: task.status,
      toStatus: SUBMITTED_STATUS,
      fromProgress: task.progress,
      toProgress: PROGRESS_COMPLETE,
      needsStatusFix,
      needsProgressFix,
      transactionId
    });
    
    // Prepare enhanced metadata with explicit submission indicators
    const updatedMetadata = {
      ...metadata,
      submitted: true,
      submissionEnforced: true,
      lastStatusFix: new Date().toISOString()
    };
    
    // Ensure submission date is present in both formats for maximum compatibility
    if (hasSubmissionDate) {
      updatedMetadata.submissionDate = metadata.submissionDate || metadata.submission_date;
      updatedMetadata.submission_date = metadata.submission_date || metadata.submissionDate;
    } else {
      // If no submission date, add one
      const submissionDate = new Date().toISOString();
      updatedMetadata.submissionDate = submissionDate;
      updatedMetadata.submission_date = submissionDate;
    }
    
    // Update the task in the database with explicit SQL casting for progress
    // to ensure consistent type handling across database operations
    const result = await db.update(tasks)
      .set({
        status: SUBMITTED_STATUS,
        progress: sql`CAST(${PROGRESS_COMPLETE} AS INTEGER)`,
        metadata: updatedMetadata,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning({
        id: tasks.id,
        status: tasks.status,
        progress: tasks.progress,
        metadata: tasks.metadata
      });
    
    // Verify the update was successful
    if (!result || result.length === 0) {
      logger.error('[TaskStatusEnforcer] Failed to update task', {
        taskId,
        transactionId
      });
      
      return {
        success: false,
        taskId,
        error: 'UPDATE_FAILED',
        message: `Failed to update task ${taskId}`,
        oldStatus: task.status,
        oldProgress: task.progress
      };
    }
    
    const updatedTask = result[0];
    
    logger.info('[TaskStatusEnforcer] Successfully fixed task state', {
      taskId,
      oldStatus: task.status,
      newStatus: updatedTask.status,
      oldProgress: task.progress,
      newProgress: updatedTask.progress,
      transactionId
    });
    
    // 6. Broadcast the update via WebSocket if not skipped
    if (!skipBroadcast) {
      try {
        // Broadcast the update to all connected clients
        await broadcastTaskUpdate({
          taskId,
          status: SUBMITTED_STATUS,
          progress: PROGRESS_COMPLETE,
          metadata: {
            ...updatedMetadata,
            broadcastSource: 'task_status_enforcer',
            broadcastTime: new Date().toISOString()
          }
        });
        
        logger.info('[TaskStatusEnforcer] Broadcast successful', {
          taskId,
          transactionId
        });
      } catch (wsError) {
        logger.error('[TaskStatusEnforcer] WebSocket broadcast error', {
          taskId,
          error: wsError instanceof Error ? wsError.message : String(wsError),
          stack: wsError instanceof Error ? wsError.stack : undefined,
          transactionId
        });
        // Continue execution even if broadcast fails
      }
    }
    
    // 7. Return the successful result
    return {
      success: true,
      taskId,
      message: 'Task status and progress fixed successfully',
      oldStatus: task.status,
      newStatus: updatedTask.status,
      oldProgress: task.progress,
      newProgress: updatedTask.progress,
      wasFixed: needsStatusFix || needsProgressFix,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('[TaskStatusEnforcer] Error enforcing task status', {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      transactionId
    });
    
    return {
      success: false,
      taskId,
      error: 'UNEXPECTED_ERROR',
      message: `Error enforcing task status: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Batch enforce submitted task status across multiple tasks
 * 
 * This function finds all tasks with submission indicators but
 * incorrect status or progress and fixes them in a single operation.
 * 
 * @param options Options for batch enforcement
 * @returns Promise with the batch enforcement results
 */
export async function batchEnforceSubmittedTaskStatus(
  options: {
    taskType?: string;
    companyId?: number;
    limit?: number;
    debug?: boolean;
  } = {}
): Promise<{
  success: boolean;
  found: number;
  fixed: number;
  skipped: number;
  errors: number;
  tasks: Array<{ taskId: number; fixed: boolean; error?: string }>;
  message: string;
}> {
  const { 
    taskType,
    companyId,
    limit = 100,
    debug = false
  } = options;
  
  const batchId = `batch_enforce_${Date.now()}`;
  
  logger.info('[TaskStatusEnforcer] Starting batch enforcement', {
    taskType,
    companyId,
    limit,
    batchId
  });
  
  // Build SQL condition for finding tasks with submission indicators
  // but incorrect status or progress
  let whereCondition = sql`(
    (${tasks.metadata}->>'submitted' = 'true' OR
     ${tasks.metadata}->>'submission_date' IS NOT NULL OR
     ${tasks.metadata}->>'submissionDate' IS NOT NULL OR
     ${tasks.metadata}->>'fileId' IS NOT NULL OR
     ${tasks.status} = 'submitted')
    AND
    (${tasks.status} != 'submitted' OR ${tasks.progress} != 100)
  )`;
  
  // Add task type filter if specified
  if (taskType) {
    whereCondition = sql`${whereCondition} AND ${tasks.task_type} = ${taskType}`;
  }
  
  // Add company filter if specified
  if (companyId) {
    whereCondition = sql`${whereCondition} AND ${tasks.company_id} = ${companyId}`;
  }
  
  try {
    // Find tasks that need fixing
    const tasksToFix = await db.query.tasks.findMany({
      where: whereCondition,
      limit,
      orderBy: tasks.updated_at
    });
    
    logger.info('[TaskStatusEnforcer] Found tasks to fix', {
      count: tasksToFix.length,
      taskType,
      companyId,
      batchId
    });
    
    if (debug) {
      logger.debug('[TaskStatusEnforcer] Task details', {
        tasks: tasksToFix.map(t => ({
          id: t.id,
          type: t.task_type,
          status: t.status,
          progress: t.progress,
          hasSubmissionDate: !!t.metadata?.submission_date || !!t.metadata?.submissionDate,
          hasSubmittedFlag: !!t.metadata?.submitted,
          hasFileId: !!t.metadata?.fileId
        })),
        batchId
      });
    }
    
    if (tasksToFix.length === 0) {
      return {
        success: true,
        found: 0,
        fixed: 0,
        skipped: 0,
        errors: 0,
        tasks: [],
        message: 'No tasks found needing enforcement'
      };
    }
    
    // Process each task with individual enforcement
    const results = {
      fixed: 0,
      skipped: 0,
      errors: 0,
      tasks: [] as Array<{ taskId: number; fixed: boolean; error?: string }>
    };
    
    for (const task of tasksToFix) {
      try {
        const result = await enforceSubmittedTaskStatus(task.id, {
          debug,
          transactionId: `${batchId}_task_${task.id}`,
          source: 'batch_enforcer'
        });
        
        if (result.success) {
          if (result.wasFixed) {
            results.fixed++;
            results.tasks.push({ taskId: task.id, fixed: true });
            logger.info('[TaskStatusEnforcer] Fixed task in batch', {
              taskId: task.id,
              oldStatus: result.oldStatus,
              newStatus: result.newStatus,
              oldProgress: result.oldProgress,
              newProgress: result.newProgress,
              batchId
            });
          } else {
            results.skipped++;
            results.tasks.push({ taskId: task.id, fixed: false });
            logger.info('[TaskStatusEnforcer] Skipped task in batch (no fix needed)', {
              taskId: task.id,
              status: task.status,
              progress: task.progress,
              batchId
            });
          }
        } else {
          results.errors++;
          results.tasks.push({ 
            taskId: task.id, 
            fixed: false, 
            error: result.error || 'Unknown error' 
          });
          logger.error('[TaskStatusEnforcer] Error fixing task in batch', {
            taskId: task.id,
            error: result.error,
            batchId
          });
        }
      } catch (taskError) {
        results.errors++;
        results.tasks.push({ 
          taskId: task.id, 
          fixed: false, 
          error: taskError instanceof Error ? taskError.message : String(taskError)
        });
        logger.error('[TaskStatusEnforcer] Unexpected error processing task in batch', {
          taskId: task.id,
          error: taskError instanceof Error ? taskError.message : String(taskError),
          stack: taskError instanceof Error ? taskError.stack : undefined,
          batchId
        });
      }
    }
    
    // Return comprehensive results
    return {
      success: true,
      found: tasksToFix.length,
      fixed: results.fixed,
      skipped: results.skipped,
      errors: results.errors,
      tasks: results.tasks,
      message: `Batch processed ${tasksToFix.length} tasks: ${results.fixed} fixed, ${results.skipped} skipped, ${results.errors} errors`
    };
    
  } catch (error) {
    logger.error('[TaskStatusEnforcer] Error in batch enforcement', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      taskType,
      companyId,
      batchId
    });
    
    return {
      success: false,
      found: 0,
      fixed: 0,
      skipped: 0,
      errors: 1,
      tasks: [],
      message: `Error in batch enforcement: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Create API endpoint for the status enforcement
 * 
 * This function should be called from routes.ts to add the enforcement endpoints
 * to the Express application.
 * 
 * @param router Express Router instance
 */
export function registerTaskStatusEnforcementRoutes(router: any): void {
  logger.info('[TaskStatusEnforcer] Registering task status enforcement routes');
  
  // Single task enforcement endpoint
  router.post('/api/tasks/:taskId/enforce-status', async (req: any, res: any) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid task ID'
        });
      }
      
      const options = {
        forceUpdate: req.body.forceUpdate === true,
        debug: req.body.debug === true,
        source: 'api_request'
      };
      
      logger.info('[TaskStatusEnforcer] API enforcement requested', {
        taskId,
        options,
        userId: req.user?.id
      });
      
      const result = await enforceSubmittedTaskStatus(taskId, options);
      
      return res.status(result.success ? 200 : 500).json(result);
      
    } catch (error) {
      logger.error('[TaskStatusEnforcer] Error in enforcement API', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Batch enforcement endpoint
  router.post('/api/tasks/batch-enforce-status', async (req: any, res: any) => {
    try {
      const options = {
        taskType: req.body.taskType,
        companyId: req.body.companyId ? parseInt(req.body.companyId, 10) : undefined,
        limit: req.body.limit ? parseInt(req.body.limit, 10) : 100,
        debug: req.body.debug === true
      };
      
      logger.info('[TaskStatusEnforcer] API batch enforcement requested', {
        options,
        userId: req.user?.id
      });
      
      const result = await batchEnforceSubmittedTaskStatus(options);
      
      return res.status(result.success ? 200 : 500).json(result);
      
    } catch (error) {
      logger.error('[TaskStatusEnforcer] Error in batch enforcement API', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
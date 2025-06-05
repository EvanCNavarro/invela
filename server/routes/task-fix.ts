/**
 * Task Status Fix Endpoint
 * 
 * This endpoint provides a unified way to fix inconsistent task status and progress.
 * It ensures that tasks with status "submitted" always have progress = 100% and vice versa.
 */

import { Request, Response } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { broadcastTaskUpdate } from '../utils/unified-websocket';

/**
 * Fix task status and progress inconsistencies
 * 
 * This function ensures that if a task has:
 * - status = "submitted" but progress < 100: update progress to 100%
 * - progress = 100% but status != "submitted": update status to "submitted"
 * 
 * It also ensures the correct metadata is set in both cases.
 */
export async function fixTaskStatus(req: Request, res: Response) {
  const { taskId } = req.params;
  
  if (!taskId || isNaN(Number(taskId))) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid task ID' 
    });
  }

  const taskIdNum = Number(taskId);
  const logContext = { taskId: taskIdNum };

  try {
    // 1. Get current task state
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskIdNum));
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: `Task with ID ${taskId} not found` 
      });
    }

    logger.info('Current task state', {
      ...logContext,
      status: task.status,
      progress: task.progress,
      metadata: task.metadata
    });

    // 2. Check for status/progress inconsistencies
    let needsUpdate = false;
    const now = new Date();
    let updatedStatus = task.status;
    let updatedProgress = task.progress;
    let updatedMetadata = task.metadata || {};

    // Check if task is submitted but progress is not 100%
    if (task.status === 'submitted' && task.progress !== 100) {
      updatedProgress = 100;
      needsUpdate = true;
      logger.info('Fixing submitted task with incorrect progress', {
        ...logContext,
        currentProgress: task.progress,
        newProgress: 100
      });
    }

    // Check if task is at 100% but not marked as submitted
    if (task.progress === 100 && task.status !== 'submitted') {
      updatedStatus = 'submitted';
      needsUpdate = true;
      logger.info('Fixing 100% progress task with incorrect status', {
        ...logContext,
        currentStatus: task.status,
        newStatus: 'submitted'
      });
    }

    // Update metadata if necessary
    if (needsUpdate) {
      // Ensure required metadata fields are set
      updatedMetadata = {
        ...updatedMetadata,
        submissionDate: updatedMetadata.submissionDate || now.toISOString(),
        submission_date: updatedMetadata.submission_date || now.toISOString(),
        submitted: true,
        completed: true,
        lastUpdated: now.toISOString()
      };

      // 3. Update the task with consistent values
      await db.update(tasks)
        .set({
          status: updatedStatus,
          progress: updatedProgress,
          completion_date: task.completion_date || now,
          updated_at: now,
          metadata: updatedMetadata
        })
        .where(eq(tasks.id, taskIdNum));

      logger.info('Fixed task status/progress inconsistency', {
        ...logContext,
        status: updatedStatus,
        progress: updatedProgress,
        updatedAt: now.toISOString()
      });

      // 4. Broadcast update to connected clients
      await broadcastTaskUpdate({
        id: taskIdNum,
        status: updatedStatus,
        progress: updatedProgress,
        metadata: {
          ...updatedMetadata,
          lastUpdated: now.toISOString()
        }
      });

      logger.info('Broadcast task update to connected clients', logContext);

      return res.status(200).json({
        success: true,
        message: 'Task status and progress synchronized successfully',
        task: {
          id: taskIdNum,
          status: updatedStatus,
          progress: updatedProgress,
          metadata: updatedMetadata
        }
      });
    }

    // No updates needed
    return res.status(200).json({
      success: true,
      message: 'Task status and progress are already consistent',
      task: {
        id: taskIdNum,
        status: task.status,
        progress: task.progress,
        metadata: task.metadata
      }
    });
  } catch (error) {
    logger.error('Error fixing task status', {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).json({
      success: false,
      error: 'An error occurred while fixing the task status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Batch fix tasks with status/progress inconsistencies
 */
export async function batchFixTasks(req: Request, res: Response) {
  const { taskIds } = req.body;
  
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid or empty task IDs array' 
    });
  }

  const results: { 
    taskId: number; 
    success: boolean; 
    message?: string; 
    error?: string 
  }[] = [];

  for (const taskId of taskIds) {
    try {
      // 1. Get current task state
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        results.push({
          taskId,
          success: false,
          error: `Task with ID ${taskId} not found`
        });
        continue;
      }

      // 2. Check for status/progress inconsistencies
      let needsUpdate = false;
      const now = new Date();
      let updatedStatus = task.status;
      let updatedProgress = task.progress;
      let updatedMetadata = task.metadata || {};

      // Check if task is submitted but progress is not 100%
      if (task.status === 'submitted' && task.progress !== 100) {
        updatedProgress = 100;
        needsUpdate = true;
      }

      // Check if task is at 100% but not marked as submitted
      if (task.progress === 100 && task.status !== 'submitted') {
        updatedStatus = 'submitted';
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Ensure required metadata fields are set
        updatedMetadata = {
          ...updatedMetadata,
          submissionDate: updatedMetadata.submissionDate || now.toISOString(),
          submission_date: updatedMetadata.submission_date || now.toISOString(),
          submitted: true,
          completed: true,
          lastUpdated: now.toISOString()
        };

        // 3. Update the task with consistent values
        await db.update(tasks)
          .set({
            status: updatedStatus,
            progress: updatedProgress,
            completion_date: task.completion_date || now,
            updated_at: now,
            metadata: updatedMetadata
          })
          .where(eq(tasks.id, taskId));

        // 4. Broadcast update to connected clients
        await broadcastTaskUpdate({
          id: taskId,
          status: updatedStatus,
          progress: updatedProgress,
          metadata: {
            ...updatedMetadata,
            lastUpdated: now.toISOString()
          }
        });

        results.push({
          taskId,
          success: true,
          message: 'Task status and progress synchronized successfully'
        });
      } else {
        results.push({
          taskId,
          success: true,
          message: 'Task status and progress are already consistent'
        });
      }
    } catch (error) {
      results.push({
        taskId,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return res.status(200).json({
    success: true,
    results
  });
}
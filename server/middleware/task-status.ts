/**
 * Task Status Middleware
 * 
 * This middleware ensures consistent task status handling,
 * particularly for submission state transitions
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';

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
        console.log('[TaskStatusMiddleware] No task ID found in request', req.params, req.body);
        return next();
      }
      
      if (isNaN(taskId)) {
        console.log('[TaskStatusMiddleware] Invalid task ID:', taskId);
        return next();
      }
      
      // Check if the task has a submission date
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        console.log('[TaskStatusMiddleware] Task not found:', taskId);
        return next();
      }
      
      // Check if the task has a submission date
      const hasSubmissionDate = task.metadata && 
        task.metadata.submissionDate && 
        task.metadata.submissionDate !== null;
      
      if (hasSubmissionDate && task.status !== 'submitted') {
        console.log(`[TaskStatusMiddleware] Fixing task status: Task ${taskId} has submission date but status is ${task.status}`);
        
        // Update task status to "submitted"
        await db.update(tasks)
          .set({ 
            status: 'submitted',
            metadata: {
              ...task.metadata,
              submitted: true
            }
          })
          .where(eq(tasks.id, taskId));
        
        console.log(`[TaskStatusMiddleware] Task ${taskId} status updated to "submitted"`);
      }
      
      // Continue with the next middleware or route handler
      next();
    } catch (error) {
      console.error('[TaskStatusMiddleware] Error ensuring task submitted:', error);
      next(error);
    }
  };
};

/**
 * Utility method to fix task status to SUBMITTED
 */
export async function fixTaskSubmittedStatus(taskId: number): Promise<boolean> {
  try {
    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      console.log('[TaskStatusMiddleware] Task not found:', taskId);
      return false;
    }
    
    // Check if the task has a submission date
    const hasSubmissionDate = task.metadata && 
      task.metadata.submissionDate && 
      task.metadata.submissionDate !== null;
    
    if (!hasSubmissionDate) {
      console.log(`[TaskStatusMiddleware] Task ${taskId} does not have a submission date`);
      return false;
    }
    
    if (task.status === 'submitted') {
      console.log(`[TaskStatusMiddleware] Task ${taskId} already has "submitted" status`);
      return true;
    }
    
    console.log(`[TaskStatusMiddleware] Fixing task status: Task ${taskId} has submission date but status is ${task.status}`);
    
    // Update task status to "submitted"
    await db.update(tasks)
      .set({ 
        status: 'submitted',
        metadata: {
          ...task.metadata,
          submitted: true
        }
      })
      .where(eq(tasks.id, taskId));
    
    console.log(`[TaskStatusMiddleware] Task ${taskId} status updated to "submitted"`);
    return true;
  } catch (error) {
    console.error('[TaskStatusMiddleware] Error fixing task submitted status:', error);
    return false;
  }
}
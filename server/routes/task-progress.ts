/**
 * Task Progress API Routes
 * 
 * This file provides API endpoints for managing task progress directly.
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Get a task's current progress
 */
router.get('/api/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    // Get the task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task ${taskId} not found`
      });
    }
    
    return res.status(200).json(task);
  } catch (error) {
    console.error('[Task API] Error getting task', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting the task',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Update a task's progress directly
 * This is useful for testing progress-related functionality
 */
router.post('/api/tasks/:taskId/progress', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    const { progress } = req.body;
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid progress value (must be a number between 0 and 100)'
      });
    }
    
    // Update the task progress
    const [updatedTask] = await db.update(tasks)
      .set({
        progress: sql`CAST(${progress} AS INTEGER)`,
        updated_at: new Date(),
        status: progress === 0 ? 'not_started' : 
               progress < 100 ? 'in_progress' : 
               'ready_for_submission'
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: `Task ${taskId} not found`
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully updated progress for task ${taskId} to ${progress}%`,
      task: updatedTask
    });
  } catch (error) {
    console.error('[Task API] Error updating task progress', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the task progress',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;

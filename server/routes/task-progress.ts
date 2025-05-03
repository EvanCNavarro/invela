/**
 * Task Progress API
 * 
 * Provides endpoints for calculating and updating task progress using the
 * unified progress calculation system with transaction boundaries.
 */

import express from 'express';
import { updateKy3pProgressFixed } from '../utils/unified-progress-fixed';
import { updateTaskProgress } from '../utils/progress';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Force update progress for a specific task
 * POST /api/tasks/:taskId/progress
 */
router.post('/:taskId/progress', async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { force = false, debug = false, source = 'api' } = req.body;
  
  if (isNaN(taskId) || taskId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID'
    });
  }
  
  try {
    logger.info(`[Task Progress API] Updating progress for task ${taskId}`, {
      taskId,
      force,
      debug,
      source,
      requestedBy: req.session?.user?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    // First, determine if this is a KY3P task
    const { db } = await import('@db');
    const { tasks } = await import('@db/schema');
    const { eq } = await import('drizzle-orm');
    
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task ${taskId} not found`
      });
    }
    
    // Use the KY3P specific function for KY3P tasks
    const isKy3pTask = task.task_type.toLowerCase().includes('ky3p') || 
                      task.task_type.toLowerCase().includes('security');
    
    const result = isKy3pTask
      ? await updateKy3pProgressFixed(taskId, {
          debug,
          forceUpdate: force,
          metadata: { source: source }
        })
      : await updateTaskProgress(taskId, task.task_type.toLowerCase(), {
      forceUpdate: force,
      debug,
      metadata: { source: source }
    });
    
    // Log the result
    logger.info(`[Task Progress API] Progress update result for task ${taskId}`, {
      taskId,
      success: result.success,
      progress: result.progress,
      status: result.status,
      message: result.message
    });
    
    return res.json(result);
  } catch (error) {
    logger.error(`[Task Progress API] Error updating progress for task ${taskId}`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error updating task progress',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get current progress for a specific task
 * GET /api/tasks/:taskId/progress
 */
router.get('/:taskId/progress', async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  
  if (isNaN(taskId) || taskId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID'
    });
  }
  
  try {
    // First, determine if this is a KY3P task
    const { db } = await import('@db');
    const { tasks } = await import('@db/schema');
    const { eq } = await import('drizzle-orm');
    
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task ${taskId} not found`
      });
    }
    
    // Use the KY3P specific function for KY3P tasks
    const isKy3pTask = task.task_type.toLowerCase().includes('ky3p') || 
                      task.task_type.toLowerCase().includes('security');
    
    // Use appropriate function without forcing update
    const result = isKy3pTask
      ? await updateKy3pProgressFixed(taskId, {
          debug: true,
          forceUpdate: false,
          metadata: { source: 'api-get' }
        })
      : await updateTaskProgress(taskId, task.task_type.toLowerCase(), {
      forceUpdate: false,
      debug: true,
      metadata: { source: 'api-get' }
    });
    
    return res.json({
      success: true,
      taskId,
      progress: result.progress,
      status: result.status
    });
  } catch (error) {
    logger.error(`[Task Progress API] Error getting progress for task ${taskId}`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error getting task progress',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;

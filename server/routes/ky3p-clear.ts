import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '@db';
import { ky3pResponses, tasks, TaskStatus } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { broadcastTaskUpdate } from '../services/websocket';

const router = Router();

/**
 * Clear all KY3P responses for a task
 * This endpoint is used for clearing the "Clear Fields" button functionality
 */
router.post('/api/ky3p/clear/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const userId = req.user!.id;
    const companyId = req.user!.company_id;

    if (isNaN(taskId)) {
      return res.status(400).send('Invalid task ID');
    }

    logger.info('[KY3P Clear] Clearing fields for task', { taskId, userId, companyId });

    // First, verify the task exists and belongs to the user's company
    const taskResult = await db.select().from(tasks).where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.company_id, companyId),
        eq(tasks.task_type, 'ky3p')
      )
    ).limit(1);

    if (taskResult.length === 0) {
      logger.warn('[KY3P Clear] Task not found or not authorized', { taskId, companyId });
      return res.status(404).send('Task not found or not authorized');
    }

    const task = taskResult[0];

    // Delete all responses for this task
    const deleteResult = await db.delete(ky3pResponses).where(
      eq(ky3pResponses.task_id, taskId)
    );

    logger.info('[KY3P Clear] Deleted responses', { taskId, deleteResult });

    // Update task status to not_started and progress to 0
    const updateResult = await db.update(tasks).set({
      status: 'not_started',
      progress: 0,
      updated_at: new Date()
    }).where(eq(tasks.id, taskId)).returning();

    // Broadcast the task update to all clients
    if (updateResult.length > 0) {
      const updatedTask = updateResult[0];
      logger.info('[KY3P Clear] Updated task status', { 
        taskId, 
        status: updatedTask.status,
        progress: updatedTask.progress 
      });

      // Broadcast the update to all WebSocket clients
      broadcastTaskUpdate(taskId, updatedTask.status as TaskStatus);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'KY3P fields cleared successfully',
      taskId
    });
  } catch (error) {
    logger.error('[KY3P Clear] Error clearing fields:', error);
    return res.status(500).send('Error clearing fields');
  }
});

export default router;
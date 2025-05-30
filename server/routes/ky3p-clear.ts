import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@db';
import { ky3pResponses, tasks, TaskStatus } from '@db/schema';
import { requireAuth } from '../middleware/auth';
// Import both WebSocket broadcasting implementations
import { broadcastTaskUpdate } from '../utils/unified-websocket';
import { broadcastTaskUpdate as unifiedBroadcastTaskUpdate } from '../utils/unified-websocket';
import { logger } from '../utils/logger';

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
    // Get preserveProgress parameter from query or body
    const preserveProgress = req.query.preserveProgress === 'true' || 
                           req.body.preserveProgress === true;

    if (isNaN(taskId)) {
      return res.status(400).send('Invalid task ID');
    }

    logger.info('[KY3P Clear] Clearing fields for task', { 
      taskId, 
      userId, 
      companyId,
      preserveProgress 
    });

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
    
    // Save the current progress and status if needed
    const currentProgress = task.progress || 0;
    const currentStatus = task.status || 'not_started';

    // Delete all responses for this task
    const deleteResult = await db.delete(ky3pResponses).where(
      eq(ky3pResponses.task_id, taskId)
    );

    logger.info('[KY3P Clear] Deleted responses', { taskId, deleteResult });

    // Update task status and progress based on preserveProgress flag
    const updateData = preserveProgress 
      ? {
          // Keep the existing progress and status if preserveProgress is true
          updated_at: new Date(),
          metadata: sql`jsonb_build_object(
            'clearOperation', true,
            'preservedProgress', ${currentProgress},
            'preservedStatus', ${currentStatus},
            'lastClearTimestamp', ${new Date().toISOString()},
            'previousMetadata', COALESCE(${tasks.metadata}, '{}'::jsonb)
          )`
        }
      : {
          // Reset progress and status if preserveProgress is false
          status: 'not_started' as TaskStatus,
          progress: 0,
          updated_at: new Date(),
          metadata: sql`jsonb_build_object(
            'clearOperation', true,
            'previousProgress', ${currentProgress},
            'previousStatus', ${currentStatus},
            'lastClearTimestamp', ${new Date().toISOString()},
            'previousMetadata', COALESCE(${tasks.metadata}, '{}'::jsonb)
          )`
        };

    const updateResult = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    // Broadcast the task update to all clients
    if (updateResult.length > 0) {
      const updatedTask = updateResult[0];
      logger.info('[KY3P Clear] Updated task status', { 
        taskId, 
        status: updatedTask.status,
        progress: updatedTask.progress 
      });

      // Create payload for broadcasting
      const taskUpdatePayload = {
        id: taskId,
        status: updatedTask.status,
        progress: updatedTask.progress,
        metadata: updatedTask.metadata || { locked: false }
      };

      // First attempt using standard WebSocket broadcast
      try {
        logger.info('[KY3P Clear] Broadcasting via standard WebSocket service');
        broadcastTaskUpdate(taskUpdatePayload);
      } catch (broadcastError) {
        logger.warn('[KY3P Clear] Standard WebSocket broadcast failed', {
          error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error',
          taskId
        });
      }

      // Also attempt using unified WebSocket broadcast for redundancy
      try {
        logger.info('[KY3P Clear] Broadcasting via unified WebSocket service');
        // Unified WebSocket broadcast expects taskId (not id)
        unifiedBroadcastTaskUpdate({
          taskId,
          status: updatedTask.status,
          progress: updatedTask.progress,
          metadata: updatedTask.metadata || { locked: false }
        });
        logger.info('[KY3P Clear] Unified WebSocket broadcast successful');
      } catch (unifiedBroadcastError) {
        logger.warn('[KY3P Clear] Unified WebSocket broadcast failed', {
          error: unifiedBroadcastError instanceof Error ? unifiedBroadcastError.message : 'Unknown error',
          taskId
        });
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'KY3P fields cleared successfully',
      taskId
    });
  } catch (error) {
    const errorTaskId = parseInt(req.params.taskId, 10);
    logger.error('[KY3P Clear] Error clearing fields:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId: errorTaskId
    });
    return res.status(500).send('Error clearing fields');
  }
});

/**
 * Test endpoint to verify clear functionality with progress preservation
 */
router.get('/api/ky3p/clear-test/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const preserveProgress = req.query.preserveProgress === 'true';

    if (isNaN(taskId)) {
      return res.status(400).send('Invalid task ID');
    }

    // Get task information
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      return res.status(404).send('Task not found');
    }

    // Get response information
    const responseCount = await db.select({ count: sql`count(*)` })
      .from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));

    res.json({
      taskId,
      task_type: task.task_type,
      current_progress: task.progress,
      current_status: task.status,
      response_count: responseCount[0]?.count || 0,
      preserve_progress_option: preserveProgress,
      clear_url: `/api/ky3p/clear/${taskId}?preserveProgress=${preserveProgress}`
    });
  } catch (error) {
    const errorTaskId = parseInt(req.params.taskId, 10);
    logger.error('[KY3P Clear Test] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId: errorTaskId
    });
    res.status(500).send('Error testing clear functionality');
  }
});

export default router;
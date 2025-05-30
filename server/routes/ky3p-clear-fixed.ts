/**
 * Fixed KY3P Clear Router
 * 
 * This is an improved version of the KY3P Clear endpoint that properly
 * deletes responses and updates task status using transactions.
 */

import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, pool } from '@db';
import { ky3pResponses, tasks, TaskStatus } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { broadcastTaskUpdate } from '../utils/unified-websocket';

const router = Router();

/**
 * Clear all KY3P responses for a task - Fixed version with transaction support
 * This endpoint is used for the "Clear Fields" button functionality
 */
router.post('/api/ky3p/clear/:taskId', requireAuth, async (req, res) => {
  // Get a dedicated client from the pool to use transactions
  const client = await pool.connect();
  
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const userId = req.user!.id;
    const companyId = req.user!.company_id;

    if (isNaN(taskId)) {
      return res.status(400).send('Invalid task ID');
    }

    console.log('[KY3P Clear] Clearing fields for task', { taskId, userId, companyId });

    // Begin a transaction
    await client.query('BEGIN');
    
    // First, verify the task exists and belongs to the user's company
    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1 AND company_id = $2 AND task_type = $3 LIMIT 1',
      [taskId, companyId, 'ky3p']
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.warn('[KY3P Clear] Task not found or not authorized', { taskId, companyId });
      return res.status(404).send('Task not found or not authorized');
    }

    const task = taskResult.rows[0];

    // Delete all responses for this task
    const deleteResult = await client.query(
      'DELETE FROM ky3p_responses WHERE task_id = $1',
      [taskId]
    );

    console.log('[KY3P Clear] Deleted responses', { 
      taskId, 
      count: deleteResult.rowCount 
    });

    // Update task status to not_started and progress to 0
    const updateResult = await client.query(
      'UPDATE tasks SET status = $1, progress = $2, updated_at = NOW() WHERE id = $3 RETURNING id, status, progress, metadata',
      ['not_started', 0, taskId]
    );

    // Commit the transaction
    await client.query('COMMIT');
    
    // Broadcast the task update to all clients
    if (updateResult.rows.length > 0) {
      const updatedTask = updateResult.rows[0];
      console.log('[KY3P Clear] Updated task status', { 
        taskId, 
        status: updatedTask.status,
        progress: updatedTask.progress 
      });

      // Broadcast the update to all WebSocket clients using the proper format
      broadcastTaskUpdate({
        id: taskId,
        status: updatedTask.status,
        progress: updatedTask.progress,
        metadata: updatedTask.metadata || { locked: false }
      });
    }

    // Return success response with standardized progress and status
    return res.status(200).json({
      success: true,
      message: 'KY3P fields cleared successfully',
      taskId,
      progress: 0,
      status: 'not_started'
    });
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('[KY3P Clear] Error clearing fields:', error);
    return res.status(500).send('Error clearing fields');
  } finally {
    // Always release the client back to the pool
    client.release();
  }
});

export default router;
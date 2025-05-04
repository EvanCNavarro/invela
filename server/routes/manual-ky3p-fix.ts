/**
 * Manual KY3P Progress Fix API Endpoint
 * 
 * This API endpoint allows for direct recalculation of KY3P task progress
 * when needed for fixing inconsistencies between UI and database.
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { broadcastTaskUpdate } from '../utils/unified-websocket';

export const manualKy3pFix = Router();

// Endpoint to trigger manual KY3P progress recalculation
manualKy3pFix.post('/api/ky3p/manual-fix/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const source = req.body?.source || 'manual-fix-api';
    const forceUpdate = true; // Always force update for manual fixes
    
    // First verify this is a KY3P task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ error: `Task ${taskId} not found` });
    }
    
    const taskType = task.task_type.toLowerCase();
    if (!taskType.includes('ky3p') && !taskType.includes('security')) {
      return res.status(400).json({ 
        error: `Task ${taskId} is not a KY3P task (type: ${task.task_type})` 
      });
    }
    
    // Calculate task progress directly from the database
    const progressData = await db.transaction(async (tx) => {
      // First, count total responses for this specific task
      const [totalResult] = await tx.execute(
        sql`SELECT COUNT(*) as total FROM ky3p_responses WHERE task_id = ${taskId}`
      );
      
      // Then, count completed responses
      const [completedResult] = await tx.execute(
        sql`SELECT COUNT(*) as completed FROM ky3p_responses 
            WHERE task_id = ${taskId} AND UPPER(status) = 'COMPLETE'`
      );
      
      const totalResponses = parseInt(totalResult.total as string);
      const completedResponses = parseInt(completedResult.completed as string);
      
      // Calculate the progress percentage
      const calculatedProgress = totalResponses > 0
        ? Math.min(100, Math.round((completedResponses / totalResponses) * 100))
        : 0;
      
      // Determine appropriate status
      const calculatedStatus = 
        calculatedProgress === 0 ? 'not_started' :
        calculatedProgress === 100 ? 'ready_for_submission' :
        'in_progress';
      
      // Update the task with the calculated progress
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          progress: sql`${calculatedProgress}::INTEGER`,
          status: calculatedStatus,
          updated_at: new Date(),
          metadata: sql`jsonb_set(
            jsonb_set(
              COALESCE(${tasks.metadata}, '{}'::jsonb),
              '{lastProgressUpdate}',
              to_jsonb(now()::text)
            ),
            '{progressHistory}',
            COALESCE(${tasks.metadata} -> 'progressHistory', '[]'::jsonb) ||
            jsonb_build_array(jsonb_build_object('value', ${calculatedProgress}, 'timestamp', now()::text, 'source', ${source}))
          )`
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      return {
        task: updatedTask,
        previousProgress: task.progress,
        newProgress: calculatedProgress,
        status: calculatedStatus,
        totalResponses,
        completedResponses
      };
    });
    
    // Broadcast the update to connected clients
    setTimeout(() => {
      try {
        broadcastTaskUpdate(
          taskId, 
          progressData.newProgress, 
          progressData.status, 
          progressData.task.metadata || {}
        );
        logger.info(`[ManualKy3pFix] Broadcasted progress update for task ${taskId}`);
      } catch (broadcastError) {
        logger.error(`[ManualKy3pFix] Broadcast error:`, { 
          error: broadcastError,
          taskId 
        });
      }
    }, 0);
    
    return res.status(200).json({
      success: true,
      taskId: taskId,
      previousProgress: progressData.previousProgress,
      newProgress: progressData.newProgress,
      status: progressData.status,
      completionStats: {
        totalResponses: progressData.totalResponses,
        completedResponses: progressData.completedResponses,
        percentComplete: progressData.newProgress
      },
      message: `Successfully updated task ${taskId} progress to ${progressData.newProgress}%`
    });
  } catch (error) {
    logger.error('[ManualKy3pFix] Error updating task progress:', {
      error,
      stackTrace: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Server error while updating task progress'
    });
  }
});

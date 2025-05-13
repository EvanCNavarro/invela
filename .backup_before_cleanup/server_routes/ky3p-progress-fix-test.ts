/**
 * KY3P Progress Fix Test Route
 * 
 * This endpoint specifically tests our SQL-casting fix for the KY3P progress update issue.
 * It directly applies the fix to a specified task ID and confirms the progress is stored correctly.
 */
import { Router } from 'express';
import { db } from '@db';
import { tasks, ky3pResponses, ky3pFields } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculateAndUpdateTaskProgress } from '../utils/unified-progress-fixed';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Test SQL casting fix for KY3P progress
 */
router.post('/api/ky3p/fixed-progress-test/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // Step 1: Get the task before the update
    const taskBefore = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskBefore) {
      return res.status(404).json({ error: `Task with ID ${taskId} not found` });
    }
    
    if (taskBefore.task_type !== 'ky3p') {
      return res.status(400).json({ error: `Task ${taskId} is not a KY3P task (type: ${taskBefore.task_type})` });
    }
    
    // Step 2: Count the responses
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ky3pResponses)
      .where(
        sql`${ky3pResponses.task_id} = ${taskId} AND UPPER(${ky3pResponses.status}) = 'COMPLETE'`
      );
    
    const completedResponses = countResult[0].count;
    
    // Step 3: Count total fields
    const totalFieldsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ky3pFields);
    
    const totalFields = totalFieldsResult[0].count;
    
    // Step 4: Calculate expected progress
    const expectedProgress = totalFields > 0 
      ? Math.min(100, Math.round((completedResponses / totalFields) * 100)) 
      : 0;
    
    // Step 5: Apply our fixed progress update function
    const updateResult = await calculateAndUpdateTaskProgress(taskId, {
      force: true,
      debug: true,
      source: 'fixed-progress-test'
    });
    
    // Step 6: Get the task after the update for verification
    const taskAfter = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskAfter) {
      return res.status(500).json({ error: 'Failed to retrieve task after update' });
    }
    
    // Step 7: Return detailed results
    return res.json({
      success: updateResult.success,
      taskId,
      before: {
        progress: taskBefore.progress,
        status: taskBefore.status
      },
      after: {
        progress: taskAfter.progress,
        status: taskAfter.status
      },
      expected: {
        progress: expectedProgress,
        responses: completedResponses,
        totalFields
      },
      fix: {
        appliedCorrectly: updateResult.success && taskAfter.progress === expectedProgress,
        calculatedProgress: updateResult.progress
      },
      message: updateResult.success 
        ? `KY3P progress fix successfully applied to task ${taskId}` 
        : `KY3P progress fix failed: ${updateResult.message}`
    });
  } catch (error) {
    logger.error('Error testing KY3P progress fix:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      error: 'Failed to test KY3P progress fix',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Reset progress to 0 for testing
 */
router.post('/api/ky3p/reset-progress/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // Update the task progress to 0 directly
    const [updatedTask] = await db
      .update(tasks)
      .set({
        progress: 0,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    if (!updatedTask) {
      return res.status(404).json({ error: `Task with ID ${taskId} not found` });
    }
    
    return res.json({
      success: true,
      taskId,
      progress: updatedTask.progress,
      status: updatedTask.status,
      message: `Task ${taskId} progress reset to 0%`
    });
  } catch (error) {
    logger.error('Error resetting KY3P progress:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      error: 'Failed to reset KY3P progress',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
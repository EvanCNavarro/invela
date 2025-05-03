/**
 * Debug endpoints for testing and troubleshooting
 * 
 * These endpoints are for development and testing purposes only.
 * They should NOT be enabled in production environments.
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks, ky3pFields, ky3pResponses } from '@db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * Get all KY3P tasks for testing purposes
 */
router.get('/ky3p-tasks', async (req, res) => {
  try {
    const ky3pTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.task_type, 'ky3p'))
      .limit(10);
    
    // Return the tasks
    return res.json(ky3pTasks);
  } catch (error) {
    console.error('[Debug] Error fetching KY3P tasks:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Get KY3P field definitions for testing purposes
 */
router.get('/ky3p-fields', async (req, res) => {
  try {
    const fields = await db
      .select()
      .from(ky3pFields)
      .limit(20);
    
    return res.json(fields);
  } catch (error) {
    console.error('[Debug] Error fetching KY3P fields:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Direct test endpoint for the unified KY3P progress system
 */
router.post('/test-unified-ky3p-progress/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }
    
    console.log(`[Debug] Testing unified KY3P progress for task ${taskId}`);
    
    // Get the task before any changes
    const [taskBefore] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!taskBefore) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    console.log(`[Debug] Initial task state:`, {
      id: taskBefore.id,
      status: taskBefore.status,
      progress: taskBefore.progress
    });
    
    // Get a random KY3P field to update
    const fields = await db
      .select()
      .from(ky3pFields)
      .limit(5);
      
    if (!fields || fields.length === 0) {
      return res.status(404).json({ success: false, message: 'No KY3P fields found' });
    }
    
    // Pick a random field
    const field = fields[Math.floor(Math.random() * fields.length)];
    console.log(`[Debug] Selected field:`, {
      id: field.id,
      field_key: field.field_key,
      category: field.category
    });
    
    // Add a test response
    const timestamp = new Date();
    const [existingResponse] = await db
      .select()
      .from(ky3pResponses)
      .where(
        and(
          eq(ky3pResponses.task_id, taskId),
          eq(ky3pResponses.field_id, field.id)
        )
      );
      
    if (existingResponse) {
      console.log(`[Debug] Updating existing response for field ${field.id}`);
      await db
        .update(ky3pResponses)
        .set({
          response_value: `Test value updated at ${timestamp.toISOString()}`,
          status: 'COMPLETE',
          updated_at: timestamp
        })
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.field_id, field.id)
          )
        );
    } else {
      console.log(`[Debug] Adding new response for field ${field.id}`);
      await db
        .insert(ky3pResponses)
        .values({
          task_id: taskId,
          field_id: field.id,
          response_value: `Test value created at ${timestamp.toISOString()}`,
          status: 'COMPLETE',
          created_at: timestamp,
          updated_at: timestamp
        });
    }
    
    // Import the unified task progress module
    const { updateTaskProgress } = await import('../utils/unified-task-progress.js');
    
    // Call the unified progress update function
    console.log(`[Debug] Calling unified progress update function`);
    const updateResult = await updateTaskProgress(taskId, 'ky3p', {
      debug: true,
      forceUpdate: true,
      metadata: {
        testRun: true,
        timestamp: timestamp.toISOString()
      }
    });
    
    console.log(`[Debug] Progress update result:`, updateResult);
    
    // Get the task after update
    const [taskAfter] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!taskAfter) {
      return res.status(500).json({
        success: false,
        message: 'Task was deleted during the test',
        updateResult
      });
    }
    
    console.log(`[Debug] Final task state:`, {
      id: taskAfter.id,
      status: taskAfter.status,
      progress: taskAfter.progress
    });
    
    // Return the test results
    return res.json({
      success: true,
      taskId,
      fieldUpdated: field.id,
      initialState: {
        status: taskBefore.status,
        progress: taskBefore.progress
      },
      progressUpdateResult: updateResult,
      finalState: {
        status: taskAfter.status,
        progress: taskAfter.progress
      },
      conclusion: {
        progressChanged: taskBefore.progress !== taskAfter.progress,
        statusChanged: taskBefore.status !== taskAfter.status,
        persistenceWorking: updateResult.success && updateResult.progress === taskAfter.progress
      }
    });
  } catch (error) {
    console.error('[Debug] Error in unified KY3P progress test:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Error testing unified KY3P progress: ${error.message}`,
      stack: error.stack
    });
  }
});

export default router;

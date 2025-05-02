/**
 * Test route for checking KY3P progress calculation
 */
import { Router } from 'express';
import { db } from '@db';
import { tasks, ky3pResponses, ky3pFields } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { updateTaskProgress } from '../utils/task-update';
import { logger } from '../utils/logger';

const router = Router();

// Create and test a KY3P task
router.get('/test-ky3p-progress', async (req, res) => {
  try {
    // Step 1: Create a test KY3P task if it doesn't exist
    let taskId;
    
    const existingTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.task_type, 'ky3p'))
      .limit(1);
    
    if (existingTasks.length > 0) {
      taskId = existingTasks[0].id;
      logger.info(`Using existing KY3P task: ${taskId}`);
    } else {
      // Create a new KY3P task
      const insertResult = await db
        .insert(tasks)
        .values({
          title: 'KY3P Test Task',
          description: 'Test task for KY3P progress calculation',
          task_type: 'ky3p',
          task_scope: 'company',
          status: 'not_started',
          progress: 0,
          company_id: 256, // Use existing test company
          created_by: 298, // Use existing test user
          priority: 'medium',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning({ id: tasks.id });
      
      taskId = insertResult[0].id;
      logger.info(`Created new KY3P task: ${taskId}`);
    }
    
    // Step 2: Get KY3P field count
    const totalFieldsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ky3pFields);
    
    const totalFields = totalFieldsResult[0]?.count || 0;
    
    // Step 3: Check if we have any responses already
    const existingResponsesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    const existingResponses = existingResponsesResult[0]?.count || 0;
    
    // Step 4: Add a test response if none exist
    if (existingResponses === 0) {
      // Get some KY3P field IDs
      const fields = await db
        .select()
        .from(ky3pFields)
        .limit(3);
      
      if (fields.length === 0) {
        return res.status(500).json({ error: 'No KY3P fields found' });
      }
      
      // Add a completed response for each field
      for (const field of fields) {
        await db
          .insert(ky3pResponses)
          .values({
            task_id: taskId,
            field_id: field.id,
            value: 'Test response',
            status: 'COMPLETE',
            created_at: new Date(),
            updated_at: new Date()
          })
          .onConflictDoUpdate({
            target: [ky3pResponses.task_id, ky3pResponses.field_id],
            set: {
              value: 'Test response',
              status: 'COMPLETE',
              updated_at: new Date()
            }
          });
      }
      
      logger.info(`Added ${fields.length} test responses to task ${taskId}`);
    }
    
    // Step 5: Force recalculate task progress
    const updatedTask = await updateTaskProgress(taskId, {
      recalculate: true,
      debug: true,
      broadcast: true
    });
    
    // Return details
    return res.json({
      taskId,
      totalFields,
      existingResponses,
      progress: updatedTask.progress,
      status: updatedTask.status,
      message: `KY3P task progress: ${updatedTask.progress}%, status: ${updatedTask.status}`
    });
    
  } catch (error) {
    logger.error('Error testing KY3P progress:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      error: 'Failed to test KY3P progress',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
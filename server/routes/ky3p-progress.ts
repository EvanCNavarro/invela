/**
 * KY3P Progress API Route
 * 
 * This file defines the API route for getting KY3P progress data,
 * which is required by the KY3P form to load saved data.
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks, ky3pResponses, ky3pFields } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';

const logger = new Logger('KY3PProgressRoutes');
const router = Router();

/**
 * GET /api/ky3p/progress/:taskId
 * 
 * Retrieves progress data (saved responses) for a specific KY3P task.
 * This endpoint is used by the KY3P form to load existing data.
 */
router.get('/api/ky3p/progress/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        error: 'Invalid task ID format'
      });
    }
    
    logger.info(`Fetching KY3P progress for task ${taskId}`);
    
    // First verify that this is a valid KY3P task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.warn(`Task ${taskId} not found`);
      return res.status(404).json({
        error: 'Task not found'
      });
    }
    
    if (task.task_type !== 'ky3p' && task.task_type !== 'sp_ky3p_assessment' && task.task_type !== 'security') {
      logger.warn(`Task ${taskId} is not a KY3P task (type: ${task.task_type})`);
      return res.status(400).json({
        error: 'Not a KY3P task'
      });
    }
    
    // Fetch all responses for this task
    const responses = await db.select()
      .from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
      
    logger.info(`Retrieved ${responses.length} responses for task ${taskId}`);
    
    // Fetch field definitions to map field IDs to keys
    const fields = await db.select()
      .from(ky3pFields)
      .orderBy(ky3pFields.id);
      
    // Create a mapping of field ID to field key
    const fieldIdToKey = new Map<number, string>();
    fields.forEach(field => {
      if (field.id && field.field_key) {
        fieldIdToKey.set(field.id, field.field_key);
      }
    });
    
    // Format responses as a key-value object
    const formData: Record<string, any> = {};
    
    responses.forEach(response => {
      if (response.field_id) {
        // Get the field key from the mapping
        const fieldKey = fieldIdToKey.get(response.field_id) || String(response.field_id);
        formData[fieldKey] = response.response_value;
      }
    });
    
    // Return both the responses array and the formatted form data
    return res.json({
      success: true,
      taskId,
      status: task.status,
      responses: responses,
      formData,
      progress: task.progress || 0,
      fieldCount: fields.length,
      responseCount: responses.length
    });
  } catch (error) {
    logger.error('Error fetching KY3P progress', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      error: 'Failed to retrieve KY3P progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Also add a similar endpoint for /api/tasks/:taskId/ky3p-responses
router.get('/api/tasks/:taskId/ky3p-responses', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        error: 'Invalid task ID format'
      });
    }
    
    logger.info(`Fetching KY3P responses for task ${taskId}`);
    
    // First verify that this is a valid KY3P task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.warn(`Task ${taskId} not found`);
      return res.status(404).json({
        error: 'Task not found'
      });
    }
    
    // Fetch all responses for this task
    const responses = await db.select()
      .from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
      
    logger.info(`Retrieved ${responses.length} responses for task ${taskId}`);
    
    // Return both the responses array
    return res.json({
      success: true,
      taskId,
      status: task.status,
      responses: responses,
      responseCount: responses.length
    });
  } catch (error) {
    logger.error('Error fetching KY3P responses', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      error: 'Failed to retrieve KY3P responses',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

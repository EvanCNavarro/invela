/**
 * KY3P Routes
 * 
 * This file contains the API routes for the KY3P form
 */

import express from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses, tasks } from '@db/schema';
import { eq, count, and, sql } from 'drizzle-orm';
import { getWebSocketServer, broadcastMessage } from '../services/websocket';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';

// Create a router without any prefix - the prefix is added in server/routes.ts
const router = express.Router();
const logger = new Logger('KY3P API');

/**
 * Get all KY3P fields
 */
router.get('/fields', async (req, res) => {
  try {
    logger.info('Fetching all KY3P fields');
    
    const fields = await db.select().from(ky3pFields);
    
    logger.info(`Returning ${fields.length} KY3P fields`);
    return res.json(fields);
  } catch (error) {
    logger.error('Error fetching KY3P fields', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error fetching KY3P fields' 
    });
  }
});

/**
 * Get all KY3P fields with demo autofill data
 */
router.get('/fields/demo', async (req, res) => {
  try {
    logger.info('Fetching KY3P fields with demo data');
    
    const fields = await db
      .select()
      .from(ky3pFields)
      .where(sql`demo_autofill IS NOT NULL`);
    
    logger.info(`Returning ${fields.length} KY3P fields with demo data`);
    return res.json(fields);
  } catch (error) {
    logger.error('Error fetching KY3P fields with demo data', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error fetching KY3P demo fields' 
    });
  }
});

/**
 * Get responses for a specific task (using query parameter)
 */
router.get('/responses', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.query.taskId as string);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid task ID' 
      });
    }
    
    logger.info(`Fetching KY3P responses for task ${taskId} (via query param)`);
    
    // Verify the task belongs to the user's company
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }
    
    if (task.company_id !== req.user?.company_id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to access this task' 
      });
    }
    
    const responses = await db
      .select()
      .from(ky3pResponses)
      .where(eq(ky3pResponses.taskId, taskId));
    
    logger.info(`Returning ${responses.length} KY3P responses for task ${taskId}`);
    return res.json(responses);
  } catch (error) {
    logger.error('Error fetching KY3P responses', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error fetching KY3P responses' 
    });
  }
});

/**
 * Get responses for a specific task (using path parameter)
 */
router.get('/responses/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid task ID' 
      });
    }
    
    logger.info(`Fetching KY3P responses for task ${taskId}`);
    
    // Verify the task belongs to the user's company
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }
    
    if (task.company_id !== req.user?.company_id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to access this task' 
      });
    }
    
    const responses = await db
      .select()
      .from(ky3pResponses)
      .where(eq(ky3pResponses.taskId, taskId));
    
    logger.info(`Returning ${responses.length} KY3P responses for task ${taskId}`);
    return res.json(responses);
  } catch (error) {
    logger.error('Error fetching KY3P responses', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error fetching KY3P responses' 
    });
  }
});

/**
 * Update a single KY3P field response
 */
router.post('/update-field', requireAuth, async (req, res) => {
  try {
    const { taskId, fieldKey, value } = req.body;
    
    if (!taskId || !fieldKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }
    
    logger.info(`Updating field ${fieldKey} for task ${taskId}`);
    
    // Verify the task belongs to the user's company
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }
    
    if (task.company_id !== req.user?.company_id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to access this task' 
      });
    }
    
    // Find the field in the database
    const [field] = await db
      .select()
      .from(ky3pFields)
      .where(eq(ky3pFields.key, fieldKey))
      .limit(1);
    
    if (!field) {
      return res.status(404).json({ 
        success: false, 
        error: `Field ${fieldKey} not found` 
      });
    }
    
    // Check if a response already exists
    const [existingResponse] = await db
      .select()
      .from(ky3pResponses)
      .where(and(
        eq(ky3pResponses.taskId, taskId),
        eq(ky3pResponses.fieldKey, fieldKey)
      ))
      .limit(1);
    
    if (existingResponse) {
      // Update existing response
      logger.info(`Updating existing response for field ${fieldKey}`);
      
      await db
        .update(ky3pResponses)
        .set({
          response: value,
          status: 'complete',
          updatedAt: new Date()
        })
        .where(eq(ky3pResponses.id, existingResponse.id));
    } else {
      // Create new response
      logger.info(`Creating new response for field ${fieldKey}`);
      
      await db.insert(ky3pResponses).values({
        taskId,
        fieldKey,
        fieldId: field.id,
        response: value,
        status: 'complete',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Update task progress
    await updateTaskProgress(taskId);
    
    // Broadcast via WebSocket
    broadcastMessage('field_update', {
      taskId,
      fieldId: fieldKey,
      value,
      timestamp: new Date().toISOString()
    });
    
    return res.json({ 
      success: true, 
      message: `Field ${fieldKey} updated successfully` 
    });
  } catch (error) {
    logger.error('Error updating KY3P field', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error updating KY3P field' 
    });
  }
});

/**
 * Bulk update multiple KY3P field responses
 */
router.post('/bulk-update', requireAuth, async (req, res) => {
  try {
    const { taskId, formData } = req.body;
    
    if (!taskId || !formData || Object.keys(formData).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }
    
    logger.info(`Received bulk update for task ${taskId} with ${Object.keys(formData).length} fields`);
    
    // Verify the task belongs to the user's company
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }
    
    if (task.company_id !== req.user?.company_id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to access this task' 
      });
    }
    
    // Get all existing responses for this task
    const existingResponses = await db
      .select()
      .from(ky3pResponses)
      .where(eq(ky3pResponses.taskId, taskId));
    
    // Create a lookup map for existing responses
    const responsesMap = new Map();
    existingResponses.forEach(response => {
      responsesMap.set(response.fieldKey, response);
    });
    
    // Get all field definitions
    const fieldDefinitions = await db
      .select()
      .from(ky3pFields);
    
    // Create a lookup map for field definitions
    const fieldsMap = new Map();
    fieldDefinitions.forEach(field => {
      fieldsMap.set(field.key, field);
    });
    
    // Process each field in the form data
    const updateResults = [];
    const now = new Date();
    
    for (const [key, value] of Object.entries(formData)) {
      try {
        const fieldDef = fieldsMap.get(key);
        
        if (!fieldDef) {
          logger.warn(`Field definition not found for key: ${key}`);
          updateResults.push({ key, status: 'field_not_found' });
          continue;
        }
        
        const existingResponse = responsesMap.get(key);
        
        if (existingResponse) {
          // Update existing response
          await db
            .update(ky3pResponses)
            .set({
              response: value,
              status: 'complete',
              updatedAt: now
            })
            .where(eq(ky3pResponses.id, existingResponse.id));
          
          updateResults.push({ key, status: 'updated' });
        } else {
          // Create new response
          await db.insert(ky3pResponses).values({
            taskId,
            fieldKey: key,
            fieldId: fieldDef.id,
            response: value,
            status: 'complete',
            createdAt: now,
            updatedAt: now
          });
          
          updateResults.push({ key, status: 'created' });
        }
      } catch (error) {
        logger.error(`Error processing field ${key}`, error);
        updateResults.push({ key, status: 'error', message: error.message });
      }
    }
    
    // Update task progress
    const { progress, status } = await updateTaskProgress(taskId);
    
    // Broadcast the task update via WebSocket
    broadcastMessage('task_updated', {
      id: taskId,
      status,
      progress,
      metadata: { lastUpdated: now.toISOString() },
      timestamp: now.toISOString()
    });
    
    return res.json({
      success: true,
      updates: updateResults,
      taskStatus: {
        progress,
        status
      }
    });
  } catch (error) {
    logger.error('Error in bulk update', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error processing bulk update' 
    });
  }
});

/**
 * Update task progress
 */
async function updateTaskProgress(taskId: number): Promise<{ progress: number, status: string }> {
  try {
    // Count total fields
    const [totalFieldsResult] = await db
      .select({ count: count() })
      .from(ky3pFields);
    
    const totalFields = totalFieldsResult.count || 0;
    
    // Count completed responses
    const [completedFieldsResult] = await db
      .select({ count: count() })
      .from(ky3pResponses)
      .where(and(
        eq(ky3pResponses.taskId, taskId),
        eq(ky3pResponses.status, 'complete')
      ));
    
    const completedFields = completedFieldsResult.count || 0;
    
    // Calculate progress
    const progress = totalFields > 0 
      ? Math.round((completedFields / totalFields) * 100) 
      : 0;
    
    // Determine status
    let status = 'in_progress';
    if (progress === 100) {
      status = 'ready_for_submission';
    } else if (progress === 0) {
      status = 'not_started';
    }
    
    logger.info(`Updating task ${taskId} progress: ${progress}%, status: ${status}`);
    
    // Update task
    await db
      .update(tasks)
      .set({ 
        progress, 
        status,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, taskId));
    
    return { progress, status };
  } catch (error) {
    logger.error(`Error updating task progress for task ${taskId}`, error);
    throw error;
  }
}

/**
 * Submit a completed KY3P assessment task
 */
router.post('/tasks/:taskId/submit', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid task ID' 
      });
    }
    
    logger.info(`Submitting KY3P task ${taskId}`);
    
    // Verify the task belongs to the user's company
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }
    
    if (task.company_id !== req.user?.company_id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to access this task' 
      });
    }
    
    // Get progress information
    const { progress, status } = await updateTaskProgress(taskId);
    
    // Check if task is ready for submission
    if (progress < 100) {
      return res.status(400).json({ 
        success: false, 
        error: `Task is only ${progress}% complete. All required fields must be completed before submission.` 
      });
    }
    
    // Update task status to submitted
    await db
      .update(tasks)
      .set({ 
        status: 'submitted',
        updatedAt: new Date()
      })
      .where(eq(tasks.id, taskId));
    
    // Broadcast status update via WebSocket
    broadcastMessage('task_updated', {
      id: taskId,
      status: 'submitted',
      progress: 100,
      timestamp: new Date().toISOString()
    });
    
    return res.json({
      success: true,
      message: 'Task successfully submitted',
      task: {
        id: taskId,
        status: 'submitted',
        progress: 100
      }
    });
  } catch (error) {
    logger.error('Error submitting KY3P task', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error submitting KY3P task' 
    });
  }
});

export default router;
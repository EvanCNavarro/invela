/**
 * KY3P Batch Update Routes
 * 
 * This module provides API endpoints for bulk updating KY3P form fields
 * using standardized string-based field keys.
 */

import { Router } from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses, tasks } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { updateKy3pProgressFixed } from '../utils/ky3p-progress.utils';

/**
 * Register KY3P batch update routes
 * 
 * @returns Router with KY3P batch update routes
 */
export function registerKY3PBatchUpdateRoutes() {
  logger.info('[KY3P-BATCH-UPDATE] Registering KY3P batch update routes');
  
  const router = Router();

  /**
   * Process a batch update of KY3P fields using string-based field keys
   */
  router.post('/api/ky3p/batch-update/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    // CRITICAL FIX: Ensure we have the responses object wrapper 
    // Format should be: { responses: { fieldKey1: value1, ... } }
    if (!req.body.responses || typeof req.body.responses !== 'object') {
      logger.error(`[KY3P-BATCH-UPDATE] Invalid request format for task ${taskId}. Expected { responses: {...} } format`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request: responses is required and must be an object' 
      });
    }
    
    const formData = req.body.responses; // Get the actual field data from the responses wrapper
    
    logger.info(`[KY3P-BATCH-UPDATE] Received batch update request for task ${taskId}`, {
      fieldCount: Object.keys(formData).length
    });
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const fieldKeys = Object.keys(formData);
    if (fieldKeys.length === 0) {
      return res.status(200).json({
        success: true,
        processedCount: 0,
        message: 'No fields to update'
      });
    }
    
    try {
      // Get the task to ensure it exists and is valid
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        return res.status(404).json({ error: `Task ${taskId} not found` });
      }
      
      // Get all KY3P fields matching the field keys in the form data
      const fieldsToUpdate = await db
        .select()
        .from(ky3pFields)
        .where(sql`${ky3pFields.field_key} IN (${fieldKeys.map(key => `'${key}'`).join(',')})`);
      
      // Map field keys to field IDs
      const fieldKeyToIdMap = new Map<string, number>();
      for (const field of fieldsToUpdate) {
        if (field.field_key) {
          fieldKeyToIdMap.set(field.field_key, field.id);
        }
      }
      
      // Process each field in the form data
      const batchResponses = [];
      const timestamp = new Date();
      
      for (const [fieldKey, value] of Object.entries(formData)) {
        const fieldId = fieldKeyToIdMap.get(fieldKey);
        
        if (!fieldId) {
          logger.warn(`[KY3P-BATCH-UPDATE] Field key not found: ${fieldKey}`);
          continue;
        }
        
        // Check if a response already exists
        const [existingResponse] = await db
          .select()
          .from(ky3pResponses)
          .where(
            and(
              eq(ky3pResponses.task_id, taskId),
              eq(ky3pResponses.field_id, fieldId)
            )
          );
        
        if (existingResponse) {
          // Update existing response
          await db
            .update(ky3pResponses)
            .set({
              response_value: String(value),
              field_key: fieldKey, // Ensure field_key is set for existing responses
              status: 'COMPLETE', // Use string directly instead of enum
              updated_at: timestamp
            })
            .where(
              and(
                eq(ky3pResponses.task_id, taskId),
                eq(ky3pResponses.field_id, fieldId)
              )
            );
          
          batchResponses.push({
            fieldId,
            fieldKey,
            operation: 'update',
            value: String(value)
          });
        } else {
          // Insert new response
          await db
            .insert(ky3pResponses)
            .values({
              task_id: taskId,
              field_id: fieldId,
              field_key: fieldKey, // Add field_key for consistency with other form types
              response_value: String(value),
              status: 'COMPLETE', // Use string directly instead of enum
              created_at: timestamp,
              updated_at: timestamp
            });
          
          batchResponses.push({
            fieldId,
            fieldKey,
            operation: 'insert',
            value: String(value)
          });
        }
      }
      
      // Update task progress using the fixed progress update function
      try {
        // IMPROVED SOLUTION: Use the fixed progress update function for KY3P tasks
        // to ensure the progress is correctly persisted to the database
        const progressResult = await updateKy3pProgressFixed(taskId, { 
          debug: true,
          metadata: {
            lastBatchUpdate: new Date().toISOString(),
            batchUpdateSize: batchResponses.length
          }
        });
        
        if (progressResult.success) {
          logger.info(`[KY3P-BATCH-UPDATE] Successfully updated task ${taskId} progress to ${progressResult.progress}%`);
        } else {
          logger.warn(`[KY3P-BATCH-UPDATE] Progress update warning:`, {
            taskId,
            message: progressResult.message
          });
        }
      } catch (error) {
        logger.error('[KY3P-BATCH-UPDATE] Error updating task progress:', error);
        // Continue processing, don't fail the whole request
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        processedCount: batchResponses.length,
        message: `Successfully processed ${batchResponses.length} field updates`,
        fields: fieldKeys
      });
    } catch (error) {
      logger.error('[KY3P-BATCH-UPDATE] Error processing batch update:', error);
      return res.status(500).json({
        error: 'Failed to process batch update',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Clear all KY3P field responses for a task
   */
  router.post('/api/ky3p/clear-fields/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    logger.info(`[KY3P-BATCH-UPDATE] Received clear fields request for task ${taskId}`);
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    try {
      // Delete all responses for this task
      const result = await db
        .delete(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      // Use the fixed progress update function for guaranteed persistence
      const progressResult = await updateKy3pProgressFixed(taskId, { 
        debug: true,
        forceUpdate: true, // Force update to 0% after clearing responses
        metadata: {
          lastFieldClear: new Date().toISOString(),
          fieldClearOperation: true,
          explicitReset: true // Explicitly request a reset to 0%
        }
      });
      
      // Get the updated task to log the current progress and status
      const [updatedTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      logger.info(`[KY3P-BATCH-UPDATE] Cleared all fields for task ${taskId}, new status: ${updatedTask?.status}`);
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: `Successfully cleared all fields for task ${taskId}`
      });
    } catch (error) {
      logger.error('[KY3P-BATCH-UPDATE] Error clearing fields:', error);
      return res.status(500).json({
        error: 'Failed to clear fields',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Save KY3P form progress
   */
  router.post('/api/ky3p/save-progress/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    logger.info(`[KY3P-BATCH-UPDATE] Received save progress request for task ${taskId}`);
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    try {
      // Get the task to ensure it exists
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        return res.status(404).json({ error: `Task ${taskId} not found` });
      }
      
      // Use the fixed progress update function for guaranteed persistence
      const progressResult = await updateKy3pProgressFixed(taskId, { 
        debug: true,
        forceUpdate: true, // Force the update even if no apparent change in progress
        metadata: {
          lastProgressSave: new Date().toISOString(),
          manualSave: true
        }
      });
      
      // Log the result with more detailed information
      logger.info(`[KY3P-BATCH-UPDATE] Manual progress save result:`, {
        taskId,
        success: progressResult.success,
        progress: progressResult.progress,
        message: progressResult.message
      });
      
      // Get the updated task to return the current progress
      const [updatedTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!updatedTask) {
        throw new Error(`Task ${taskId} not found after update`);
      }
      
      logger.info(`[KY3P-BATCH-UPDATE] Saved progress for task ${taskId}: ${updatedTask.progress}%, status: ${updatedTask.status}`);
      
      // Return success response with the updated progress
      return res.status(200).json({
        success: true,
        progress: updatedTask.progress,
        status: updatedTask.status,
        message: `Successfully saved progress for task ${taskId}`
      });
    } catch (error) {
      logger.error('[KY3P-BATCH-UPDATE] Error saving progress:', error);
      return res.status(500).json({
        error: 'Failed to save progress',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('Registering KY3P batch update routes');
  
  return router;
}

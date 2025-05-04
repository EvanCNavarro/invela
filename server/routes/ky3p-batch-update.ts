/**
 * KY3P Batch Update Routes
 * 
 * This module provides API endpoints for bulk updating KY3P form fields
 * using standardized string-based field keys.
 */

import { Router } from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses, tasks, KYBFieldStatus } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

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
    
    // CRITICAL FIX #1: Make preserveProgress default to true
    // This is a critical change to fix progress reset issues during form editing
    // Parse the preserveProgress parameter with a default of true
    const preserveProgress = req.query.preserveProgress !== 'false';
    const source = req.query.source || 'api';
    
    // CRITICAL FIX #2: Ensure we have the responses object wrapper 
    // Format should be: { responses: [{ fieldKey: key1, value: value1 }, ...] }
    if (!req.body.responses || !Array.isArray(req.body.responses)) {
      logger.error(`[KY3P-BATCH-UPDATE] Invalid request format for task ${taskId}. Expected { responses: [...] } format`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request: responses is required and must be an array' 
      });
    }
    
    // Convert the array of field objects to a more usable format
    const formData = {};
    req.body.responses.forEach(item => {
      if (item && item.fieldKey) {
        formData[item.fieldKey] = item.value;
      }
    });
    
    logger.info(`[KY3P-BATCH-UPDATE] Batch update for task ${taskId} with preserveProgress=${preserveProgress}, source=${source}`);
    
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
              status: KYBFieldStatus.COMPLETE, // Use the enum key to ensure type safety
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
              response_value: String(value),
              status: KYBFieldStatus.COMPLETE, // Use the enum key to ensure type safety
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
        const { updateKy3pProgressFixed } = await import('../utils/unified-progress-fixed');
        
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
   * 
   * FIXED: Added preserveProgress query parameter to control whether progress is reset
   * This fixes the issue where form editing resets progress to 0% even when the user
   * has already completed many fields. During form editing, we want to preserve the
   * current progress, not reset it to 0%.
   */
  router.post('/api/ky3p/clear-fields/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    // NEW PARAMETER: Check if we should preserve progress 
    // Now defaulting to TRUE for KY3P tasks to prevent accidental progress resets
    // Client can explicitly set preserveProgress=false to force progress reset
    const preserveProgress = req.query.preserveProgress !== 'false' && req.body.preserveProgress !== false;
    
    logger.info(`[KY3P-BATCH-UPDATE] Received clear fields request for task ${taskId}`, {
      preserveProgress,
      requestMethod: 'IMPROVED DEFAULT: preserveProgress=true',
      source: req.body.source || req.query.source || 'unknown',
      userAgent: req.headers['user-agent']
    });
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    try {
      // IMPROVEMENT: Get the task progress before clearing responses (if preserveProgress is true)
      const [existingTask] = preserveProgress ? await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId)) : [null];
      
      // Store existing progress if we're preserving it
      const existingProgress = preserveProgress && existingTask ? existingTask.progress || 0 : 0;
      const existingStatus = preserveProgress && existingTask ? existingTask.status : 'not_started';
      
      if (preserveProgress) {
        logger.info(`[KY3P-BATCH-UPDATE] Preserving progress for task ${taskId}: ${existingProgress}%, status: ${existingStatus}`);
      }
      
      // Delete all responses for this task
      const result = await db
        .delete(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      // Use the fixed progress update function for guaranteed persistence
      const { updateKy3pProgressFixed } = await import('../utils/unified-progress-fixed');
      
      if (preserveProgress) {
        // ENHANCEMENT: If preserving progress, use the existing progress value
        // instead of recalculating (which would be 0% after clearing responses)
        // This ensures progress doesn't reset during form editing
        await db
          .update(tasks)
          .set({
            updated_at: new Date(),
            metadata: {
              ...(existingTask?.metadata || {}),
              lastFieldClear: new Date().toISOString(),
              fieldClearOperation: true,
              preservedProgress: existingProgress,
              preservedStatus: existingStatus
            }
          })
          .where(eq(tasks.id, taskId));
          
        logger.info(`[KY3P-BATCH-UPDATE] Cleared fields but preserved progress for task ${taskId}: ${existingProgress}%`);
      } else {
        // Original behavior: reset progress to 0%
        await updateKy3pProgressFixed(taskId, { 
          debug: true,
          forceUpdate: true, // Force update to 0% after clearing responses
          metadata: {
            lastFieldClear: new Date().toISOString(),
            fieldClearOperation: true,
            explicitReset: true // Explicitly request a reset to 0%
          }
        });
      }
      
      // Get the updated task to log the current progress and status
      let updatedTask;
      [updatedTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
        
      // CRITICAL FIX: Ensure progress is properly preserved when requested
      // This fixes an edge case where progress is correctly kept in the database record
      // but the response doesn't reflect the preserved progress
      if (preserveProgress && existingProgress > 0 && updatedTask && updatedTask.progress === 0) {
        logger.error(`[KY3P CRITICAL ERROR] Progress reset detected despite preserveProgress=true. Task ${taskId}: ${existingProgress}% -> 0%`);
        
        // Force update the progress back to the original value
        await db
          .update(tasks)
          .set({
            progress: existingProgress,
            metadata: {
              ...updatedTask.metadata,
              progressEmergencyFixed: true,
              originalProgress: existingProgress,
              fixTimestamp: new Date().toISOString()
            }
          })
          .where(eq(tasks.id, taskId));
          
        logger.info(`[KY3P-BATCH-UPDATE] Emergency progress restoration performed for task ${taskId}: restored to ${existingProgress}%`);
        
        // Get the task again after emergency fix
        [updatedTask] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
      }
      
      logger.info(`[KY3P-BATCH-UPDATE] Cleared all fields for task ${taskId}, new status: ${updatedTask?.status}, progress: ${updatedTask?.progress}%`);
      
      // Return success response
      return res.status(200).json({
        success: true,
        preservedProgress: preserveProgress ? existingProgress : undefined,
        progress: updatedTask?.progress || 0,
        status: updatedTask?.status || 'not_started',
        message: `Successfully cleared all fields for task ${taskId}${preserveProgress ? ' (preserved progress)' : ''}`
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
      const { updateKy3pProgressFixed } = await import('../utils/unified-progress-fixed');
      
      // ENHANCED SOLUTION: Use the fixed progress function specifically for KY3P
      // This ensures proper persistence for KY3P progress to the database
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

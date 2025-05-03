/**
 * Unified KY3P Update Routes
 * 
 * This module provides API endpoints for updating KY3P form fields with proper
 * progress tracking and WebSocket notifications. It uses the unified task progress
 * system to ensure consistent behavior across all form types.
 */

import { Router } from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses, tasks } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { updateTaskProgress } from '../utils/unified-task-progress';
import { logger } from '../utils/logger';

/**
 * Register unified KY3P update routes
 * 
 * @returns Router with KY3P update routes
 */
export function registerUnifiedKY3PUpdateRoutes() {
  logger.info('[UnifiedKY3P] Registering unified KY3P update routes');
  
  const router = Router();

  /**
   * Process a batch update of KY3P fields
   */
  router.post('/api/ky3p/unified-update/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    // Ensure valid request format
    if (!req.body.responses || typeof req.body.responses !== 'object') {
      logger.error(`[UnifiedKY3P] Invalid request format for task ${taskId}. Expected { responses: {...} } format`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request: responses is required and must be an object' 
      });
    }
    
    const formData = req.body.responses; // Get the field data from the responses wrapper
    const fieldKeys = Object.keys(formData);
    
    logger.info(`[UnifiedKY3P] Received update request for task ${taskId}`, {
      fieldCount: fieldKeys.length
    });
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    if (fieldKeys.length === 0) {
      return res.status(200).json({
        success: true,
        processedCount: 0,
        message: 'No fields to update'
      });
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
      
      // Get KY3P fields matching the field keys
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
      
      // Use a transaction for batch operations
      await db.transaction(async (tx) => {
        for (const [fieldKey, value] of Object.entries(formData)) {
          const fieldId = fieldKeyToIdMap.get(fieldKey);
          
          if (!fieldId) {
            logger.warn(`[UnifiedKY3P] Field key not found: ${fieldKey}`);
            continue;
          }
          
          // Check if a response already exists
          const [existingResponse] = await tx
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
            await tx
              .update(ky3pResponses)
              .set({
                response_value: String(value),
                status: 'COMPLETE', // Always use uppercase string for consistency
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
            await tx
              .insert(ky3pResponses)
              .values({
                task_id: taskId,
                field_id: fieldId,
                response_value: String(value),
                status: 'COMPLETE', // Always use uppercase string for consistency
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
      });
      
      // Update task progress using the unified progress update function
      try {
        // Use unified progress update to ensure consistent behavior across all form types
        const progressResult = await updateTaskProgress(taskId, 'ky3p', { 
          debug: true,
          forceUpdate: true, // Force an update to ensure progress is recalculated
          metadata: {
            lastBatchUpdate: new Date().toISOString(),
            batchUpdateSize: batchResponses.length
          }
        });
        
        if (progressResult.success) {
          logger.info(`[UnifiedKY3P] Successfully updated task ${taskId} progress to ${progressResult.progress}%`);
        } else {
          logger.warn(`[UnifiedKY3P] Progress update warning:`, {
            taskId,
            message: progressResult.message
          });
        }
      } catch (error) {
        logger.error('[UnifiedKY3P] Error updating task progress:', error);
        // Continue processing, don't fail the whole request
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        processedCount: batchResponses.length,
        message: `Successfully processed ${batchResponses.length} field updates`,
        fields: batchResponses.map(response => response.fieldKey)
      });
    } catch (error) {
      logger.error('[UnifiedKY3P] Error processing batch update:', {
        taskId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        message: `Error processing batch update: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  return router;
}

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

/**
 * Register KY3P batch update routes
 * 
 * @returns Router with KY3P batch update routes
 */
export function registerKY3PBatchUpdateRoutes() {
  console.log('[KY3P-BATCH-UPDATE] Registering KY3P batch update routes');
  
  const router = Router();

  /**
   * Process a batch update of KY3P fields using string-based field keys
   */
  router.post('/api/ky3p/batch-update/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    // CRITICAL FIX: Ensure we have the responses object wrapper 
    // Format should be: { responses: { fieldKey1: value1, ... } }
    if (!req.body.responses || typeof req.body.responses !== 'object') {
      console.error(`[KY3P-BATCH-UPDATE] Invalid request format for task ${taskId}. Expected { responses: {...} } format`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request: responses is required and must be an object' 
      });
    }
    
    const formData = req.body.responses; // Get the actual field data from the responses wrapper
    
    console.log(`[KY3P-BATCH-UPDATE] Received batch update request for task ${taskId}`, {
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
          console.warn(`[KY3P-BATCH-UPDATE] Field key not found: ${fieldKey}`);
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
              status: 'COMPLETE', // Always set status to COMPLETE when updating a field
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
              status: 'COMPLETE', // Always set status to COMPLETE when inserting a field
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
      
      // Update task progress with improved status tracking
      try {
        // Count total responses for this task
        const [responseCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(ky3pResponses)
          .where(eq(ky3pResponses.task_id, taskId));
        
        // Count completed responses for this task (status = COMPLETE)
        const [completedCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(ky3pResponses)
          .where(
            and(
              eq(ky3pResponses.task_id, taskId),
              eq(ky3pResponses.status, 'COMPLETE')
            )
          );
        
        // Count total fields
        const [fieldCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(ky3pFields);
        
        // Calculate progress percentage based on COMPLETE fields
        const totalFields = fieldCount?.count || 1;
        // Use completedCount instead of responseCount for more accurate progress
        const completedFields = completedCount?.count || 0;
        const progress = Math.min(100, Math.floor((completedFields / totalFields) * 100));
        
        console.log(`[KY3P-BATCH-UPDATE] Progress calculation: ${completedFields}/${totalFields} = ${progress}% (total responses: ${responseCount?.count || 0})`);
        
        // Get current task information to update status correctly
        const [task] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        
        // Determine the appropriate status based on progress
        // Import the determineStatusFromProgress function from utils/progress
        const { determineStatusFromProgress } = await import('../utils/progress');
        
        // Always preserve SUBMITTED status if the task was previously submitted
        const newStatus = determineStatusFromProgress(
          progress, 
          task.status as any, // Cast to match the expected type
          [], // No form responses needed for simple progress update
          task.metadata || {} // Pass existing metadata
        );
        
        // Update task progress and status
        await db
          .update(tasks)
          .set({ 
            progress,
            status: newStatus,
            // Update the new status_changed_at if status is changing
            ...(task.status !== newStatus ? { status_changed_at: new Date() } : {})
          })
          .where(eq(tasks.id, taskId));
        
        // Import broadcastProgressUpdate function for WebSocket notification
        const { broadcastProgressUpdate } = await import('../utils/progress');
        
        // Broadcast the update to connected clients
        broadcastProgressUpdate(taskId, progress, newStatus as any, task.metadata || {});
        
        console.log(`[KY3P-BATCH-UPDATE] Updated task ${taskId} progress to ${progress}%, status: ${newStatus}`);
      } catch (error) {
        console.error('[KY3P-BATCH-UPDATE] Error updating task progress:', error);
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
      console.error('[KY3P-BATCH-UPDATE] Error processing batch update:', error);
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
    
    console.log(`[KY3P-BATCH-UPDATE] Received clear fields request for task ${taskId}`);
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    try {
      // Delete all responses for this task
      const result = await db
        .delete(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      // Get current task before updating
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // Import status determination and broadcast utilities
      const { determineStatusFromProgress, broadcastProgressUpdate } = await import('../utils/progress');
      
      // Set progress to 0 which will typically map to NOT_STARTED status
      // unless the task was previously submitted
      const newProgress = 0;
      const newStatus = determineStatusFromProgress(
        newProgress,
        task.status as any,
        [], // No form responses for cleared form
        task.metadata || {}
      );
      
      // Update task progress and status
      await db
        .update(tasks)
        .set({ 
          progress: newProgress,
          status: newStatus,
          // Update the status change timestamp if status is changing
          ...(task.status !== newStatus ? { status_changed_at: new Date() } : {})
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast the update
      broadcastProgressUpdate(taskId, newProgress, newStatus as any, task.metadata || {});
      
      console.log(`[KY3P-BATCH-UPDATE] Cleared all fields for task ${taskId}, new status: ${newStatus}`);
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: `Successfully cleared all fields for task ${taskId}`
      });
    } catch (error) {
      console.error('[KY3P-BATCH-UPDATE] Error clearing fields:', error);
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
    
    console.log(`[KY3P-BATCH-UPDATE] Received save progress request for task ${taskId}`);
    
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
      
      // Count responses for this task
      const [responseCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      // Count completed responses for this task (status = COMPLETE)
      const [completedCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.status, 'COMPLETE')
          )
        );
      
      // Count total fields
      const [fieldCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ky3pFields);
      
      // Calculate progress percentage
      const totalFields = fieldCount?.count || 1;
      const completedFields = responseCount?.count || 0;
      const progress = Math.min(100, Math.floor((completedFields / totalFields) * 100));
      
      // Determine the appropriate status based on progress using our utility function
      const { determineStatusFromProgress, broadcastProgressUpdate } = await import('../utils/progress');
      
      // Always preserve SUBMITTED status if the task was previously submitted
      const newStatus = determineStatusFromProgress(
        progress, 
        task.status as any, // Cast to match the expected type
        [], // No form responses needed for simple progress update
        task.metadata || {} // Pass existing metadata
      );
      
      // Update task progress and status
      await db
        .update(tasks)
        .set({ 
          progress,
          status: newStatus,
          // Update the new status_changed_at if status is changing
          ...(task.status !== newStatus ? { status_changed_at: new Date() } : {})
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast the update to connected clients
      broadcastProgressUpdate(taskId, progress, newStatus as any, task.metadata || {});
      
      console.log(`[KY3P-BATCH-UPDATE] Saved progress for task ${taskId}: ${progress}%, status: ${newStatus}`);
      
      // Return success response
      return res.status(200).json({
        success: true,
        progress,
        message: `Successfully saved progress for task ${taskId}`
      });
    } catch (error) {
      console.error('[KY3P-BATCH-UPDATE] Error saving progress:', error);
      return res.status(500).json({
        error: 'Failed to save progress',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  console.log('Registering KY3P batch update routes');
  
  return router;
}

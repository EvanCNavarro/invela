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

const router = Router();

/**
 * Register KY3P batch update routes
 * 
 * @param app The Express application instance
 */
export function registerKY3PBatchUpdateRoutes(app: Router) {
  console.log('[KY3P-BATCH-UPDATE] Registering KY3P batch update routes');

  /**
   * Process a batch update of KY3P fields using string-based field keys
   */
  app.post('/api/ky3p/batch-update/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const formData = req.body; // object with field_key: value pairs
    
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
              eq(ky3pResponses.taskId, taskId),
              eq(ky3pResponses.fieldId, fieldId)
            )
          );
        
        if (existingResponse) {
          // Update existing response
          await db
            .update(ky3pResponses)
            .set({
              value: String(value),
              updatedAt: timestamp
            })
            .where(
              and(
                eq(ky3pResponses.taskId, taskId),
                eq(ky3pResponses.fieldId, fieldId)
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
              id: randomUUID(),
              taskId,
              fieldId,
              value: String(value),
              createdAt: timestamp,
              updatedAt: timestamp
            });
          
          batchResponses.push({
            fieldId,
            fieldKey,
            operation: 'insert',
            value: String(value)
          });
        }
      }
      
      // Update the task progress
      try {
        // Count total responses for this task
        const [responseCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(ky3pResponses)
          .where(eq(ky3pResponses.taskId, taskId));
        
        // Count total fields
        const [fieldCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(ky3pFields);
        
        // Calculate progress percentage
        const totalFields = fieldCount?.count || 1;
        const completedFields = responseCount?.count || 0;
        const progress = Math.min(100, Math.floor((completedFields / totalFields) * 100));
        
        // Update task progress
        await db
          .update(tasks)
          .set({ progress })
          .where(eq(tasks.id, taskId));
        
        console.log(`[KY3P-BATCH-UPDATE] Updated task ${taskId} progress to ${progress}%`);
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
  app.post('/api/ky3p/clear-fields/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    console.log(`[KY3P-BATCH-UPDATE] Received clear fields request for task ${taskId}`);
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    try {
      // Delete all responses for this task
      const result = await db
        .delete(ky3pResponses)
        .where(eq(ky3pResponses.taskId, taskId));
      
      // Update task progress to 0
      await db
        .update(tasks)
        .set({ progress: 0 })
        .where(eq(tasks.id, taskId));
      
      console.log(`[KY3P-BATCH-UPDATE] Cleared all fields for task ${taskId}`);
      
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
  app.post('/api/ky3p/save-progress/:taskId', async (req, res) => {
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
        .where(eq(ky3pResponses.taskId, taskId));
      
      // Count total fields
      const [fieldCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ky3pFields);
      
      // Calculate progress percentage
      const totalFields = fieldCount?.count || 1;
      const completedFields = responseCount?.count || 0;
      const progress = Math.min(100, Math.floor((completedFields / totalFields) * 100));
      
      // Update task progress
      await db
        .update(tasks)
        .set({ progress })
        .where(eq(tasks.id, taskId));
      
      console.log(`[KY3P-BATCH-UPDATE] Saved progress for task ${taskId}: ${progress}%`);
      
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

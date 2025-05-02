/**
 * KY3P Field Update API Routes
 * 
 * This file implements the API routes for updating KY3P form fields
 * using standardized string-based field keys.
 */

import express, { Router } from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses, tasks } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { determineStatusFromProgress, updateTaskProgress } from '../utils/progress';
import { broadcastTaskProgressUpdate } from '../utils/task-broadcast';
import { KYBFieldStatus } from '@db/schema';

// Logger is already initialized in the imported module

/**
 * Register the KY3P field update routes
 */
export function registerKY3PFieldUpdateRoutes() {
  logger.info('Registering KY3P field update routes');
  
  const router = Router();

  /**
   * Update a single KY3P field by field key
   * 
   * POST /api/ky3p-fields/:taskId/update-field
   * 
   * This endpoint is used for updating a single field with task progress and status updates
   */
  router.post('/api/ky3p-fields/:taskId/update-field', async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      // Support both newer 'field_key' and older 'fieldKey' formats for backward compatibility
      const field_key = req.body.field_key || req.body.fieldKey;
      const value = req.body.value;

      if (!field_key) {
        console.log('[KY3P API] ERROR: Missing required parameter: field_key or fieldKey');
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required parameter: field_key or fieldKey' 
        });
      }
      
      if (value === undefined || value === null) {
        console.log('[KY3P API] ERROR: Missing required parameter: value');
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required parameter: value' 
        });
      }
      
      logger.info(`[KY3P API] Processing field update for task ${taskId}, field ${field_key}`);
      // Log the request body for debugging
      logger.debug(`[KY3P API] Request body:`, req.body);

      logger.info(`[KY3P API] Processing single field update for task ${taskId}, field ${field_key}`);

      // DIAGNOSTIC: Log request details
      console.log(`[KY3P FIELD UPDATE] Field update request details:`, {
        taskId,
        field_key,
        value: typeof value === 'string' ? value.substring(0, 20) + '...' : value,
        requestMethod: req.method,
        contentType: req.get('Content-Type'),
        bodyKeys: Object.keys(req.body),
        timestamp: new Date().toISOString()
      });

      // Find the field ID using the string field key
      const fieldResults = await db.select()
        .from(ky3pFields)
        .where(eq(ky3pFields.field_key, field_key))
        .limit(1);
      
      console.log(`[KY3P FIELD UPDATE] Field lookup results for '${field_key}':`, {
        found: fieldResults.length > 0,
        fieldId: fieldResults.length > 0 ? fieldResults[0].id : null
      });
      
      // If field not found by key, try using the field name or question for backward compatibility
      if (fieldResults.length === 0) {
        console.log(`[KY3P FIELD UPDATE] Field not found by key, trying display_name fallback`);
        
        const altFieldResults = await db.select()
          .from(ky3pFields)
          .where(eq(ky3pFields.display_name, field_key))
          .limit(1);
        
        console.log(`[KY3P FIELD UPDATE] Display name lookup results:`, {
          found: altFieldResults.length > 0,
          fieldId: altFieldResults.length > 0 ? altFieldResults[0].id : null,
          displayName: field_key
        });
        
        if (altFieldResults.length === 0) {
          logger.error(`[KY3P API] Field not found with key or display_name: ${field_key}`);
          return res.status(404).json({
            success: false,
            message: `Field not found with key: ${field_key}`
          });
        }
        
        fieldResults.push(altFieldResults[0]);
      }

      const fieldId = fieldResults[0].id;
      
      // Check if a response already exists for this task and field
      const existingResponses = await db.select()
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.field_id, fieldId)
          )
        );

      const now = new Date();
      
      if (existingResponses.length > 0) {
        // Update existing response
        console.log(`[KY3P FIELD UPDATE] Updating existing response for task ${taskId}, field ${fieldId}:`, {
          oldValue: existingResponses[0].response_value,
          newValue: value,
          oldStatus: existingResponses[0].status,
          newStatus: 'COMPLETE'
        });
        
        await db.update(ky3pResponses)
          .set({ 
            response_value: value, 
            updated_at: now,
            status: KYBFieldStatus.COMPLETE // Use the enum key to ensure type safety
          })
          .where(
            and(
              eq(ky3pResponses.task_id, taskId),
              eq(ky3pResponses.field_id, fieldId)
            )
          );
      } else {
        // Insert new response
        await db.insert(ky3pResponses)
          .values({
            task_id: taskId,
            field_id: fieldId,
            response_value: value,
            status: KYBFieldStatus.COMPLETE, // Use the enum key to ensure type safety
            created_at: now,
            updated_at: now
          });
      }

      // Use the central task progress update function to ensure consistency
      // This is a key part of our unified solution - all field updates use the same progress calculation
      try {
        // Check if debug flag was passed in the request
        const enableDebug = req.body.debug === true;
        console.log(`[KY3P API] Running updateTaskProgress with debug=${enableDebug}`);
        
        // UNIFIED SOLUTION: Use the centralized progress update function with force update
        // This ensures consistent progress calculation across all form types
        await updateTaskProgress(taskId, 'ky3p', { 
          debug: true, // Always use debug mode for tracing 
          forceUpdate: true // Force update to ensure progress is saved
        });
        
        // Get the updated task to return the current progress and status
        const [updatedTask] = await db.select()
          .from(tasks)
          .where(eq(tasks.id, taskId));
        
        logger.info(`[KY3P API] Successfully updated task ${taskId} progress to ${updatedTask.progress}%, status: ${updatedTask.status}`);
        
        return res.status(200).json({ 
          success: true, 
          message: `Successfully updated field: ${field_key}`,
          progress: updatedTask.progress,
          status: updatedTask.status,
          taskId: taskId
        });
      } catch (updateError) {
        // If progress update fails, log but still return success for the field update
        logger.error(`[KY3P API] Error updating task progress (but field was updated):`, updateError instanceof Error ? { message: updateError.message, stack: updateError.stack } : updateError);
        
        return res.status(200).json({ 
          success: true, 
          message: `Successfully updated field: ${field_key}, but could not update task progress`,
          fieldUpdated: true,
          progressUpdateFailed: true,
          error: updateError instanceof Error ? updateError.message : 'Unknown progress update error'
        });
      }
    } catch (error) {
      logger.error('[KY3P API] Error processing field update:', error instanceof Error ? { message: error.message, stack: error.stack } : error);
      console.error('[KY3P API] CRITICAL ERROR in field update:', {
        error: error instanceof Error ? error.message : 'Unknown error type',
        stack: error instanceof Error ? error.stack : null,
        taskId: req.params.taskId,
        fieldKey: req.body.field_key || req.body.fieldKey,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        errorDetails: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : null) : undefined
      });
    }
  });

  /**
   * Update a single KY3P field by field key
   * 
   * POST /api/ky3p-fields/:taskId/update
   */
  /**
   * Legacy API endpoint - DEPRECATED and REMOVED
   * Use /api/ky3p-fields/:taskId/update-field instead
   * 
   * This endpoint has been removed. All clients should use the /update-field endpoint.
   */
  router.post('/api/ky3p-fields/:taskId/update', async (req, res) => {
    // Redirect to the new endpoint
    logger.warn(`[KY3P API] Deprecated endpoint /api/ky3p-fields/${req.params.taskId}/update was called. Client should update to use /update-field instead.`);
    
    // Convert fieldKey to field_key for compatibility
    const updatedBody = {
      ...req.body,
      field_key: req.body.fieldKey || req.body.field_key
    };
    
    // Forward the request to our standardized endpoint handler
    req.body = updatedBody;
    
    // Respond with a deprecation warning
    return res.status(410).json({
      success: false,
      message: "This endpoint is deprecated. Please use /api/ky3p-fields/:taskId/update-field instead.",
      deprecationNotice: true
    });
  });
  
  return router;
}
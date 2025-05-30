/**
 * KY3P Fixed Routes
 * 
 * This module provides improved endpoints for KY3P forms with proper error handling
 * and consistent response formats.
 * 
 * Added response fetching endpoint for error recovery.
 */

import express from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses, tasks } from '@db/schema';

// Import the standardized field status enum
import { FieldStatus } from '../utils/field-status';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { universalDemoAutoFillService } from '../services/universalDemoAutoFillService';

const router = express.Router();

// Helper function to update task progress
async function updateTaskProgress(taskId: number): Promise<number> {
  try {
    // Direct database update to calculate and update progress
    // Get total number of distinct fields by field_key
    const totalResultQuery = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM ky3p_fields`
    );
    
    // Get completed responses count, using field_key instead of field_id
    // This ensures progress is calculated based on unique fields
    const completedResultQuery = await db.execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT field_key) as count 
          FROM ky3p_responses 
          WHERE task_id = ${taskId} 
          AND status = ${FieldStatus.COMPLETE}`
    );
    
    // Safely extract count values, handle different result formats
    const totalResult = Array.isArray(totalResultQuery) ? totalResultQuery[0] : totalResultQuery;
    const completedResult = Array.isArray(completedResultQuery) ? completedResultQuery[0] : completedResultQuery;
    
    const total = Number(totalResult?.count || 0);
    const completed = Number(completedResult?.count || 0);
    
    // Calculate progress percentage (0-100)
    const progressPercent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    
    // Update the task progress in the tasks table directly with type casting for safety
    await db.execute(
      sql`UPDATE tasks SET progress = CAST(${progressPercent} AS REAL), updated_at = NOW() WHERE id = ${taskId}`
    );
    
    console.log(`[KY3P] Task ${taskId} progress updated: ${progressPercent}% (${completed}/${total} fields complete)`);
    
    // Broadcast the update using the unified websocket system
    try {
      const { broadcastTaskUpdate } = await import('../utils/unified-websocket');
      const status = progressPercent === 0 ? 'not_started' : 
                    progressPercent === 100 ? 'ready_for_submission' : 
                    'in_progress';
        
      broadcastTaskUpdate({
        id: taskId,
        taskId: taskId, // Include both formats for compatibility
        status,
        progress: progressPercent,
        metadata: {
          updatedVia: 'ky3p-fixed-routes',
          timestamp: new Date().toISOString()
        }
      });
    } catch (wsError) {
      console.error('[KY3P] Error broadcasting progress update', wsError);
      // Continue execution even if the broadcast fails
    }
    
    return progressPercent;
  } catch (error) {
    console.error('[KY3P] Error updating task progress', error);
    return 0;
  }
}

/**
 * Special batch-update endpoint that accepts string field keys
 */
router.post('/api/ky3p/batch-update/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    // Validate responses
    const { responses } = req.body;
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: responses is required and must be an object'
      });
    }
    
    // Log the request details
    console.log(`[KY3P API] Received batch update for task ${taskId} with ${Object.keys(responses).length} fields`);
    
    // Get all fields for field type validation and ID mapping
    const fields = await db.select().from(ky3pFields);
    
    // Create useful maps for field lookup by key
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    
    // Process all responses as a batch
    const responseEntries: Array<{
      task_id: number;
      field_id: number;
      response_value: string;
      status: string;
    }> = [];
    
    // Convert responses with string keys to array format with explicit fieldId
    for (const [fieldKey, value] of Object.entries(responses)) {
      const fieldId = fieldKeyToIdMap.get(fieldKey);
      
      if (fieldId !== undefined) {
        // Ensure field ID is a number
        const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
        
        if (!isNaN(numericFieldId)) {
          responseEntries.push({
            task_id: taskId,
            field_id: numericFieldId,
            response_value: String(value),
            // Use the standardized FieldStatus enum
            status: value ? FieldStatus.COMPLETE : FieldStatus.EMPTY
          });
        } else {
          console.warn(`[KY3P API] Invalid field ID for key ${fieldKey}: ${fieldId}`);
        }
      } else {
        console.warn(`[KY3P API] Field not found in batch update: ${fieldKey}`);
      }
    }
    
    // Don't fail if we don't have any fields, just report it
    if (responseEntries.length === 0) {
      console.warn(`[KY3P API] No matching fields found for task ${taskId}`);
      
      return res.status(200).json({
        success: true,
        processedCount: 0,
        message: `Successfully processed 0 field updates for task ${taskId}`
      });
    }
    
    // Insert all responses in a single transaction
    await db.transaction(async (tx) => {
      // First delete existing responses for these fields
      await tx.delete(ky3pResponses)
        .where(and(
          eq(ky3pResponses.task_id, taskId),
          inArray(ky3pResponses.field_id, responseEntries.map(entry => entry.field_id))
        ));
      
      // Then insert new responses with field_key for each entry
      for (const entry of responseEntries) {
        // Find the corresponding field_key for this field_id
        const fieldKey = [...fieldKeyToIdMap].find(([key, id]) => id === entry.field_id)?.[0];
        
        // Insert the response with field_key included
        await tx.insert(ky3pResponses).values({
          task_id: entry.task_id,
          field_id: entry.field_id,
          field_key: fieldKey, // Include field_key from our map
          response_value: entry.response_value,
          status: entry.status,
          version: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    });
    
    // Update task progress
    const progressPercent = await updateTaskProgress(taskId);
    
    return res.status(200).json({
      success: true,
      message: `Successfully processed ${responseEntries.length} field updates`,
      processedCount: responseEntries.length,
      fieldKeys: responseEntries.map(entry => entry.field_id).join(', '),
      progressPercent
    });
  } catch (error) {
    console.error('[KY3P API] Error processing batch update', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing the batch update',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Special demo-autofill endpoint for KY3P forms
 * 
 * NOTE: This implementation is deprecated in favor of the universal-demo-autofill service.
 * This route still exists for backward compatibility but delegates to the universal service.
 * 
 * @deprecated Use the universal demo auto-fill service instead
 */
router.post('/api/ky3p/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    // Using the imported service (now imported at the top of the file)
    
    // Log with deprecated notice
    console.log(`[KY3P API DEPRECATED] Demo auto-fill requested for task ${taskId}, delegating to universal service`);
    
    // Use the universal service to ensure consistent behavior across all form types
    try {
      const result = await universalDemoAutoFillService.applyDemoData(
        taskId,
        'ky3p',
        req.user?.id
      );
      
      // Return the result with both fieldCount (new) and fieldsPopulated (old) for compatibility
      return res.status(200).json({
        success: true,
        message: result.message,
        fieldCount: result.fieldCount,
        fieldsPopulated: result.fieldCount, // For backward compatibility
        formType: 'ky3p'
      });
    } catch (serviceError) {
      throw serviceError; // Re-throw to be caught by the outer catch block
    }
  } catch (error) {
    console.error('[KY3P API] Error auto-filling demo data', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while auto-filling demo data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get all responses for a KY3P task
 * This is used for error recovery when loadResponses fails in the form service
 */
router.get('/api/ky3p/responses/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    console.log(`[KY3P API] Retrieving responses for task ${taskId}`);
    
    // Get all responses for this task
    const responses = await db.select().from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    return res.status(200).json({
      success: true,
      message: `Retrieved ${responses.length} responses for task ${taskId}`,
      responses: responses
    });
  } catch (error) {
    console.error('[KY3P API] Error retrieving responses', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving responses',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Clear all responses for a KY3P task
 * 
 * @param preserveProgress If true, don't reset progress to 0% after clearing fields
 *                         This is useful when editing forms to prevent progress from resetting
 */
router.post('/api/ky3p/clear-fields/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    // Check if we should preserve progress (used during form editing)
    const preserveProgress = req.query.preserveProgress === 'true';
    
    console.log(`[KY3P API] Clear all fields requested for task ${taskId}`, {
      preserveProgress
    });
    
    // Save current progress if we need to preserve it
    let currentProgress = 0;
    if (preserveProgress) {
      const [task] = await db.select({ progress: tasks.progress })
        .from(tasks)
        .where(eq(tasks.id, taskId));
      currentProgress = task?.progress || 0;
      console.log(`[KY3P API] Preserving current progress: ${currentProgress}%`);
    }
    
    // Delete all responses for this task
    await db.delete(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    if (preserveProgress) {
      // If preserving progress, update the task with the previous progress value
      await db.update(tasks)
        .set({
          // Use the SQL value validator to ensure proper type casting
          progress: sql`CAST(${currentProgress} AS INTEGER)`,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      return res.status(200).json({
        success: true,
        message: `Successfully cleared all fields for task ${taskId} while preserving progress`,
        progressPercent: currentProgress,
        preservedProgress: true
      });
    } else {
      // Standard behavior: update task progress (will be 0%)
      await updateTaskProgress(taskId);
      
      return res.status(200).json({
        success: true,
        message: `Successfully cleared all fields for task ${taskId}`,
        progressPercent: 0,
        preservedProgress: false
      });
    }
  } catch (error) {
    console.error('[KY3P API] Error clearing fields', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while clearing fields',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
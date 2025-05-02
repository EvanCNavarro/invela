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

// Define field status enum to match database schema
const KYBFieldStatus = {
  EMPTY: 'EMPTY',
  INCOMPLETE: 'INCOMPLETE',
  COMPLETE: 'COMPLETE',
  INVALID: 'INVALID'
} as const;
import { and, eq, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { universalDemoAutoFillService } from '../services/universalDemoAutoFillService';

const router = express.Router();

// Helper function to update task progress
async function updateTaskProgress(taskId: number): Promise<number> {
  try {
    // Direct database update to calculate and update progress
    // Get all fields count (we're not using is_visible at this time)
    const totalResultQuery = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM ky3p_fields`
    );
    
    // Get completed responses count
    const completedResultQuery = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM ky3p_responses WHERE task_id = ${taskId} AND status = ${KYBFieldStatus.COMPLETE}`
    );
    
    // Safely extract count values, handle different result formats
    const totalResult = Array.isArray(totalResultQuery) ? totalResultQuery[0] : totalResultQuery;
    const completedResult = Array.isArray(completedResultQuery) ? completedResultQuery[0] : completedResultQuery;
    
    const total = Number(totalResult?.count || 0);
    const completed = Number(completedResult?.count || 0);
    
    // Calculate progress percentage (0-100)
    const progressPercent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    
    // Update the task progress in the tasks table directly
    await db.execute(
      sql`UPDATE tasks SET progress = ${progressPercent}, updated_at = NOW() WHERE id = ${taskId}`
    );
    
    console.log(`[KY3P] Task ${taskId} progress updated: ${progressPercent}%`);
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
      status: keyof typeof KYBFieldStatus;
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
            // Use the enum values directly - they are lowercase in the database schema
            status: value ? 'complete' : 'empty'
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
      
      // Then insert new responses
      await tx.insert(ky3pResponses).values(responseEntries);
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
    
    console.log(`[KY3P API] Clear all fields requested for task ${taskId}`);
    
    // Delete all responses for this task
    await db.delete(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    // Update task progress (will be 0%)
    await updateTaskProgress(taskId);
    
    return res.status(200).json({
      success: true,
      message: `Successfully cleared all fields for task ${taskId}`,
      progressPercent: 0
    });
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
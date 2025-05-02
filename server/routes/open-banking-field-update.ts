/**
 * Open Banking Field Update Route
 * 
 * This route handles updating a single field in an Open Banking survey task
 * and uses our unified progress calculation approach.
 */

import { Router } from 'express';
import { db } from '@db';
import { eq, and, sql } from 'drizzle-orm';
import { tasks, openBankingFields, openBankingResponses, KYBFieldStatus } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { 
  calculateTaskProgress, 
  updateTaskProgress, 
  broadcastProgressUpdate,
  determineTaskStatus
} from '../utils/universal-progress';

const router = Router();

/**
 * Update a single field in an Open Banking survey
 * 
 * This endpoint allows updating a single field and recalculates progress
 * using our universal progress calculation function.
 */
router.post('/api/open-banking/fields/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { fieldKey, value } = req.body;
    
    if (!fieldKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Field key is required' 
      });
    }
    
    logger.info('[Open Banking API] Updating field', {
      taskId,
      fieldKey,
      timestamp: new Date().toISOString()
    });
    
    // Get the task to verify it exists and is an Open Banking task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));
      
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }
    
    // Get the field definition using the field key
    const [fieldDefinition] = await db
      .select()
      .from(openBankingFields)
      .where(eq(openBankingFields.field_key, fieldKey));
      
    if (!fieldDefinition) {
      return res.status(404).json({ 
        success: false, 
        error: `Field ${fieldKey} not found` 
      });
    }
    
    // Check if a response already exists for this field
    const [existingResponse] = await db
      .select()
      .from(openBankingResponses)
      .where(
        and(
          eq(openBankingResponses.task_id, parseInt(taskId)),
          eq(openBankingResponses.field_id, fieldDefinition.id)
        )
      );
    
    // Determine field status based on value
    const hasValue = value !== null && value !== undefined && value !== '';
    const status = hasValue ? "COMPLETE" : "INCOMPLETE";
    
    logger.info('[Open Banking API] Field update details', {
      taskId,
      fieldKey,
      fieldId: fieldDefinition.id,
      hasValue,
      status,
      existingResponse: !!existingResponse,
      timestamp: new Date().toISOString()
    });
    
    // Start a transaction to ensure atomic operations
    const result = await db.transaction(async (tx) => {
      if (existingResponse) {
        // Update existing response
        await tx
          .update(openBankingResponses)
          .set({
            response_value: value,
            status,
            updated_at: new Date()
          })
          .where(
            and(
              eq(openBankingResponses.task_id, parseInt(taskId)),
              eq(openBankingResponses.field_id, fieldDefinition.id)
            )
          );
      } else {
        // Insert a new response
        await tx
          .insert(openBankingResponses)
          .values({
            task_id: parseInt(taskId),
            field_id: fieldDefinition.id,
            field_key: fieldKey,
            response_value: value,
            status
          });
      }
      
      // Calculate the new progress using our unified approach
      const newProgress = await calculateTaskProgress(
        parseInt(taskId), 
        'open_banking', 
        { tx, debug: true }
      );
      
      // Determine the appropriate status based on the new progress
      const newStatus = determineTaskStatus(
        newProgress,
        task.status as any,
        task.metadata || {}
      );
      
      logger.info('[Open Banking API] Progress calculation completed', {
        taskId,
        previousProgress: task.progress,
        newProgress,
        previousStatus: task.status,
        newStatus,
        timestamp: new Date().toISOString()
      });
      
      // Only update the task if progress or status changed
      if (task.progress !== newProgress || task.status !== newStatus) {
        // Update the task with the new progress and status
        const [updatedTask] = await tx
          .update(tasks)
          .set({
            progress: newProgress,
            status: newStatus,
            updated_at: new Date()
          })
          .where(eq(tasks.id, parseInt(taskId)))
          .returning();
          
        // Return the updated task for response
        return updatedTask;
      }
      
      // No update needed, return the original task
      return task;
    });
    
    // Broadcast field update outside the transaction
    broadcastProgressUpdate(
      parseInt(taskId),
      result.progress as number,
      result.status as any,
      result.metadata || {}
    );
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: `Field ${fieldKey} updated successfully`,
      fieldKey,
      status,
      progress: result.progress,
      taskStatus: result.status
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Open Banking API] Error updating field', { error: errorMessage });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update field',
      message: errorMessage
    });
  }
});

export default router;

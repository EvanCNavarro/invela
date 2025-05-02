/**
 * Open Banking Field Update Route
 * 
 * This route handles updating a single field in an Open Banking survey task
 * and uses our unified progress calculation approach.
 */

import { Router } from 'express';
import { db } from '@db';
import { eq, and } from 'drizzle-orm';
import { 
  tasks, 
  openBankingFields, 
  openBankingResponses,
  InsertOpenBankingResponse,
  TaskStatus,
  KYBFieldStatus
} from '@db/schema';
import { logger } from '../utils/logger';
import { calculateTaskProgress, determineTaskStatus, broadcastProgressUpdate } from '../utils/universal-progress';

const router = Router();

/**
 * Update a single field in an Open Banking survey
 * 
 * This endpoint allows updating a single field and recalculates progress
 * using our universal progress calculation function.
 */
router.post('/api/open-banking/:taskId/fields/:fieldKey', async (req, res) => {
  const { taskId, fieldKey } = req.params;
  const { value } = req.body;
  
  try {
    logger.info('[Open Banking API] Field update request received', {
      taskId,
      fieldKey,
      hasValue: value !== undefined,
      timestamp: new Date().toISOString()
    });
    
    // Validate task exists
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));
      
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task ${taskId} not found`
      });
    }
    
    // Validate this is an Open Banking task
    if (task.task_type !== 'open_banking') {
      return res.status(400).json({
        success: false,
        error: `Task ${taskId} is not an Open Banking task`
      });
    }
    
    // Get field definition
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
    // Status must use values from KYBFieldStatus
    const status = hasValue ? KYBFieldStatus.COMPLETE : KYBFieldStatus.INCOMPLETE;
    
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
        // Insert a new response with proper status type
        const newResponse = {
          task_id: parseInt(taskId),
          field_id: fieldDefinition.id,
          response_value: value,
          status
        };
        
        await tx
          .insert(openBankingResponses)
          .values([newResponse]);
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
        task.status as TaskStatus,
        task.metadata || {}
      );
      
      logger.info('[Open Banking API] Progress calculation completed', {
        taskId,
        previousProgress: task.progress,
        newProgress,
        previousStatus: task.status,
        newStatus,
        timestamp: new Date().toISOString(),
        hasChanges: (task.progress !== newProgress || task.status !== newStatus),
        wasUpdated: (task.progress !== newProgress || task.status !== newStatus) ? 'YES' : 'NO'
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
    logger.info('[Open Banking API] Broadcasting progress update via WebSocket', {
      taskId,
      progress: result.progress,
      status: result.status,
      timestamp: new Date().toISOString()
    });
    
    broadcastProgressUpdate(
      parseInt(taskId),
      result.progress as number,
      result.status as TaskStatus,
      result.metadata || {}
    );
    
    logger.info('[Open Banking API] WebSocket broadcast completed');
    
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

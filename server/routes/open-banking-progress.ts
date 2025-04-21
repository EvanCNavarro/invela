/**
 * Open Banking Progress API Routes
 * 
 * These routes handle progress calculation and form data retrieval
 * specifically for Open Banking survey forms, standardized to match
 * the approach used for KYB and KY3P forms.
 */

import { Router } from 'express';
import { db } from '@db';
import { 
  eq, 
  and, 
  inArray, 
  sql 
} from 'drizzle-orm';
import { 
  openBankingFields, 
  openBankingResponses, 
  tasks, 
  KYBFieldStatus,
  TaskStatus 
} from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { broadcastProgressUpdate } from '../utils/progress';
import { saveTaskTimestamps } from './open-banking-timestamp-handler';

// Create a logger instance
const logger = new Logger('OpenBankingProgressRoutes');

/**
 * Register progress-related routes for Open Banking
 * @param router Express router to add routes to
 */
export function registerOpenBankingProgressRoutes(router: Router): void {
  /**
   * Get progress data for a task in the format expected by UniversalForm
   */
  router.get('/api/open-banking/progress/:taskId', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        logger.warn(`[Open Banking API] Invalid task ID provided: ${req.params.taskId}`);
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      logger.info(`[Open Banking API] Fetching progress for task ${taskId}`);
      
      // Get the task
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Check access - user must be assigned to the task or part of the company
      if (task.assigned_to !== req.user.id && task.created_by !== req.user.id && task.company_id !== req.user.company_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get all fields for this form type
      const fields = await db
        .select()
        .from(openBankingFields);
        
      // Create a map of field keys to field objects for quick lookup
      const fieldKeyMap: Record<string, typeof openBankingFields.$inferSelect> = {};
      for (const field of fields) {
        fieldKeyMap[field.field_key] = field;
      }
      
      // Get all responses for this task
      const responses = await db
        .select({
          response_value: openBankingResponses.response_value,
          field_key: openBankingFields.field_key,
          status: openBankingResponses.status,
          field_id: openBankingFields.id
        })
        .from(openBankingResponses)
        .innerJoin(openBankingFields, eq(openBankingResponses.field_id, openBankingFields.id))
        .where(eq(openBankingResponses.task_id, taskId));
      
      // Transform responses into form data
      const formData: Record<string, any> = {};
      
      // First ensure all field keys are initialized to empty strings
      for (const field of fields) {
        formData[field.field_key] = '';
      }
      
      // Then populate with actual response values
      for (const response of responses) {
        if (response.response_value !== null) {
          formData[response.field_key] = response.response_value;
        }
      }
      
      // Calculate how many fields have values (as a sanity check against task.progress)
      const filledFieldCount = Object.values(formData).filter(value => 
        value !== null && value !== undefined && value !== ''
      ).length;
      
      // If progress in task doesn't match reality, log a warning
      const calculatedProgress = fields.length > 0 ? 
        Math.ceil((filledFieldCount / fields.length) * 100) / 100 : 0;
        
      if (Math.abs(calculatedProgress - task.progress) > 0.1) { // 10% difference threshold
        logger.warn(`[Open Banking API] Progress mismatch for task ${taskId}`, {
          storedProgress: task.progress,
          calculatedProgress,
          filledFieldCount,
          totalFields: fields.length
        });
      }
      
      logger.info(`[Open Banking API] Progress data loaded for task ${taskId}`, {
        responseCount: responses.length,
        progress: task.progress,
        status: task.status
      });
      
      // Return data in the format expected by UniversalForm
      res.json({
        formData,
        progress: task.progress,
        status: task.status
      });
    } catch (error) {
      logger.error('[Open Banking API] Error fetching progress', error);
      res.status(500).json({ 
        error: 'Failed to fetch progress',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * Clear all field responses for a task
   */
  router.post('/api/open-banking/clear/:taskId', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      logger.info(`[Open Banking API] Clearing all field responses for task ${taskId}`);
      
      // Verify the user has access to this task
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Check access - user must be assigned to the task or part of the company
      if (task.assigned_to !== req.user.id && task.created_by !== req.user.id && task.company_id !== req.user.company_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Use a transaction to ensure all operations succeed or fail together
      await db.transaction(async (tx) => {
        // First get all existing responses for reference
        const existingResponses = await tx
          .select()
          .from(openBankingResponses)
          .where(eq(openBankingResponses.task_id, taskId));
        
        // Delete all responses for this task
        await tx
          .delete(openBankingResponses)
          .where(eq(openBankingResponses.task_id, taskId));
        
        // Update the task status and progress
        await tx
          .update(tasks)
          .set({
            progress: 0,
            status: TaskStatus.NOT_STARTED,
            updated_at: new Date()
          })
          .where(eq(tasks.id, taskId));
        
        // Clear all timestamps for this task
        await tx.execute(sql`
          DELETE FROM open_banking_field_timestamps
          WHERE task_id = ${taskId}
        `);
        
        logger.info(`[Open Banking API] Cleared ${existingResponses.length} responses for task ${taskId}`);
      });
      
      // Broadcast progress update via WebSocket
      broadcastProgressUpdate(taskId, 0, TaskStatus.NOT_STARTED);
      
      res.json({
        success: true,
        message: 'All field responses cleared',
        taskId
      });
    } catch (error) {
      logger.error('[Open Banking API] Error clearing field responses', error);
      res.status(500).json({
        error: 'Failed to clear field responses',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Save progress for a task with timestamp tracking
   */
  router.post('/api/open-banking/progress', requireAuth, async (req, res) => {
    try {
      const { taskId, formData, fieldUpdates } = req.body;
      // Extract progress and status from request
      // Convert progress to a consistent whole number format (0-100)
      let progress = req.body.progress;
      if (progress !== undefined) {
        // If progress is a decimal < 1, convert to percentage (0.12 -> 12)
        if (progress < 1 && progress > 0) {
          progress = Math.ceil(progress * 100);
        }
      }
      const status = req.body.status;
      
      if (!taskId || !formData) {
        return res.status(400).json({ error: 'Task ID and form data required' });
      }
      
      logger.info(`[Open Banking API] Saving progress for task ${taskId}`, {
        formDataKeys: Object.keys(formData).length,
        fieldUpdatesCount: fieldUpdates ? fieldUpdates.length : 0,
        progress,
        status
      });
      
      // Get the task to verify access
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, parseInt(taskId)))
        .limit(1);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Get fields to map field keys to IDs
      const fields = await db
        .select({
          id: openBankingFields.id,
          field_key: openBankingFields.field_key
        })
        .from(openBankingFields);
      
      // Create a map of field keys to field IDs
      const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
      
      // Track which fields were updated for timestamp tracking
      const updatedFieldKeys: string[] = [];
      
      // Update responses in a transaction
      await db.transaction(async (tx) => {
        // Process each field in formData
        for (const [fieldKey, value] of Object.entries(formData)) {
          if (!fieldKeyToIdMap.has(fieldKey)) {
            logger.warn(`[Open Banking API] Field not found for key: ${fieldKey}`);
            continue;
          }
          
          const fieldId = fieldKeyToIdMap.get(fieldKey)!;
          const processedValue = value?.toString().trim() || '';
          const status = processedValue ? KYBFieldStatus.COMPLETE : KYBFieldStatus.EMPTY;
          
          // Check if a response already exists
          const existingResponse = await tx
            .select()
            .from(openBankingResponses)
            .where(
              and(
                eq(openBankingResponses.task_id, parseInt(taskId)),
                eq(openBankingResponses.field_id, fieldId)
              )
            )
            .limit(1);
          
          if (existingResponse.length > 0) {
            // Update existing response
            await tx
              .update(openBankingResponses)
              .set({
                response_value: processedValue,
                status,
                version: existingResponse[0].version + 1,
                updated_at: new Date()
              })
              .where(eq(openBankingResponses.id, existingResponse[0].id));
          } else {
            // Create new response
            await tx
              .insert(openBankingResponses)
              .values({
                task_id: parseInt(taskId),
                field_id: fieldId,
                response_value: processedValue,
                status,
                version: 1,
                created_at: new Date(),
                updated_at: new Date()
              });
          }
          
          // Track this field for timestamp update
          updatedFieldKeys.push(fieldKey);
        }
      });
      
      // Always recalculate progress based on all responses to ensure accuracy
      // Get count of all fields (not just required ones to be more permissive)
      const allFieldsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(openBankingFields);
      
      const totalFields = allFieldsCount[0].count;
      
      // Get count of all responses with non-empty values
      const filledResponsesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(openBankingResponses)
        .innerJoin(openBankingFields, eq(openBankingResponses.field_id, openBankingFields.id))
        .where(
          and(
            eq(openBankingResponses.task_id, parseInt(taskId)),
            eq(openBankingResponses.status, KYBFieldStatus.COMPLETE)
          )
        );
      
      const completedFieldsCount = filledResponsesCount[0].count;
      
      logger.info('[Open Banking API] Progress calculation:', {
        totalFields, 
        completedFieldsCount,
        ratio: totalFields > 0 ? completedFieldsCount / totalFields : 0
      });
      
      // Calculate progress as a percentage (0-100) rounded UP to match the KYB/KY3P behavior
      if (totalFields > 0 && completedFieldsCount > 0) {
        // Force a minimum progress of 1% if any fields are completed
        // Store as whole number percentage (5 instead of 0.05) to match KYB/KY3P
        progress = Math.max(1, Math.ceil((completedFieldsCount / totalFields) * 100));
      } else {
        // If no fields at all have been filled, show 0 progress
        progress = 0;
      }
      
      // Determine task status from progress if not explicitly provided
      let newStatus = status;
      if (!newStatus) {
        // Always advance from not_started if there's any progress at all
        if (progress > 0) {
          // If progress is complete (100%), mark as ready for submission
          newStatus = progress >= 100 ? TaskStatus.READY_FOR_SUBMISSION : TaskStatus.IN_PROGRESS;
        } else {
          // Only use not_started if there's truly no progress
          newStatus = TaskStatus.NOT_STARTED;
        }
      }
      
      // Regardless of what status was provided, enforce the progress-status relationship for consistency
      // This ensures the status is always appropriate for the current progress
      if (progress > 0 && newStatus === TaskStatus.NOT_STARTED) {
        newStatus = progress >= 100 ? TaskStatus.READY_FOR_SUBMISSION : TaskStatus.IN_PROGRESS;
        logger.info('[Open Banking API] Upgrading task status due to progress:', {
          from: TaskStatus.NOT_STARTED, 
          to: newStatus,
          progress
        });
      } else if (progress >= 100 && newStatus === TaskStatus.IN_PROGRESS) {
        newStatus = TaskStatus.READY_FOR_SUBMISSION;
        logger.info('[Open Banking API] Upgrading task status to READY_FOR_SUBMISSION due to 100% progress');
      } else if (progress === 0 && (newStatus === TaskStatus.IN_PROGRESS || newStatus === TaskStatus.READY_FOR_SUBMISSION)) {
        // If progress is reset to zero, also reset status (unless already submitted)
        if (newStatus !== TaskStatus.SUBMITTED && newStatus !== TaskStatus.APPROVED) {
          newStatus = TaskStatus.NOT_STARTED;
          logger.info('[Open Banking API] Downgrading task status to NOT_STARTED due to 0% progress');
        }
      }
      
      // Log status determination logic for debugging
      logger.info('[Open Banking API] Status determination:', {
        providedStatus: status,
        calculatedStatus: newStatus,
        progress
      });
      
      // Update task progress and status
      await db
        .update(tasks)
        .set({
          progress,
          status: newStatus as TaskStatus,
          updated_at: new Date()
        })
        .where(eq(tasks.id, parseInt(taskId)));
      
      // Save timestamps for updated fields
      if (updatedFieldKeys.length > 0) {
        try {
          await saveTaskTimestamps(parseInt(taskId), updatedFieldKeys);
        } catch (timestampError) {
          logger.warn('[Open Banking API] Error saving field timestamps:', timestampError);
          // Continue since timestamps are helpful but not required
        }
      }
      
      // Broadcast progress update via WebSocket
      broadcastProgressUpdate(parseInt(taskId), progress, newStatus as TaskStatus);
      
      logger.info(`[Open Banking API] Progress saved for task ${taskId}`, {
        progress,
        status: newStatus,
        fieldsUpdated: updatedFieldKeys.length
      });
      
      // Return the updated form data to the client
      res.json({
        success: true,
        savedData: {
          progress,
          status: newStatus,
          formData
        }
      });
    } catch (error) {
      logger.error('[Open Banking API] Error saving progress', error);
      res.status(500).json({
        error: 'Failed to save progress',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
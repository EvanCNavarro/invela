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
      
      // Get all responses for this task
      const responses = await db
        .select({
          response_value: openBankingResponses.response_value,
          field_key: openBankingFields.field_key,
          status: openBankingResponses.status
        })
        .from(openBankingResponses)
        .innerJoin(openBankingFields, eq(openBankingResponses.field_id, openBankingFields.id))
        .where(eq(openBankingResponses.task_id, taskId));
      
      // Transform responses into form data
      const formData: Record<string, any> = {};
      for (const response of responses) {
        if (response.response_value !== null) {
          formData[response.field_key] = response.response_value;
        }
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
   * Save progress for a task with timestamp tracking
   */
  router.post('/api/open-banking/progress', requireAuth, async (req, res) => {
    try {
      const { taskId, formData, fieldUpdates } = req.body;
      // Extract progress and status from request
      let progress = req.body.progress;
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
      
      // Recalculate progress based on all responses if not explicitly provided
      if (progress === undefined) {
        // Get count of all required fields
        const requiredFieldsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(openBankingFields)
          .where(eq(openBankingFields.required, true));
        
        const totalFields = requiredFieldsCount[0].count;
        
        // Get count of completed responses
        const completedResponsesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(openBankingResponses)
          .innerJoin(openBankingFields, eq(openBankingResponses.field_id, openBankingFields.id))
          .where(
            and(
              eq(openBankingResponses.task_id, parseInt(taskId)),
              eq(openBankingResponses.status, KYBFieldStatus.COMPLETE),
              eq(openBankingFields.required, true)
            )
          );
        
        const completedFields = completedResponsesCount[0].count;
        
        // Calculate progress as a percentage rounded UP to a whole number
        if (totalFields > 0) {
          const percentComplete = Math.ceil((completedFields / totalFields) * 100);
          progress = percentComplete / 100;
        } else {
          progress = 0;
        }
      }
      
      // Determine task status from progress if not explicitly provided
      let newStatus = status;
      if (!newStatus) {
        newStatus = TaskStatus.NOT_STARTED;
        if (progress > 0) {
          newStatus = progress >= 1 ? TaskStatus.READY_FOR_SUBMISSION : TaskStatus.IN_PROGRESS;
        }
      }
      
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
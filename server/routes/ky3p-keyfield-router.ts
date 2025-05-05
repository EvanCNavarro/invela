/**
 * KY3P Field Key Router
 * 
 * This router handles KY3P forms using field_key instead of field_id, making it
 * work exactly like KYB forms. This ensures consistent progress calculation and persistence.
 */

import { Router, Express } from 'express';
import { db } from '@db';
import { tasks, ky3pFields, ky3pResponses } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { determineStatusFromProgress, broadcastProgressUpdate } from '../utils/progress';
import { TaskStatus } from '../types';
import { FieldStatus } from '../utils/field-status';

// Create the router
export const ky3pKeyFieldRouter = Router();

/**
 * Register the KY3P field key router with the app
 */
export function registerKY3PFieldKeyRouter(app: Express) {
  app.use(ky3pKeyFieldRouter);
  console.log('[Routes] Registered KY3P field key router');
}

/**
 * Save progress for a KY3P form using field_key references
 * 
 * This endpoint works exactly like the KYB progress endpoint, using field_key instead of field_id.
 */
ky3pKeyFieldRouter.post('/api/ky3p/keyfield-progress', async (req, res) => {
  try {
    const { taskId, formData } = req.body;
    let calculatedProgress = req.body.progress;

    // Detailed logging to debug form saving
    logger.info('[KY3P KeyField] Progress save request received', {
      taskId,
      progress: calculatedProgress,
      fieldCount: formData ? Object.keys(formData).length : 0,
      timestamp: new Date().toISOString()
    });

    if (!taskId) {
      logger.warn('[KY3P KeyField] Missing task ID in request');
      return res.status(400).json({
        error: 'Task ID is required',
        code: 'MISSING_TASK_ID'
      });
    }

    // First, get the task to verify it exists and is a KY3P task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      logger.warn(`[KY3P KeyField] Task ${taskId} not found`);
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Verify this is a KY3P task
    const isKy3pTask = task.task_type.toLowerCase() === 'ky3p' || 
                      task.task_type.toLowerCase().includes('ky3p') || 
                      task.task_type.toLowerCase().includes('security');

    if (!isKy3pTask) {
      logger.warn(`[KY3P KeyField] Task ${taskId} is not a KY3P task: ${task.task_type}`);
      return res.status(400).json({
        error: 'Task is not a KY3P task',
        code: 'INVALID_TASK_TYPE'
      });
    }

    // Get all existing KY3P responses for this task
    const existingResponses = await db.select({
      responseId: ky3pResponses.id,
      fieldId: ky3pResponses.field_id,
      fieldKey: ky3pFields.field_key
    })
    .from(ky3pResponses)
    .innerJoin(ky3pFields, eq(ky3pResponses.field_id, ky3pFields.id))
    .where(eq(ky3pResponses.task_id, taskId));

    // Create a map of field_key to field_id for lookup
    const fieldKeyToIdMap = new Map<string, number>();

    // Get all field definitions to map between field_key and field_id
    const allFields = await db.select({
      id: ky3pFields.id,
      fieldKey: ky3pFields.field_key
    })
    .from(ky3pFields);

    // Build the lookup map
    for (const field of allFields) {
      fieldKeyToIdMap.set(field.fieldKey, field.id);
    }

    // Create a map of existing response IDs by field key
    const existingResponseIdsByFieldKey = new Map<string, number>();
    for (const response of existingResponses) {
      existingResponseIdsByFieldKey.set(response.fieldKey, response.responseId);
    }

    // Begin transaction to update/create responses
    await db.transaction(async (tx) => {
      // Track which fields were updated
      const updatedFieldKeys = new Set<string>();

      // Process each field in the form data
      for (const [fieldKey, value] of Object.entries(formData)) {
        // Skip empty fields
        if (value === null || value === undefined || value === '') {
          continue;
        }

        // Mark this field as updated
        updatedFieldKeys.add(fieldKey);

        // Get the field_id for this field_key
        const fieldId = fieldKeyToIdMap.get(fieldKey);
        if (!fieldId) {
          logger.warn(`[KY3P KeyField] Field key '${fieldKey}' not found in definition`);
          continue;
        }

        // Convert value to string if it's not already
        const stringValue = typeof value === 'string' ? value : String(value);

        // Check if we already have a response for this field
        const existingResponseId = existingResponseIdsByFieldKey.get(fieldKey);

        if (existingResponseId) {
          // Update existing response
          await tx.update(ky3pResponses)
            .set({
              response_value: stringValue,
              status: FieldStatus.COMPLETE, // Use FieldStatus enum for consistent status handling
              updated_at: new Date()
            })
            .where(eq(ky3pResponses.id, existingResponseId));
        } else {
          // Create new response
          await tx.insert(ky3pResponses)
            .values({
              task_id: taskId,
              field_id: fieldId,
              response_value: stringValue,
              status: FieldStatus.COMPLETE, // Use FieldStatus enum for consistent status handling
              created_at: new Date(),
              updated_at: new Date()
            });
        }
      }

      // Now update the task with the calculated progress
      // Special handling for 100% - only mark as ready_for_submission if all fields are complete
      let newStatus = task.status;
      if (calculatedProgress === 100) {
        newStatus = task.metadata?.submissionDate ? 
          TaskStatus.SUBMITTED : 
          TaskStatus.READY_FOR_SUBMISSION;
      } else if (calculatedProgress > 0 && calculatedProgress < 100) {
        newStatus = TaskStatus.IN_PROGRESS;
      } else if (calculatedProgress === 0) {
        newStatus = TaskStatus.NOT_STARTED;
      }

      // Update the task progress and status
      await tx.update(tasks)
        .set({
          progress: sql`${calculatedProgress}::int`,  // Use explicit SQL casting
          status: newStatus,
          updated_at: new Date(),
          metadata: sql`jsonb_set(
            COALESCE(${tasks.metadata}, '{}'::jsonb),
            '{lastProgressUpdate}',
            to_jsonb(now()::text)
          )`
        })
        .where(eq(tasks.id, taskId));
    });

    // After transaction completes successfully, get the updated task
    const [updatedTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    // Broadcast progress update
    if (updatedTask) {
      broadcastProgressUpdate(
        taskId,
        Number(updatedTask.progress), 
        updatedTask.status as TaskStatus,
        updatedTask.metadata || {}
      );
    }

    // Return success response
    res.json({
      success: true,
      updatedTask: {
        id: updatedTask?.id,
        progress: updatedTask?.progress,
        status: updatedTask?.status
      }
    });
  } catch (error) {
    logger.error('[KY3P KeyField] Error processing progress update:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Failed to save progress',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get progress for a KY3P form using field_key references
 * 
 * This endpoint works exactly like the KYB progress endpoint, using field_key instead of field_id.
 */
ky3pKeyFieldRouter.get('/api/ky3p/keyfield-progress/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    logger.info(`[KY3P KeyField] Loading progress for task: ${taskId}`);

    // Get task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));

    if (!task) {
      logger.warn(`[KY3P KeyField] Task ${taskId} not found`);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all KY3P responses for this task with their field information
    const responses = await db.select({
      response_value: ky3pResponses.response_value,
      field_key: ky3pFields.field_key,
      status: ky3pResponses.status
    })
    .from(ky3pResponses)
    .innerJoin(ky3pFields, eq(ky3pResponses.field_id, ky3pFields.id))
    .where(eq(ky3pResponses.task_id, parseInt(taskId)));

    // Transform responses into form data
    const formData: Record<string, any> = {};
    for (const response of responses) {
      if (response.response_value !== null) {
        formData[response.field_key] = response.response_value;
      }
    }

    // Return the progress data
    res.json({
      taskId: task.id,
      progress: task.progress,
      status: task.status,
      formData
    });
  } catch (error) {
    logger.error('[KY3P KeyField] Error fetching task progress:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to fetch KY3P task progress' });
  }
});

export default ky3pKeyFieldRouter;

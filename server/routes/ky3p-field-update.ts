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
import { determineStatusFromProgress } from '../utils/progress';
import { broadcastProgressUpdate } from '../utils/task-broadcast';

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
   * POST /api/ky3p-fields/:taskId/update
   */
  router.post('/api/ky3p-fields/:taskId/update', async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { fieldKey, value } = req.body;

      if (!fieldKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required parameter: fieldKey' 
        });
      }

      logger.info(`Processing field update for task ${taskId}, field ${fieldKey}`);

      // Find the field ID using the string field key
      const fieldResults = await db.select()
        .from(ky3pFields)
        .where(eq(ky3pFields.field_key, fieldKey))
        .limit(1);
      
      // If field not found by key, try using the field name or question for backward compatibility
      if (fieldResults.length === 0) {
        const altFieldResults = await db.select()
          .from(ky3pFields)
          .where(eq(ky3pFields.display_name, fieldKey))
          .limit(1);
        
        if (altFieldResults.length === 0) {
          return res.status(404).json({
            success: false,
            message: `Field not found with key: ${fieldKey}`
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
        await db.update(ky3pResponses)
          .set({ 
            response_value: value, 
            updated_at: now,
            status: 'COMPLETE' // Always set status to COMPLETE when updating a field
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
            status: 'COMPLETE', // Always set status to COMPLETE when inserting a field
            created_at: now,
            updated_at: now
          });
      }

      // Update task progress and status
      // Count total fields
      const [fieldCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ky3pFields);
      
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
      
      // Calculate progress percentage based on COMPLETE fields
      const totalFields = fieldCount?.count || 1;
      const completedFields = completedCount?.count || 0;
      const progressPercentage = Math.min(100, Math.floor((completedFields / totalFields) * 100));
      
      logger.info(`Progress calculation for task ${taskId}: ${completedFields}/${totalFields} = ${progressPercentage}%`);
      
      // Get current task information to update status correctly
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // Determine the appropriate status based on progress
      // Always preserve SUBMITTED status if the task was previously submitted
      const newStatus = determineStatusFromProgress(
        progressPercentage, 
        task.status, 
        false // isSubmitted set to false since this is just a field update, not a submission
      );
      
      logger.info(`Updating task ${taskId} status from '${task.status}' to '${newStatus}', progress from ${task.progress}% to ${progressPercentage}%`);
      
      // Update task in database
      const [updatedTask] = await db.update(tasks)
        .set({
          progress: progressPercentage,
          status: newStatus,
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            lastProgressReconciliation: new Date().toISOString()
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();
      
      // Broadcast the update to all connected clients
      broadcastProgressUpdate(
        taskId,
        progressPercentage,
        newStatus,
        updatedTask.metadata || {}
      );

      return res.status(200).json({ 
        success: true, 
        message: `Successfully updated field: ${fieldKey}`,
        progress: progressPercentage,
        status: newStatus
      });
    } catch (error) {
      logger.error('Error processing field update:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  return router;
}
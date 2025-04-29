/**
 * KY3P Field Update API Routes
 * 
 * This file implements the API routes for updating KY3P form fields
 * using standardized string-based field keys.
 */

import express, { Router } from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import * as logger from '../utils/logger';

const log = logger.createLogger('KY3P-Field-Update');

/**
 * Register the KY3P field update routes
 */
export function registerKY3PFieldUpdateRoutes() {
  log.info('Registering KY3P field update routes');
  
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

      log.info(`Processing field update for task ${taskId}, field ${fieldKey}`);

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
            updated_at: now
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
            created_at: now,
            updated_at: now
          });
      }

      return res.status(200).json({ 
        success: true, 
        message: `Successfully updated field: ${fieldKey}` 
      });
    } catch (error) {
      log.error('Error processing field update:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  return router;
}
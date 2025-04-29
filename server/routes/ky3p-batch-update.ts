/**
 * KY3P Batch Update API Routes
 * 
 * This file implements the API routes for batch updating KY3P form responses
 * using the standardized approach with string-based field keys.
 */

import express from 'express';
import { db, pool } from '../../db';
import { ky3pFields, ky3pResponses } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

// Logger setup
const PREFIX = '[KY3P-BATCH-UPDATE]';
const log = {
  info: (message: string, ...args: any[]) => console.log(`${PREFIX} ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`${PREFIX} ERROR: ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.log(`${PREFIX} DEBUG: ${message}`, ...args),
};

/**
 * Register the KY3P batch update routes
 */
export function registerKY3PBatchUpdateRoutes(app: express.Express) {
  log.info('Registering KY3P batch update routes');

  /**
   * Standardized batch update endpoint for KY3P forms
   * Accepts string-based field keys and handles the proper database operations
   * 
   * POST /api/ky3p/batch-update/:taskId
   */
  app.post('/api/ky3p/batch-update/:taskId', async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { responses } = req.body;

      if (!responses || typeof responses !== 'object') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid request format. Expected { responses: { field_key: value, ... } }' 
        });
      }

      log.info(`Processing batch update for task ${taskId} with ${Object.keys(responses).length} fields`);

      // Begin a transaction for all database operations
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Get all updates processed count
        let processedCount = 0;
        
        // Process each field in the responses object
        for (const [fieldKey, value] of Object.entries(responses)) {
          // First, find the field ID using the field_key
          const fieldResults = await db.select()
            .from(ky3p_template_fields)
            .where(eq(ky3p_template_fields.field_key, fieldKey))
            .limit(1);

          if (fieldResults.length === 0) {
            log.error(`Field not found for key: ${fieldKey}`);
            continue;
          }

          const fieldId = fieldResults[0].id;
          
          // Check if a response already exists for this task and field
          const existingResponses = await db.select()
            .from(ky3p_responses)
            .where(
              and(
                eq(ky3p_responses.task_id, taskId),
                eq(ky3p_responses.field_id, fieldId)
              )
            );

          if (existingResponses.length > 0) {
            // Update existing response
            await db.update(ky3p_responses)
              .set({ 
                response_value: value, 
                updated_at: new Date() 
              })
              .where(
                and(
                  eq(ky3p_responses.task_id, taskId),
                  eq(ky3p_responses.field_id, fieldId)
                )
              );
          } else {
            // Insert new response
            await db.insert(ky3p_responses)
              .values({
                task_id: taskId,
                field_id: fieldId,
                response_value: value,
                created_at: new Date(),
                updated_at: new Date()
              });
          }

          processedCount++;
        }

        // Commit the transaction
        await client.query('COMMIT');
        
        log.info(`Successfully processed ${processedCount} fields for task ${taskId}`);
        
        return res.status(200).json({ 
          success: true, 
          message: `Successfully updated ${processedCount} fields` 
        });
      } catch (error) {
        // Rollback the transaction on error
        await client.query('ROLLBACK');
        throw error;
      } finally {
        // Release the client back to the pool
        client.release();
      }
    } catch (error) {
      log.error('Error processing batch update:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  /**
   * Alternative endpoint path for the same functionality
   * POST /api/tasks/:taskId/ky3p-batch-update  
   */
  app.post('/api/tasks/:taskId/ky3p-batch-update', async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { responses } = req.body;

      if (!responses || typeof responses !== 'object') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid request format. Expected { responses: { field_key: value, ... } }' 
        });
      }

      log.info(`Processing batch update for task ${taskId} with ${Object.keys(responses).length} fields (alt path)`);

      // Begin a transaction for all database operations
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Get all updates processed count
        let processedCount = 0;
        
        // Process each field in the responses object
        for (const [fieldKey, value] of Object.entries(responses)) {
          // First, find the field ID using the field_key
          const fieldResults = await db.select()
            .from(ky3p_template_fields)
            .where(eq(ky3p_template_fields.field_key, fieldKey))
            .limit(1);

          if (fieldResults.length === 0) {
            log.error(`Field not found for key: ${fieldKey}`);
            continue;
          }

          const fieldId = fieldResults[0].id;
          
          // Check if a response already exists for this task and field
          const existingResponses = await db.select()
            .from(ky3p_responses)
            .where(
              and(
                eq(ky3p_responses.task_id, taskId),
                eq(ky3p_responses.field_id, fieldId)
              )
            );

          if (existingResponses.length > 0) {
            // Update existing response
            await db.update(ky3p_responses)
              .set({ 
                response_value: value, 
                updated_at: new Date() 
              })
              .where(
                and(
                  eq(ky3p_responses.task_id, taskId),
                  eq(ky3p_responses.field_id, fieldId)
                )
              );
          } else {
            // Insert new response
            await db.insert(ky3p_responses)
              .values({
                task_id: taskId,
                field_id: fieldId,
                response_value: value,
                created_at: new Date(),
                updated_at: new Date()
              });
          }

          processedCount++;
        }

        // Commit the transaction
        await client.query('COMMIT');
        
        log.info(`Successfully processed ${processedCount} fields for task ${taskId}`);
        
        return res.status(200).json({ 
          success: true, 
          message: `Successfully updated ${processedCount} fields` 
        });
      } catch (error) {
        // Rollback the transaction on error
        await client.query('ROLLBACK');
        throw error;
      } finally {
        // Release the client back to the pool
        client.release();
      }
    } catch (error) {
      log.error('Error processing batch update:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
}
/**
 * KY3P Batch Update Routes
 * 
 * This module implements a standardized approach to updating KY3P form fields
 * in batches, using string-based field keys for consistency with KYB and Open Banking.
 */

import { Router, Request, Response } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { requireAuth } from '../middleware/auth';

const logger = console;

/**
 * Register KY3P batch update routes
 * 
 * This function sets up the standardized routes for KY3P form batch updates
 * 
 * @returns Router with batch update routes
 */
export function registerKY3PBatchUpdateRoutes(): Router {
  logger.info('Registering KY3P batch update routes');
  
  const router = Router();
  
  /**
   * Batch update endpoint for KY3P form fields
   * 
   * This endpoint accepts a responses object with field keys mapping to field values
   * and updates all the specified fields in a single database transaction.
   */
  router.post('/api/ky3p/batch-update/:taskId', requireAuth, async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.taskId);
    const responses = req.body.responses || {};
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info(`Processing batch update for KY3P task ${taskId}`, { fieldCount: Object.keys(responses).length });
    
    try {
      // Get field definitions to verify keys and types
      const fields = await db.select({
        id: ky3pFields.id,
        field_key: ky3pFields.field_key,
        field_type: ky3pFields.field_type
      })
      .from(ky3pFields)
      .where(
        eq(ky3pFields.enabled, true)
      );
      
      // Create lookup map of field_key to field ID
      const fieldKeyToId = fields.reduce((acc, field) => {
        acc[field.field_key] = field.id;
        return acc;
      }, {} as Record<string, number>);
      
      // Prepare batch responses for insertion/update
      const batchResponses = [];
      const validKeys = [];
      const invalidKeys = [];
      
      // Process each key-value pair in responses
      for (const [key, value] of Object.entries(responses)) {
        // Skip special keys like _taskId, _sectionId, etc.
        if (key.startsWith('_')) continue;
        
        const fieldId = fieldKeyToId[key];
        
        if (fieldId) {
          // Valid field key, add to batch
          batchResponses.push({
            task_id: taskId,
            field_id: fieldId,
            response: value === null ? null : String(value),
            updated_at: new Date()
          });
          validKeys.push(key);
        } else {
          // Invalid field key, log for debugging
          invalidKeys.push(key);
        }
      }
      
      // Log stats for debugging
      logger.info(`KY3P batch update stats:`, {
        totalFields: Object.keys(responses).length,
        validFields: validKeys.length,
        invalidFields: invalidKeys.length,
      });
      
      if (validKeys.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // For each response, insert or update in the database
      // First delete existing responses for these fields and task
      // Use a transaction for atomicity
      await db.transaction(async (tx) => {
        // Delete existing responses for these fields and task
        if (batchResponses.length > 0) {
          const fieldIds = batchResponses.map(r => r.field_id);
          
          await tx.delete(ky3pResponses)
            .where(
              and(
                eq(ky3pResponses.task_id, taskId),
                sql`${ky3pResponses.field_id} IN (${fieldIds.join(',')})`
              )
            );
          
          // Insert new responses
          for (const response of batchResponses) {
            await tx.insert(ky3pResponses)
              .values(response);
          }
        }
      });
      
      logger.info(`Successfully updated ${validKeys.length} fields for KY3P task ${taskId}`);
      return res.json({ success: true, updated: validKeys.length });
      
    } catch (error) {
      logger.error(`Error processing KY3P batch update:`, error);
      
      if (error instanceof Error) {
        return res.status(500).json({ error: `Database error: ${error.message}` });
      }
      
      return res.status(500).json({ error: 'Unknown error processing batch update' });
    }
  });
  
  /**
   * Clear all fields for a KY3P task
   * 
   * This endpoint allows clearing all responses for a specific task.
   */
  router.post('/api/ky3p/clear-fields/:taskId', requireAuth, async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info(`Clearing all fields for KY3P task ${taskId}`);
    
    try {
      // Delete all responses for this task
      await db.delete(ky3pResponses)
        .where(
          eq(ky3pResponses.task_id, taskId)
        );
      
      logger.info(`Successfully cleared all fields for KY3P task ${taskId}`);
      return res.json({ success: true });
      
    } catch (error) {
      logger.error(`Error clearing KY3P fields:`, error);
      
      if (error instanceof Error) {
        return res.status(500).json({ error: `Database error: ${error.message}` });
      }
      
      return res.status(500).json({ error: 'Unknown error clearing fields' });
    }
  });
  
  return router;
}
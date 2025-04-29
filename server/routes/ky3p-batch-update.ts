/**
 * KY3P Batch Update Routes
 * 
 * This module provides a standardized batch update endpoint for KY3P forms
 * that accepts string field keys instead of numeric field IDs.
 */

import { Request, Response, Router } from 'express';
import { db } from '../db';
import { ky3p_fields, ky3p_responses } from '../models';
import { eq } from 'drizzle-orm';
import getLogger from '../utils/logger';

const logger = getLogger('KY3P-BATCH-UPDATE');

const router = Router();

/**
 * Register batch update routes for KY3P forms
 */
export function registerKY3PBatchUpdateRoutes() {
  logger.info('Registering KY3P batch update routes');
  
  // Endpoint for batch updating KY3P responses using string field keys
  router.post('/api/ky3p/batch-update/:taskId', async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const { responses } = req.body;
      
      if (!responses || typeof responses !== 'object') {
        return res.status(400).json({
          error: 'Invalid request format. Expected { responses: { [fieldKey]: value, ... } }'
        });
      }
      
      // Log the request for debugging
      logger.info(`Batch update request for task ${taskId} with ${Object.keys(responses).length} fields`);
      
      // First, we need to get the field ID mapping
      const fields = await db.select({
        id: ky3p_fields.id,
        field_key: ky3p_fields.field_key
      }).from(ky3p_fields);
      
      // Create a mapping from field keys to field IDs
      const fieldKeyToIdMap = new Map(
        fields.map(field => [field.field_key, field.id])
      );
      
      // Track statistics for validation
      let foundFieldCount = 0;
      let notFoundFieldCount = 0;
      const notFoundFields = [];
      
      // Process each response
      const processedResponses = [];
      
      for (const [fieldKey, value] of Object.entries(responses)) {
        const fieldId = fieldKeyToIdMap.get(fieldKey);
        
        if (fieldId) {
          // We found a matching field ID, so we can add this response
          processedResponses.push({
            task_id: taskId,
            field_id: fieldId,
            value: typeof value === 'string' ? value : JSON.stringify(value)
          });
          
          foundFieldCount++;
        } else {
          // Log the missing field for debugging purposes
          logger.warn(`Field key not found in mapping: ${fieldKey}`);
          notFoundFields.push(fieldKey);
          notFoundFieldCount++;
        }
      }
      
      if (processedResponses.length === 0) {
        return res.status(400).json({
          error: 'No valid field keys found in the request',
          notFoundFields
        });
      }
      
      // Delete existing responses for these fields to ensure a clean update
      if (processedResponses.length > 0) {
        const fieldIds = processedResponses.map(pr => pr.field_id);
        
        await db.delete(ky3p_responses)
          .where(
            ky3p_responses.task_id.equals(taskId).and(
              ky3p_responses.field_id.in(fieldIds)
            )
          );
          
        logger.info(`Deleted existing responses for task ${taskId} with fields: ${fieldIds.join(', ')}`);
      }
      
      // Insert the new responses
      if (processedResponses.length > 0) {
        const result = await db.insert(ky3p_responses).values(processedResponses);
        
        logger.info(`Inserted ${processedResponses.length} responses for task ${taskId}`);
      }
      
      // Return success with stats
      return res.status(200).json({
        success: true,
        message: `Updated ${processedResponses.length} fields successfully`,
        stats: {
          requested: Object.keys(responses).length,
          updated: processedResponses.length,
          notFound: notFoundFieldCount
        }
      });
    } catch (error) {
      logger.error('Error in KY3P batch update:', error);
      return res.status(500).json({
        error: 'Internal server error during batch update',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Endpoint for clearing all KY3P responses for a task
  router.post('/api/ky3p/clear-fields/:taskId', async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      
      // Log the request for debugging
      logger.info(`Clear fields request for task ${taskId}`);
      
      // Delete all responses for this task
      const result = await db.delete(ky3p_responses)
        .where(eq(ky3p_responses.task_id, taskId));
        
      logger.info(`Cleared ${result.rowCount || 'all'} responses for task ${taskId}`);
      
      return res.status(200).json({
        success: true,
        message: `Cleared all fields for task ${taskId}`,
        count: result.rowCount
      });
    } catch (error) {
      logger.error('Error in KY3P clear fields:', error);
      return res.status(500).json({
        error: 'Internal server error during clear fields',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}
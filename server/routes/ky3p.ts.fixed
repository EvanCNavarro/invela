/**
 * KY3P Batch Update API Routes - Fixed Version
 * 
 * This file implements the API routes for batch updating KY3P form responses
 * with enhanced support for both field keys and field IDs.
 */

import { Router } from 'express';
import { db } from '@db';
import { 
  ky3pFields, 
  ky3pResponses, 
  tasks, 
  KYBFieldStatus,
  TaskStatus
} from '@db/schema';
import { eq, asc, and, desc, ne, count } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('KY3P-BATCH-UPDATE');

// Add middleware for task access control
async function hasTaskAccess(req: any, res: any, next: any) {
  try {
    // Allow access for now - task-specific auth will be handled separately
    next();
  } catch (error) {
    logger.error('Error checking task access:', error);
    res.status(403).json({ message: 'Access denied' });
  }
}

// Setup log in server startup
logger.info('Registering KY3P batch update routes');

/**
 * Batch update endpoint for KY3P responses
 * This follows the same pattern as the KYB batch-update endpoint
 * but with enhanced support for both field keys and field IDs
 */
router.post('/api/ky3p/batch-update/:taskId', requireAuth, hasTaskAccess, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    logger.info(`[KY3P API] Received batch update request for task ${taskId}`);
    
    // Handle the "bulk" fieldIdRaw special case at the top level
    // This addresses the issue with demo auto-fill
    if (req.body.fieldIdRaw === 'bulk' && (req.body.responseValue === 'undefined' || req.body.responseValue === undefined)) {
      logger.info(`[KY3P API] Detected special case with fieldIdRaw="bulk" and responseValue="undefined" for task ${taskId}`);
      return res.redirect(307, `/api/ky3p/demo-autofill/${taskId}`);
    }
    
    // Extract responses from request body
    const responses = req.body.responses || req.body;
    
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ message: 'Invalid request format' });
    }
    
    // Process based on response format - array format has field keys or IDs
    const isArrayFormat = Array.isArray(responses);
    const useFieldKeys = req.body.useFieldKeys === true;
    const useFieldIds = req.body.useFieldIds === true;
    
    logger.info(`[KY3P API] Processing batch update: format=${isArrayFormat ? 'array' : 'object'}, useFieldKeys=${useFieldKeys}, useFieldIds=${useFieldIds}`);
    
    // Process each field response one by one - using batch processing
    const fieldUpdates: string[] = [];
    let processedCount = 0;
    
    // For array format, process responses directly
    if (isArrayFormat) {
      for (const response of responses) {
        try {
          let field = null;
          
          // Different handling based on whether fieldKey, fieldId or both are provided
          if (response.fieldKey) {
            // Find field by key
            [field] = await db
              .select()
              .from(ky3pFields)
              .where(eq(ky3pFields.field_key, response.fieldKey))
              .limit(1);
              
            if (!field) {
              logger.warn(`[KY3P API] Field not found by key in batch update: ${response.fieldKey}`);
              continue;
            }
          } else if (response.fieldId) {
            // Find field by ID
            [field] = await db
              .select()
              .from(ky3pFields)
              .where(eq(ky3pFields.id, response.fieldId))
              .limit(1);
              
            if (!field) {
              logger.warn(`[KY3P API] Field not found by ID in batch update: ${response.fieldId}`);
              continue;
            }
          } else {
            logger.warn(`[KY3P API] Invalid response format in batch update array: missing fieldKey or fieldId`);
            continue;
          }
          
          // Process field response directly here
          // Check if a response already exists
          const [existingResponse] = await db
            .select()
            .from(ky3pResponses)
            .where(
              and(
                eq(ky3pResponses.task_id, taskId),
                eq(ky3pResponses.field_id, field.id)
              )
            )
            .limit(1);
          
          if (existingResponse) {
            // Update existing response
            await db
              .update(ky3pResponses)
              .set({
                response_value: String(response.value),
                status: KYBFieldStatus.COMPLETE,
                updated_at: new Date()
              })
              .where(eq(ky3pResponses.id, existingResponse.id));
          } else {
            // Create new response
            await db
              .insert(ky3pResponses)
              .values({
                task_id: taskId,
                field_id: field.id,
                response_value: String(response.value),
                status: KYBFieldStatus.COMPLETE,
                created_at: new Date(),
                updated_at: new Date(),
                version: 1
              });
          }
          
          processedCount++;
          fieldUpdates.push(field.field_key);
        } catch (responseError) {
          logger.error(`[KY3P API] Error processing array response in batch update:`, responseError);
        }
      }
    } else {
      // For object format with field keys, process each key-value pair
      for (const [fieldKeyOrId, fieldValue] of Object.entries(responses)) {
        // Skip metadata fields
        if (fieldKeyOrId.startsWith('_')) continue;
        
        try {
          let field = null;
          
          if (useFieldIds) {
            // If explicitly using field IDs, find field by ID
            const fieldId = parseInt(fieldKeyOrId);
            if (isNaN(fieldId)) {
              logger.warn(`[KY3P API] Invalid field ID format in batch update: ${fieldKeyOrId}`);
              continue;
            }
            
            [field] = await db
              .select()
              .from(ky3pFields)
              .where(eq(ky3pFields.id, fieldId))
              .limit(1);
          } else {
            // Default behavior - find field by key
            [field] = await db
              .select()
              .from(ky3pFields)
              .where(eq(ky3pFields.field_key, fieldKeyOrId))
              .limit(1);
          }
          
          if (!field) {
            logger.warn(`[KY3P API] Field not found in batch update: ${fieldKeyOrId}`);
            continue;
          }
        
          // Check if a response already exists
          const [existingResponse] = await db
            .select()
            .from(ky3pResponses)
            .where(
              and(
                eq(ky3pResponses.task_id, taskId),
                eq(ky3pResponses.field_id, field.id)
              )
            )
            .limit(1);
          
          if (existingResponse) {
            // Update existing response
            await db
              .update(ky3pResponses)
              .set({
                response_value: String(fieldValue),
                status: KYBFieldStatus.COMPLETE,
                updated_at: new Date()
              })
              .where(eq(ky3pResponses.id, existingResponse.id));
          } else {
            // Create new response
            await db
              .insert(ky3pResponses)
              .values({
                task_id: taskId,
                field_id: field.id,
                response_value: String(fieldValue),
                status: KYBFieldStatus.COMPLETE,
                created_at: new Date(),
                updated_at: new Date(),
                version: 1
              });
          }
          
          processedCount++;
          fieldUpdates.push(fieldKeyOrId);
        } catch (fieldError) {
          logger.error(`[KY3P API] Error updating field ${fieldKeyOrId} in batch:`, fieldError);
        }
      }
    }
    
    // Update task progress
    try {
      const [totalFields] = await db
        .select({ count: count() })
        .from(ky3pFields)
        .where(ne(ky3pFields.field_type, 'section'));
      
      const [completedFields] = await db
        .select({ count: count() })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            ne(ky3pResponses.status, KYBFieldStatus.EMPTY)
          )
        );
      
      const totalFieldCount = totalFields?.count || 0;
      const completedFieldCount = completedFields?.count || 0;
      
      const progress = totalFieldCount > 0 
        ? Math.min(100, Math.round((completedFieldCount / totalFieldCount) * 100)) 
        : 0;
      
      await db
        .update(tasks)
        .set({
          progress,
          status: progress > 0 ? TaskStatus.IN_PROGRESS : TaskStatus.NOT_STARTED,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast task update
      const { broadcastTaskUpdate } = await import('../services/websocket.js');
      await broadcastTaskUpdate(taskId);
      
      // Also broadcast progress update
      const { broadcastProgressUpdate } = await import('../utils/progress');
      await broadcastProgressUpdate(taskId, progress);
    } catch (progressError) {
      logger.error('[KY3P API] Error updating task progress in batch update:', progressError);
    }
    
    logger.info(`[KY3P API] Batch update successful for task ${taskId}:`, {
      processedCount,
      fieldKeys: fieldUpdates.slice(0, 10).join(', ') + (fieldUpdates.length > 10 ? '...' : '')
    });
    
    return res.json({
      success: true,
      processedCount,
      message: `Successfully processed ${processedCount} field updates`
    });
  } catch (error) {
    logger.error('[KY3P API] Error in batch update endpoint:', error);
    res.status(500).json({ message: 'Error processing batch update' });
  }
});

export function registerKY3PBatchUpdateRoutes(app: any) {
  app.use(router);
  logger.info('Registered KY3P batch update routes');
}

export default router;
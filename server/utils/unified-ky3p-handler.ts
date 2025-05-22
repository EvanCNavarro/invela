/**
 * Unified KY3P Handler
 * 
 * This module provides standardized methods for working with KY3P responses
 * using the field_key approach (consistent with KYB and Open Banking forms).
 * 
 * It provides backward compatibility while moving the system toward a unified approach.
 */

import { db } from '@db';
import { ky3pResponses, ky3pFields, tasks } from '@db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { logger } from './logger';
import { updateKy3pProgressFixed } from './ky3p-progress.utils';
import { FieldStatus, normalizeFieldStatus } from './field-status';

/**
 * Result of a KY3P field update operation
 */
type Ky3pFieldUpdateResult = {
  success: boolean;
  message: string;
  fieldKey?: string;
  fieldId?: number;
  task?: {
    id: number;
    progress: number | undefined;
    status: string;
  };
  error?: string;
};

/**
 * Result of a KY3P get responses operation
 */
type Ky3pResponsesResult = {
  success: boolean;
  message?: string;
  responses?: Record<string, any>;
  error?: string;
};

/**
 * Get field ID from field key
 * 
 * @param fieldKey The field key to look up
 * @returns The field ID if found, null otherwise
 */
async function getFieldIdFromKey(fieldKey: string): Promise<number | null> {
  try {
    const [field] = await db.select({
      id: ky3pFields.id,
    })
    .from(ky3pFields)
    .where(eq(ky3pFields.field_key, fieldKey))
    .limit(1);
    
    return field?.id || null;
  } catch (error) {
    logger.error(`[UNIFIED-KY3P] Error getting field ID for key ${fieldKey}:`, error);
    return null;
  }
}

/**
 * Update a KY3P field by field key
 * 
 * @param taskId Task ID 
 * @param fieldKey Field key to update
 * @param value Value to set
 * @param status Response status (COMPLETE, INCOMPLETE, EMPTY)
 * @returns Result of the update operation
 */
export async function updateKy3pFieldByKey(
  taskId: number, 
  fieldKey: string, 
  value: string,
  status: string = FieldStatus.COMPLETE
): Promise<Ky3pFieldUpdateResult> {
  try {
    logger.info(`[UNIFIED-KY3P] Updating field ${fieldKey} for task ${taskId}`);
    
    // Get the field ID from the field key
    const fieldId = await getFieldIdFromKey(fieldKey);
    
    if (!fieldId) {
      return {
        success: false,
        message: `Field with key ${fieldKey} not found`,
        fieldKey
      };
    }
    
    // Use the normalizeFieldStatus helper to ensure consistent status values
    const normalizedStatus = normalizeFieldStatus(status);
    
    // Check if a response already exists for this task and field
    const [existingResponse] = await db.select({
      id: ky3pResponses.id,
    })
    .from(ky3pResponses)
    .where(
      and(
        eq(ky3pResponses.task_id, taskId),
        eq(ky3pResponses.field_id, fieldId)
      )
    )
    .limit(1);
    
    // Begin a transaction
    return await db.transaction(async (tx) => {
      if (existingResponse) {
        // Update the existing response
        await tx.update(ky3pResponses)
          .set({
            response_value: value,
            status: sql`${normalizedStatus}::text`, // Cast to text type for consistency
            field_key: fieldKey, // Ensure field_key is set even for existing responses
            updated_at: new Date(),
          })
          .where(eq(ky3pResponses.id, existingResponse.id));
      } else {
        // Create a new response
        await tx.insert(ky3pResponses)
          .values({
            task_id: taskId,
            field_id: fieldId,
            field_key: fieldKey,
            response_value: value,
            // Use SQL.raw to handle the status
            status: sql`${normalizedStatus}::text`,
            created_at: new Date(),
            updated_at: new Date(),
          });
      }
      
      // Recalculate progress
      const progressResult = await updateKy3pProgressFixed(taskId, { forceUpdate: true });
      
      // Get the current task to get the latest status
      const [updatedTask] = await tx.select({
        id: tasks.id,
        progress: tasks.progress,
        status: tasks.status
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
      return {
        success: true,
        message: `Successfully updated field ${fieldKey} for task ${taskId}`,
        fieldKey,
        fieldId,
        task: {
          id: taskId,
          progress: progressResult.progress || updatedTask.progress,
          status: updatedTask.status,
        }
      };
    });
  } catch (error) {
    logger.error(`[UNIFIED-KY3P] Error updating field ${fieldKey} for task ${taskId}:`, error);
    
    return {
      success: false,
      message: `Error updating field ${fieldKey} for task ${taskId}`,
      fieldKey,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get all KY3P responses for a task, keyed by field_key
 * 
 * @param taskId Task ID to get responses for
 * @returns Object mapping field_key to response data
 */
export async function getKy3pResponsesByFieldKey(taskId: number): Promise<Ky3pResponsesResult> {
  try {
    logger.info(`[UNIFIED-KY3P] Getting responses by field key for task ${taskId}`);
    
    // First verify task exists and is a KY3P task
    const [task] = await db.select({
      id: tasks.id,
      task_type: tasks.task_type,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
    
    if (!task) {
      return {
        success: false,
        message: `Task ${taskId} not found`,
      };
    }
    
    // Normalize task type (both 'ky3p' and 'security_assessment' are valid)
    const isKy3pTask = task.task_type === 'ky3p' || task.task_type === 'security_assessment';
    
    if (!isKy3pTask) {
      return {
        success: false,
        message: `Task ${taskId} is not a KY3P task (type: ${task.task_type})`,
      };
    }
    
    // Get all responses for this task
    const responses = await db.select({
      id: ky3pResponses.id,
      field_id: ky3pResponses.field_id,
      field_key: ky3pResponses.field_key,
      response_value: ky3pResponses.response_value,
      status: ky3pResponses.status,
      created_at: ky3pResponses.created_at,
      updated_at: ky3pResponses.updated_at,
    })
    .from(ky3pResponses)
    .where(eq(ky3pResponses.task_id, taskId));
    
    // If there are responses with missing field_key, try to populate them
    const responsesWithoutFieldKey = responses.filter(r => !r.field_key);
    
    if (responsesWithoutFieldKey.length > 0) {
      logger.warn(`[UNIFIED-KY3P] Found ${responsesWithoutFieldKey.length} responses without field_key for task ${taskId}`);
      
      // Get field IDs that need field_key
      const fieldIds = [...new Set(responsesWithoutFieldKey.map(r => r.field_id).filter(Boolean))];
      
      if (fieldIds.length > 0) {
        // Get field definitions for these IDs
        const fields = await db.select({
          id: ky3pFields.id,
          field_key: ky3pFields.field_key,
        })
        .from(ky3pFields)
        .where(sql`${ky3pFields.id} IN (${sql.join(fieldIds.map(id => sql`${id}`), sql`, `)})`);

        
        // Create a map of field_id to field_key
        const fieldKeyMap: Record<number, string> = {};
        fields.forEach(field => {
          if (field.id && field.field_key) {
            fieldKeyMap[field.id] = field.field_key;
          }
        });
        
        // Update responses with field_key in a transaction
        await db.transaction(async (tx) => {
          for (const response of responsesWithoutFieldKey) {
            if (response.field_id && fieldKeyMap[response.field_id]) {
              await tx.update(ky3pResponses)
                .set({
                  field_key: fieldKeyMap[response.field_id],
                  updated_at: new Date(),
                })
                .where(eq(ky3pResponses.id, response.id));
                
              // Update the response in our local array too
              response.field_key = fieldKeyMap[response.field_id];
            }
          }
        });
        
        logger.info(`[UNIFIED-KY3P] Updated ${responsesWithoutFieldKey.length} responses with field_key for task ${taskId}`);
      }
    }
    
    // Convert to a map of field_key to response data
    const responseMap: Record<string, any> = {};
    
    responses.forEach(response => {
      // Use field_key if available, otherwise use field_id as string
      const key = response.field_key || `field_id_${response.field_id}`;
      
      responseMap[key] = {
        id: response.id,
        field_id: response.field_id,
        field_key: response.field_key,
        value: response.response_value,
        status: response.status,
        created_at: response.created_at,
        updated_at: response.updated_at,
      };
    });
    
    return {
      success: true,
      responses: responseMap,
    };
  } catch (error) {
    logger.error(`[UNIFIED-KY3P] Error getting responses by field key for task ${taskId}:`, error);
    
    return {
      success: false,
      message: `Error getting responses by field key for task ${taskId}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

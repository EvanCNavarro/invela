/**
 * Unified KY3P Response Handler
 * 
 * This module implements a standardized approach to handle KY3P form responses
 * using string-based field_key instead of numeric field_id, making it consistent
 * with KYB and Open Banking form handling.
 */

import { db } from '@db';
import { tasks, ky3pFields, ky3pResponses } from '@db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { logger } from './logger';
import { updateKy3pProgressFixed } from './unified-progress-fixed';

type ResponseStatus = 'empty' | 'incomplete' | 'COMPLETE' | 'INCOMPLETE' | 'EMPTY';

/**
 * Update a KY3P form field response using field_key
 */
export async function updateKy3pFieldByKey(
  taskId: number,
  fieldKey: string,
  value: string,
  status: ResponseStatus = 'COMPLETE'
): Promise<{ success: boolean; message: string }> {
  const logPrefix = '[KY3P-FIELD-UPDATE]';
  
  // Normalize field status to uppercase for consistency
  const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : 'COMPLETE';
  const validStatuses = ['COMPLETE', 'INCOMPLETE', 'EMPTY'];
  const finalStatus = validStatuses.includes(normalizedStatus) ? normalizedStatus : 'COMPLETE';
  
  logger.info(`${logPrefix} Updating KY3P field by key: taskId=${taskId}, fieldKey=${fieldKey}, status=${finalStatus}`);
  
  try {
    // First, validate the task exists
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      logger.error(`${logPrefix} Task ${taskId} not found`);
      return { success: false, message: `Task ${taskId} not found` };
    }
    
    // Get the field definition using field_key
    const [field] = await db
      .select()
      .from(ky3pFields)
      .where(eq(ky3pFields.field_key, fieldKey));
    
    if (!field) {
      logger.error(`${logPrefix} Field with key '${fieldKey}' not found`);
      return { success: false, message: `Field with key '${fieldKey}' not found` };
    }
    
    // Use a transaction to ensure atomic operations
    await db.transaction(async (tx) => {
      // Check if a response already exists for this task and field
      const [existingResponse] = await tx
        .select()
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.field_key, fieldKey)
          )
        );
      
      if (existingResponse) {
        // Update existing response
        await tx
          .update(ky3pResponses)
          .set({
            response_value: value,
            status: finalStatus,
            updated_at: new Date()
          })
          .where(eq(ky3pResponses.id, existingResponse.id));
      } else {
        // Insert new response using both field_id and field_key
        await tx
          .insert(ky3pResponses)
          .values({
            task_id: taskId,
            field_id: field.id, // Still set field_id for backward compatibility
            field_key: fieldKey, // Use field_key as the primary identifier
            response_value: value,
            status: finalStatus,
            created_at: new Date(),
            updated_at: new Date()
          });
      }
    });
    
    // Update progress after field update
    // Using the fixed method to ensure proper progress persistence
    try {
      await updateKy3pProgressFixed(taskId, {
        debug: true,
        metadata: {
          lastFieldUpdate: new Date().toISOString(),
          updatedFieldKey: fieldKey
        }
      });
    } catch (error) {
      // Log but don't fail the operation if progress update fails
      logger.error(`${logPrefix} Error updating progress after field update:`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    logger.info(`${logPrefix} Successfully updated KY3P field: taskId=${taskId}, fieldKey=${fieldKey}`);
    
    return {
      success: true,
      message: `Successfully updated field ${fieldKey} for task ${taskId}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`${logPrefix} Error updating KY3P field:`, {
      error: errorMessage,
      taskId,
      fieldKey
    });
    
    return {
      success: false,
      message: `Error updating field: ${errorMessage}`
    };
  }
}

/**
 * Get all responses for a KY3P task with field_key as the identifier
 */
export async function getKy3pResponsesByFieldKey(taskId: number): Promise<{
  success: boolean;
  responses?: Record<string, any>;
  message?: string;
}> {
  const logPrefix = '[KY3P-GET-RESPONSES]';
  
  try {
    // Get all responses for the task
    const responses = await db
      .select()
      .from(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    // Convert to a field_key-indexed map
    const responseMap: Record<string, any> = {};
    
    for (const response of responses) {
      // Skip responses without field_key
      if (!response.field_key) {
        logger.warn(`${logPrefix} Found response without field_key: ${response.id}, field_id: ${response.field_id}`);
        continue;
      }
      
      responseMap[response.field_key] = {
        value: response.response_value,
        status: response.status,
        fieldId: response.field_id, // Include field_id for backward compatibility
        fieldKey: response.field_key
      };
    }
    
    logger.info(`${logPrefix} Found ${Object.keys(responseMap).length} responses for task ${taskId}`);
    
    return {
      success: true,
      responses: responseMap
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`${logPrefix} Error getting KY3P responses:`, {
      error: errorMessage,
      taskId
    });
    
    return {
      success: false,
      message: `Error getting responses: ${errorMessage}`
    };
  }
}

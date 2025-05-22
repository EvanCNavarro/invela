/**
 * Unified Form Update API
 * 
 * This module provides a standardized API endpoint for updating form fields
 * of any form type (KYB, KY3P, Open Banking) with consistent behavior.
 */

import express from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '@db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { 
  kybResponses, 
  ky3pResponses, 
  openBankingResponses,
  kybFields,
  ky3pFields,
  openBankingFields
} from '@db/schema';
import { FieldStatus } from '../utils/field-status';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { broadcastFieldUpdate } from '../utils/progress';
import { reconcileTaskFields } from '../utils/unified-task-reconciler';
import { reconcileTaskFieldsFixed } from '../utils/task-reconciler.utils';

const router = express.Router();

// Strongly typed schema for field update requests
const fieldUpdateSchema = z.object({
  taskId: z.number().positive(),
  taskType: z.string().min(1),
  fields: z.array(z.object({
    fieldKey: z.string().min(1),
    value: z.string().optional().nullable(),
    metadata: z.record(z.any()).optional()
  })).min(1)
});

/**
 * Unified Form Field Update API
 * 
 * This endpoint handles field updates for all form types (KYB, KY3P, Open Banking)
 * with a consistent API and behavior. It uses field_key references for consistency
 * and automatically updates progress and status.
 */
router.post('/api/form/update-fields', requireAuth, async (req, res) => {
  const logPrefix = '[Unified Form Update]';
  
  try {
    // Validate request body
    const parseResult = fieldUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      logger.warn(`${logPrefix} Invalid request body:`, {
        error: error.message,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        message: `Invalid request: ${error.message}`
      });
    }
    
    const { taskId, taskType, fields } = parseResult.data;
    
    // Normalize task type
    const normalizedType = normalizeTaskType(taskType);
    
    logger.info(`${logPrefix} Processing ${fields.length} field updates for task ${taskId} (${normalizedType})`, {
      taskId,
      taskType: normalizedType,
      fieldCount: fields.length,
      fieldKeys: fields.map(f => f.fieldKey)
    });
    
    // Process the field updates based on form type
    let updatedCount = 0;
    
    if (normalizedType === 'open_banking') {
      updatedCount = await updateOpenBankingFields(taskId, fields);
    } else if (normalizedType === 'ky3p') {
      updatedCount = await updateKy3pFields(taskId, fields);
    } else {
      // Default to KYB
      updatedCount = await updateKybFields(taskId, fields);
    }
    
    // Broadcast field updates for real-time UI updates
    for (const field of fields) {
      try {
        broadcastFieldUpdate(
          taskId,
          field.fieldKey,
          field.value || '',
          undefined // We're using field_key, so fieldId is not needed
        );
      } catch (broadcastError) {
        logger.error(`${logPrefix} Error broadcasting field update:`, {
          taskId,
          fieldKey: field.fieldKey,
          error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError)
        });
        // Continue even if broadcast fails - updates are saved in the database
      }
    }
    
    // Reconcile task progress and status using the fixed reconciler to avoid type errors
    try {
      const reconcileResult = await reconcileTaskFieldsFixed(
        taskId,
        fields.map(f => f.fieldKey),
        { taskType: normalizedType }
      );
      
      // Return success response with updated progress
      return res.json({
        success: true,
        message: `Successfully updated ${updatedCount} fields for task ${taskId}`,
        updatedCount,
        progress: reconcileResult.progress,
        status: reconcileResult.status,
        taskId,
        fieldKeys: fields.map(f => f.fieldKey)
      });
    } catch (reconcileError) {
      logger.error(`${logPrefix} Error reconciling task progress:`, {
        taskId,
        error: reconcileError instanceof Error ? reconcileError.message : String(reconcileError)
      });
      
      // Return partial success - fields were updated but progress reconciliation failed
      return res.json({
        success: true,
        message: `Updated ${updatedCount} fields but failed to reconcile progress: ${reconcileError instanceof Error ? reconcileError.message : String(reconcileError)}`,
        updatedCount,
        progress: null,
        status: null,
        taskId,
        fieldKeys: fields.map(f => f.fieldKey),
        reconcileError: true
      });
    }
  } catch (error) {
    logger.error(`${logPrefix} Error processing form update:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      message: `Error processing form update: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * Update KYB fields
 * 
 * @param taskId Task ID
 * @param fields Fields to update
 * @returns Number of fields updated
 */
async function updateKybFields(
  taskId: number,
  fields: Array<{ fieldKey: string; value: string | null | undefined; metadata?: Record<string, any> }>
): Promise<number> {
  const fieldKeys = fields.map(f => f.fieldKey);
  
  // Get field IDs for the provided field keys
  const fieldMappings = await db
    .select()
    .from(kybFields)
    .where(inArray(kybFields.field_key, fieldKeys));
  
  const fieldKeyToIdMap = new Map(
    fieldMappings.map(field => [field.field_key, field.id])
  );
  
  let updatedCount = 0;
  
  // Process each field update in a transaction
  await db.transaction(async (tx) => {
    for (const field of fields) {
      const fieldId = fieldKeyToIdMap.get(field.fieldKey);
      
      if (!fieldId) {
        logger.warn(`[KYB Update] Field key ${field.fieldKey} not found in database`);
        continue;
      }
      
      // Determine field status based on value
      const status = field.value ? FieldStatus.COMPLETE : FieldStatus.EMPTY;
      
      // Check if response already exists
      const existingResponse = await tx
        .select()
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            eq(kybResponses.field_id, fieldId)
          )
        )
        .limit(1);
      
      if (existingResponse.length > 0) {
        // Update existing response
        await tx
          .update(kybResponses)
          .set({
            response_value: field.value || '',
            status,
            updated_at: new Date(),
            metadata: field.metadata ? sql`${JSON.stringify(field.metadata)}` : undefined
          })
          .where(
            and(
              eq(kybResponses.task_id, taskId),
              eq(kybResponses.field_id, fieldId)
            )
          );
      } else {
        // Insert new response
        await tx
          .insert(kybResponses)
          .values({
            task_id: taskId,
            field_id: fieldId,
            field_key: field.fieldKey,
            response_value: field.value || '',
            status,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: field.metadata
          });
      }
      
      updatedCount++;
    }
  });
  
  return updatedCount;
}

/**
 * Update KY3P fields
 * 
 * @param taskId Task ID
 * @param fields Fields to update
 * @returns Number of fields updated
 */
async function updateKy3pFields(
  taskId: number,
  fields: Array<{ fieldKey: string; value: string | null | undefined; metadata?: Record<string, any> }>
): Promise<number> {
  const fieldKeys = fields.map(f => f.fieldKey);
  
  // Get field IDs for the provided field keys
  const fieldMappings = await db
    .select()
    .from(ky3pFields)
    .where(inArray(ky3pFields.field_key, fieldKeys));
  
  const fieldKeyToIdMap = new Map(
    fieldMappings.map(field => [field.field_key, field.id])
  );
  
  let updatedCount = 0;
  
  // Process each field update in a transaction
  await db.transaction(async (tx) => {
    for (const field of fields) {
      const fieldId = fieldKeyToIdMap.get(field.fieldKey);
      
      if (!fieldId) {
        logger.warn(`[KY3P Update] Field key ${field.fieldKey} not found in database`);
        continue;
      }
      
      // Determine field status based on value
      const status = field.value ? FieldStatus.COMPLETE : FieldStatus.EMPTY;
      
      // Check if response already exists
      const existingResponse = await tx
        .select()
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.field_id, fieldId)
          )
        )
        .limit(1);
      
      if (existingResponse.length > 0) {
        // Update existing response
        await tx
          .update(ky3pResponses)
          .set({
            response_value: field.value || '',
            status,
            updated_at: new Date(),
            version: existingResponse[0].version + 1,
            metadata: field.metadata ? sql`${JSON.stringify(field.metadata)}` : undefined
          })
          .where(
            and(
              eq(ky3pResponses.task_id, taskId),
              eq(ky3pResponses.field_id, fieldId)
            )
          );
      } else {
        // Insert new response
        await tx
          .insert(ky3pResponses)
          .values({
            task_id: taskId,
            field_id: fieldId,
            field_key: field.fieldKey,
            response_value: field.value || '',
            status,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: field.metadata
          });
      }
      
      updatedCount++;
    }
  });
  
  return updatedCount;
}

/**
 * Update Open Banking fields
 * 
 * @param taskId Task ID
 * @param fields Fields to update
 * @returns Number of fields updated
 */
async function updateOpenBankingFields(
  taskId: number,
  fields: Array<{ fieldKey: string; value: string | null | undefined; metadata?: Record<string, any> }>
): Promise<number> {
  const fieldKeys = fields.map(f => f.fieldKey);
  
  // Get field IDs for the provided field keys
  const fieldMappings = await db
    .select()
    .from(openBankingFields)
    .where(inArray(openBankingFields.field_key, fieldKeys));
  
  const fieldKeyToIdMap = new Map(
    fieldMappings.map(field => [field.field_key, field.id])
  );
  
  let updatedCount = 0;
  
  // Process each field update in a transaction
  await db.transaction(async (tx) => {
    for (const field of fields) {
      const fieldId = fieldKeyToIdMap.get(field.fieldKey);
      
      if (!fieldId) {
        logger.warn(`[Open Banking Update] Field key ${field.fieldKey} not found in database`);
        continue;
      }
      
      // Determine field status based on value
      const status = field.value ? FieldStatus.COMPLETE : FieldStatus.EMPTY;
      
      // Check if response already exists
      const existingResponse = await tx
        .select()
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            eq(openBankingResponses.field_id, fieldId)
          )
        )
        .limit(1);
      
      if (existingResponse.length > 0) {
        // Update existing response
        await tx
          .update(openBankingResponses)
          .set({
            response_value: field.value || '',
            status,
            updated_at: new Date(),
            metadata: field.metadata ? sql`${JSON.stringify(field.metadata)}` : undefined
          })
          .where(
            and(
              eq(openBankingResponses.task_id, taskId),
              eq(openBankingResponses.field_id, fieldId)
            )
          );
      } else {
        // Insert new response
        await tx
          .insert(openBankingResponses)
          .values({
            task_id: taskId,
            field_id: fieldId,
            field_key: field.fieldKey,
            response_value: field.value || '',
            status,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: field.metadata
          });
      }
      
      updatedCount++;
    }
  });
  
  return updatedCount;
}

/**
 * Normalize task type to one of the standard types
 * 
 * @param taskType Original task type string
 * @returns Normalized task type ('kyb', 'ky3p', 'open_banking')
 */
function normalizeTaskType(taskType: string): 'kyb' | 'ky3p' | 'open_banking' {
  const normalizedType = taskType.toLowerCase();
  
  if (normalizedType === 'open_banking') {
    return 'open_banking';
  }
  
  if (
    normalizedType === 'ky3p' ||
    normalizedType.includes('ky3p') ||
    normalizedType.includes('security') ||
    normalizedType === 'security_assessment' ||
    normalizedType === 'sp_ky3p_assessment'
  ) {
    return 'ky3p';
  }
  
  // Default to KYB for all other types
  return 'kyb';
}

export default router;

/**
 * KY3P Field Key Migration Utility
 * 
 * This module provides utilities to migrate KY3P responses from using numeric field_id
 * to string-based field_key for consistency with KYB and Open Banking forms.
 * 
 * This follows the KISS principle to create a unified approach without special case handling.
 */

import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { eq, sql, isNull, and } from 'drizzle-orm';
import { logger } from './logger';

/**
 * Results of a field key migration operation
 */
type MigrationResult = {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
};

/**
 * Map of field ID to field key for KY3P fields
 */
type FieldKeyMap = Record<number, string>;

/**
 * Build a map of field IDs to field keys from the ky3p_fields table
 * 
 * @returns Map of field IDs to field keys
 */
async function buildFieldKeyMap(): Promise<FieldKeyMap> {
  try {
    logger.info('[KY3P-MIGRATION] Building field ID to field key map');
    
    const fields = await db.select({
      id: ky3pFields.id,
      field_key: ky3pFields.field_key,
    })
    .from(ky3pFields)
    .where(sql`${ky3pFields.field_key} IS NOT NULL`);
    
    const fieldKeyMap: FieldKeyMap = {};
    
    fields.forEach(field => {
      if (field.id && field.field_key) {
        fieldKeyMap[field.id] = field.field_key;
      }
    });
    
    const fieldCount = Object.keys(fieldKeyMap).length;
    logger.info(`[KY3P-MIGRATION] Found ${fieldCount} fields with valid field keys`);
    
    return fieldKeyMap;
  } catch (error) {
    logger.error('[KY3P-MIGRATION] Error building field ID to field key map:', error);
    return {};
  }
}

/**
 * Find KY3P responses without field_key populated
 * 
 * @returns Array of response IDs that need field_key populated
 */
async function findResponsesWithoutFieldKey(): Promise<{ id: number; field_id: number | null; task_id: number | null }[]> {
  try {
    logger.info('[KY3P-MIGRATION] Finding KY3P responses without field_key');
    
    const responses = await db.select({
      id: ky3pResponses.id,
      field_id: ky3pResponses.field_id,
      task_id: ky3pResponses.task_id,
    })
    .from(ky3pResponses)
    .where(
      and(
        isNull(ky3pResponses.field_key),
        sql`${ky3pResponses.field_id} IS NOT NULL`
      )
    );
    
    logger.info(`[KY3P-MIGRATION] Found ${responses.length} responses without field_key`);
    
    return responses;
  } catch (error) {
    logger.error('[KY3P-MIGRATION] Error finding responses without field_key:', error);
    return [];
  }
}

/**
 * Update KY3P responses to use field_key
 * 
 * @param responses Array of responses to update
 * @param fieldKeyMap Map of field IDs to field keys
 * @returns Number of responses updated
 */
async function updateResponsesWithFieldKey(
  responses: { id: number; field_id: number | null; task_id: number | null }[],
  fieldKeyMap: FieldKeyMap
): Promise<number> {
  let updatedCount = 0;
  
  try {
    logger.info(`[KY3P-MIGRATION] Updating ${responses.length} responses with field_key`);
    
    // Use a transaction to ensure consistency
    await db.transaction(async (tx) => {
      for (const response of responses) {
        if (!response.field_id) {
          logger.warn(`[KY3P-MIGRATION] Response ${response.id} has null field_id, skipping`);
          continue;
        }
        
        const fieldKey = fieldKeyMap[response.field_id];
        if (!fieldKey) {
          logger.warn(`[KY3P-MIGRATION] No field_key found for field_id ${response.field_id}, skipping response ${response.id}`);
          continue;
        }
        
        await tx.update(ky3pResponses)
          .set({
            field_key: fieldKey,
            updated_at: new Date(),
          })
          .where(eq(ky3pResponses.id, response.id));
        
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          logger.info(`[KY3P-MIGRATION] Updated ${updatedCount} responses with field_key`);
        }
      }
    });
    
    logger.info(`[KY3P-MIGRATION] Successfully updated ${updatedCount} responses with field_key`);
    
    return updatedCount;
  } catch (error) {
    logger.error('[KY3P-MIGRATION] Error updating responses with field_key:', error);
    throw error;
  }
}

/**
 * Populate field_key for all KY3P responses that don't have it
 * 
 * @returns Result of the migration operation
 */
export async function populateKy3pResponseFieldKeys(): Promise<MigrationResult> {
  try {
    logger.info('[KY3P-MIGRATION] Starting KY3P response field_key population');
    
    // Build the field ID to field key map
    const fieldKeyMap = await buildFieldKeyMap();
    
    if (Object.keys(fieldKeyMap).length === 0) {
      return {
        success: false,
        message: 'No field keys found in ky3p_fields table',
      };
    }
    
    // Find responses without field_key
    const responses = await findResponsesWithoutFieldKey();
    
    if (responses.length === 0) {
      return {
        success: true,
        message: 'No responses found that need field_key populated',
        count: 0,
      };
    }
    
    // Update responses with field_key
    const updatedCount = await updateResponsesWithFieldKey(responses, fieldKeyMap);
    
    return {
      success: true,
      message: `Successfully updated ${updatedCount} responses with field_key`,
      count: updatedCount,
    };
  } catch (error) {
    logger.error('[KY3P-MIGRATION] Error populating KY3P response field_key:', error);
    
    return {
      success: false,
      message: 'Error populating KY3P response field_key',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

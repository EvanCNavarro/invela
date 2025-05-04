/**
 * KY3P Field Key Migration Utility
 * 
 * This module handles the migration from numeric field_id to string-based field_key
 * references for KY3P responses, making them consistent with KYB and Open Banking.
 */

import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from './logger';

/**
 * Populate field_key for all KY3P responses that don't have it set
 *
 * This is a one-time migration utility to ensure all KY3P responses have
 * the field_key populated based on their field_id references.
 *
 * @returns Statistics about the migration process
 */
export async function populateKy3pResponseFieldKeys(): Promise<{
  success: boolean;
  message: string;
  count?: number;
  error?: string;
}> {
  const logPrefix = '[KY3P-FIELD-KEY-MIGRATION]';
  const startTime = Date.now();
  
  try {
    logger.info(`${logPrefix} Starting field_key population for KY3P responses`);
    
    // Step 1: Get all KY3P fields to build a map of field_id to field_key
    const fields = await db.select().from(ky3pFields);
    
    if (!fields || fields.length === 0) {
      logger.warn(`${logPrefix} No KY3P fields found in the database`);
      return {
        success: true,
        message: 'No KY3P fields found to map',
        count: 0
      };
    }
    
    // Build a map of field_id to field_key for quick lookups
    const fieldIdToKeyMap = new Map<number, string>();
    for (const field of fields) {
      if (field.id && field.field_key) {
        fieldIdToKeyMap.set(field.id, field.field_key);
      }
    }
    
    logger.info(`${logPrefix} Built field_id to field_key map with ${fieldIdToKeyMap.size} entries`);
    
    // Step 2: Find all KY3P responses that have null field_key
    const responsesNeedingUpdate = await db
      .select()
      .from(ky3pResponses)
      .where(isNull(ky3pResponses.field_key));
    
    if (!responsesNeedingUpdate || responsesNeedingUpdate.length === 0) {
      logger.info(`${logPrefix} No KY3P responses found with missing field_key`);
      return {
        success: true,
        message: 'No KY3P responses found with missing field_key',
        count: 0
      };
    }
    
    logger.info(`${logPrefix} Found ${responsesNeedingUpdate.length} KY3P responses with missing field_key`);
    
    // Step 3: Update all responses with missing field_key
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Use a transaction for atomicity
    await db.transaction(async (tx) => {
      for (const response of responsesNeedingUpdate) {
        const fieldKey = fieldIdToKeyMap.get(response.field_id);
        
        if (!fieldKey) {
          logger.warn(`${logPrefix} Could not find field_key for field_id ${response.field_id}, skipping response ID ${response.id}`);
          skippedCount++;
          continue;
        }
        
        // Update the response with the field_key
        await tx
          .update(ky3pResponses)
          .set({ field_key: fieldKey })
          .where(eq(ky3pResponses.id, response.id));
        
        updatedCount++;
      }
    });
    
    const duration = Date.now() - startTime;
    
    logger.info(`${logPrefix} Successfully updated ${updatedCount} KY3P responses with field_key in ${duration}ms`);
    
    if (skippedCount > 0) {
      logger.warn(`${logPrefix} Skipped ${skippedCount} KY3P responses due to missing field_key mapping`);
    }
    
    return {
      success: true,
      message: `Successfully updated ${updatedCount} KY3P responses with field_key`,
      count: updatedCount
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`${logPrefix} Error populating field_key for KY3P responses:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: 'Error populating field_key for KY3P responses',
      error: errorMessage
    };
  }
}

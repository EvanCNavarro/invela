/**
 * KYB Progress Calculator
 * 
 * Calculates the progress percentage for KYB forms by evaluating
 * completed field responses against the total number of required fields.
 */

import { sql } from 'drizzle-orm';
import { logger } from '../logger';

const progressLogger = logger.child({ module: 'KYBProgressCalculator' });

/**
 * Calculate the completion percentage for a KYB form
 * 
 * @param taskId The task ID 
 * @param tx Optional transaction
 * @returns Progress percentage (0-100)
 */
export async function calculateKybProgress(taskId: number, tx: any): Promise<number> {
  progressLogger.info(`Calculating KYB progress for task ${taskId}`);
  
  try {
    // Get total number of required fields
    const requiredFieldsResult = await tx.execute(
      sql`SELECT COUNT(*) as count FROM kyb_fields WHERE required = true`
    );
    
    const totalRequired = parseInt(requiredFieldsResult[0].count, 10);
    if (totalRequired === 0) {
      progressLogger.warn(`No required fields found for KYB form, returning 100% progress`);
      return 100; // If no required fields, consider it complete
    }
    
    // Get number of completed required fields
    const completedFieldsResult = await tx.execute(
      sql`SELECT COUNT(*) as count 
          FROM kyb_responses kr
          JOIN kyb_fields kf ON kr.field_id = kf.id
          WHERE kr.task_id = ${taskId}
          AND kf.required = true
          AND kr.status != 'empty'`
    );
    
    const completedRequired = parseInt(completedFieldsResult[0].count, 10);
    
    // Calculate percentage
    const progressPercentage = Math.round((completedRequired / totalRequired) * 100);
    
    progressLogger.info(`KYB progress for task ${taskId}: ${progressPercentage}% (${completedRequired}/${totalRequired})`);
    return progressPercentage;
  } catch (error) {
    progressLogger.error(`Error calculating KYB progress for task ${taskId}:`, error);
    return 0; // Default to 0% on error
  }
}

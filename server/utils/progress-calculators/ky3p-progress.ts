/**
 * KY3P Progress Calculator
 * 
 * Calculates the progress percentage for KY3P forms by evaluating
 * completed field responses against the total number of required fields.
 */

import { sql } from 'drizzle-orm';
import { logger } from '../logger';

const progressLogger = logger.child({ module: 'KY3PProgressCalculator' });

/**
 * Calculate the completion percentage for a KY3P form
 * 
 * @param taskId The task ID 
 * @param tx Optional transaction
 * @returns Progress percentage (0-100)
 */
export async function calculateKy3pProgress(taskId: number, tx: any): Promise<number> {
  progressLogger.info(`Calculating KY3P progress for task ${taskId}`);
  
  try {
    // Get total number of required fields
    const requiredFieldsResult = await tx.execute(
      sql`SELECT COUNT(*) as count FROM ky3p_fields WHERE required = true`
    );
    
    const totalRequired = parseInt(requiredFieldsResult[0].count, 10);
    if (totalRequired === 0) {
      progressLogger.warn(`No required fields found for KY3P form, returning 100% progress`);
      return 100; // If no required fields, consider it complete
    }
    
    // Get number of completed required fields
    const completedFieldsResult = await tx.execute(
      sql`SELECT COUNT(*) as count 
          FROM ky3p_responses kr
          JOIN ky3p_fields kf ON kr.field_id = kf.id
          WHERE kr.task_id = ${taskId}
          AND kf.required = true
          AND kr.status = 'complete'`
    );
    
    const completedRequired = parseInt(completedFieldsResult[0].count, 10);
    
    // Calculate percentage
    const progressPercentage = Math.round((completedRequired / totalRequired) * 100);
    
    progressLogger.info(`KY3P progress for task ${taskId}: ${progressPercentage}% (${completedRequired}/${totalRequired})`);
    return progressPercentage;
  } catch (error) {
    progressLogger.error(`Error calculating KY3P progress for task ${taskId}:`, error);
    return 0; // Default to 0% on error
  }
}

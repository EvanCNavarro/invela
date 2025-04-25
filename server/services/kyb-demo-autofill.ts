/**
 * KYB Demo Auto-Fill Service
 * 
 * This service provides KYB-specific demo auto-fill functionality
 * with a focus on directly using the demo values from the database
 */

import { db } from '@db';
import { eq, and } from 'drizzle-orm';
import { tasks } from '@db/schema';
import getLogger from '@/utils/logger';

const logger = getLogger('KybDemoAutoFill');

/**
 * Fill a KYB form with demo values
 */
export async function kybDemoAutoFill(taskId: number, userId?: number): Promise<{
  success: boolean;
  message: string;
  fieldCount: number;
  formData?: Record<string, any>;
}> {
  try {
    // Get the task
    const [task] = await db.query.tasks.findMany({
      where: eq(tasks.id, taskId),
      limit: 1,
    });

    if (!task) {
      return {
        success: false,
        message: 'Task not found',
        fieldCount: 0,
      };
    }

    logger.info(`Filling KYB form with demo data for task ${taskId}`);

    // Query the KYB fields with demo auto-fill values - using direct SQL for reliability
    // Note: Some systems store empty string as NULL, so we need to check for both
    const sqlQuery = `
      SELECT id, field_key, demo_autofill 
      FROM kyb_fields 
      ORDER BY id
    `;

    const fields = await db.execute(sqlQuery);
    const fieldCount = Array.isArray(fields) ? fields.length : 0;
    logger.info(`Found ${fieldCount} fields with demo data`);

    // Log the first few fields for debugging
    if (fieldCount > 0) {
      // Convert fields to array if not already
      const fieldsArray = Array.isArray(fields) ? fields : [];
      
      // Take up to the first 5 fields to show as examples
      const examples = fieldsArray.slice(0, 5).map((f: any) => ({
        id: f.id,
        field_key: f.field_key,
        demo_value: f.demo_autofill
      }));
      
      logger.info(`Example demo values: ${JSON.stringify(examples, null, 2)}`);
      
      // Count non-empty demo values
      const nonEmptyCount = fieldsArray.filter((f: any) => 
        f.demo_autofill && f.demo_autofill.trim() !== ''
      ).length;
      
      logger.info(`Fields with non-empty demo values: ${nonEmptyCount} out of ${fieldCount}`);
    }

    // Build form data object
    const formData: Record<string, any> = {};
    const responseResults: { success: boolean; fieldKey: string; value: any }[] = [];

    for (const field of fields) {
      try {
        const demoValue = field.demo_autofill;
        const fieldKey = field.field_key;
        const fieldId = field.id;

        if (!demoValue) {
          continue;
        }

        // Add to form data
        formData[fieldKey] = demoValue;

        // Check for existing response
        const existingResponseQuery = `
          SELECT * FROM kyb_responses
          WHERE task_id = $1 AND field_id = $2
          LIMIT 1
        `;
        const existingResponse = await db.execute(existingResponseQuery, [taskId, fieldId]);
        
        const now = new Date();
        
        logger.info(`Processing field ${fieldKey} (ID: ${fieldId}) with demo value: ${demoValue}`);
        logger.info(`Existing response: ${existingResponse && existingResponse.length > 0 ? 'Yes' : 'No'}`);

        if (existingResponse && existingResponse.length > 0) {
          // Update existing response
          const updateQuery = `
            UPDATE kyb_responses
            SET response_value = $1, status = 'FILLED', updated_at = $2
            WHERE task_id = $3 AND field_id = $4
          `;
          
          await db.execute(updateQuery, [demoValue, now, taskId, fieldId]);
          
          // Verify update
          const verifyQuery = `
            SELECT * FROM kyb_responses
            WHERE task_id = $1 AND field_id = $2
            LIMIT 1
          `;
          
          const [verifiedUpdate] = await db.execute(verifyQuery, [taskId, fieldId]);
          
          if (verifiedUpdate) {
            logger.info(`Verified update for ${fieldKey}: expected=${demoValue}, actual=${verifiedUpdate.response_value}`);
          }
        } else {
          // Insert new response
          const insertQuery = `
            INSERT INTO kyb_responses
            (task_id, field_id, user_id, response_value, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'FILLED', $5, $6)
          `;
          
          const effectiveUserId = userId || task.user_id;
          await db.execute(insertQuery, [
            taskId, 
            fieldId, 
            effectiveUserId, 
            demoValue, 
            now, 
            now
          ]);
          
          // Verify insert
          const verifyQuery = `
            SELECT * FROM kyb_responses
            WHERE task_id = $1 AND field_id = $2
            LIMIT 1
          `;
          
          const [verifiedInsert] = await db.execute(verifyQuery, [taskId, fieldId]);
          
          if (verifiedInsert) {
            logger.info(`Verified insert for ${fieldKey}: expected=${demoValue}, actual=${verifiedInsert.response_value}`);
          }
        }

        responseResults.push({
          success: true,
          fieldKey,
          value: demoValue
        });
      } catch (error) {
        logger.error(`Error processing field ${field.field_key}:`, error);
        
        responseResults.push({
          success: false,
          fieldKey: field.field_key,
          value: field.demo_autofill
        });
      }
    }

    // Update task status if needed
    const taskMetadata = {
      ...task.metadata,
      savedFormData: formData,
      lastUpdated: new Date().toISOString()
    };
    
    const updateTaskQuery = `
      UPDATE tasks
      SET status = 'in_progress', progress = 0, metadata = $1
      WHERE id = $2
    `;
    
    await db.execute(updateTaskQuery, [JSON.stringify(taskMetadata), taskId]);

    // Calculate success metrics
    const successCount = responseResults.filter(r => r.success).length;
    const totalCount = responseResults.length;
    
    logger.info(`KYB demo auto-fill completed for task ${taskId}`);
    logger.info(`Successfully filled ${successCount}/${totalCount} fields`);
    
    return {
      success: true,
      message: `Successfully filled ${successCount} fields with demo data`,
      fieldCount: successCount,
      formData
    };
  } catch (error) {
    logger.error('Error in KYB demo auto-fill:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      fieldCount: 0
    };
  }
}
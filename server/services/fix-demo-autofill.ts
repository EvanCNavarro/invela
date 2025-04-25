/**
 * Demo Auto-Fill Fix
 * 
 * This script provides a direct fix for the demo auto-fill functionality
 * to ensure that form data is properly generated, saved, and retrieved.
 */

import * as db from '@db';
import { eq, and } from 'drizzle-orm';
import { tasks, kybFields, kybResponses, ky3pFields, ky3pResponses, openBankingFields, openBankingResponses } from '@db/schema';
// Use standard console for logging
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[Fix Demo Autofill] INFO: ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[Fix Demo Autofill] ERROR: ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[Fix Demo Autofill] WARN: ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[Fix Demo Autofill] DEBUG: ${message}`, ...args)
};

export type FormType = 'kyb' | 'ky3p' | 'open_banking';

interface FormTypeConfig {
  fieldsTable: any;
  responsesTable: any;
  fieldKeyColumn: string;
  displayNameColumn: string;
  demoAutofillColumn: string;
  fieldTypeColumn: string;
  responseValueColumn: string;
  groupColumn: string;
}

// Configuration for each form type
const formTypeConfigs: Record<FormType, FormTypeConfig> = {
  'kyb': {
    fieldsTable: kybFields,
    responsesTable: kybResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    demoAutofillColumn: 'demo_autofill',
    fieldTypeColumn: 'type',
    responseValueColumn: 'response_value',
    groupColumn: 'group'
  },
  'ky3p': {
    fieldsTable: ky3pFields,
    responsesTable: ky3pResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    demoAutofillColumn: 'demo_autofill',
    fieldTypeColumn: 'type',
    responseValueColumn: 'response_value',
    groupColumn: 'group'
  },
  'open_banking': {
    fieldsTable: openBankingFields,
    responsesTable: openBankingResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    demoAutofillColumn: 'demo_autofill',
    fieldTypeColumn: 'type',
    responseValueColumn: 'response_value',
    groupColumn: 'group'
  }
};

/**
 * Enhanced demo data generation and application
 */
export async function enhancedDemoAutoFill(taskId: number, formType: FormType, userId?: number) {
  try {
    logger.info(`Generating enhanced demo data for task ${taskId} (${formType})`);
    
    // Get configuration for the form type
    const config = formTypeConfigs[formType];
    
    if (!config) {
      return {
        success: false,
        message: `Unsupported form type: ${formType}`,
        fieldCount: 0
      };
    }
    
    // Verify task exists
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return {
        success: false,
        message: `Task ${taskId} not found`,
        fieldCount: 0
      };
    }
    
    // Clear any existing responses
    await db.delete(config.responsesTable).where(eq(config.responsesTable.task_id, taskId));
    
    // Fetch all fields with demo autofill data defined
    const fields = await db.select()
      .from(config.fieldsTable)
      .where(
        // Filter out fields with empty or null demo_autofill values
        db.sql`${config.fieldsTable[config.demoAutofillColumn]} IS NOT NULL AND ${config.fieldsTable[config.demoAutofillColumn]} != ''`
      );
    
    if (!fields || fields.length === 0) {
      return {
        success: false,
        message: `No fields found for ${formType}`,
        fieldCount: 0
      };
    }
    
    // Build form data and insert responses
    const formData: Record<string, any> = {};
    
    // Keep track of successful responses for detailed reporting
    const responseResults: { success: boolean; fieldKey: string; value: any }[] = [];
    
    for (const field of fields) {
      try {
        // Get the demo value
        const demoValue = field[config.demoAutofillColumn] || '';
        
        // Skip empty demo values
        if (!demoValue) {
          continue;
        }
        
        const fieldKey = field[config.fieldKeyColumn];
        const fieldType = field[config.fieldTypeColumn] || 'text';
        
        // Add to form data object
        formData[fieldKey] = demoValue;
        
        // Create response in database
        try {
          // Look for existing response
          const existingResponse = await db.query(config.responsesTable).where(
            and(
              eq(config.responsesTable.task_id, taskId),
              eq(config.responsesTable.field_id, field.id)
            )
          );
          
          // Get current timestamp
          const now = new Date();
          
          // If response exists, update it
          if (existingResponse && existingResponse.length > 0) {
            await db.update(config.responsesTable)
              .set({
                [config.responseValueColumn]: demoValue,
                status: 'FILLED',
                updated_at: now
              })
              .where(
                and(
                  eq(config.responsesTable.task_id, taskId),
                  eq(config.responsesTable.field_id, field.id)
                )
              );
          } else {
            // Insert new response
            await db.insert(config.responsesTable).values({
              task_id: taskId,
              field_id: field.id,
              user_id: userId || task.user_id,
              [config.responseValueColumn]: demoValue,
              status: 'FILLED',
              created_at: now,
              updated_at: now
            });
          }
          
          responseResults.push({
            success: true,
            fieldKey,
            value: demoValue
          });
          
        } catch (responseError) {
          logger.error(`Error saving response for field ${fieldKey}:`, responseError);
          
          responseResults.push({
            success: false,
            fieldKey,
            value: demoValue
          });
        }
      } catch (fieldError) {
        logger.error(`Error processing field:`, fieldError);
      }
    }
    
    // Update task status if needed
    await db.update(tasks)
      .set({
        status: 'in_progress',
        progress: 0,
        // Save form data to metadata to avoid TypeScript issues
        metadata: {
          ...task.metadata,
          savedFormData: formData,
          lastUpdated: new Date().toISOString()
        }
      })
      .where(eq(tasks.id, taskId));
    
    // Calculate success metrics
    const successCount = responseResults.filter(r => r.success).length;
    const totalCount = responseResults.length;
    
    logger.info(`Enhanced demo auto-fill completed for task ${taskId} (${formType})`);
    logger.info(`Successfully filled ${successCount}/${totalCount} fields`);
    
    return {
      success: true,
      message: `Successfully filled ${successCount} fields with demo data`,
      fieldCount: successCount,
      formData
    };
    
  } catch (error) {
    logger.error('Error in enhanced demo auto-fill:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      fieldCount: 0
    };
  }
}

/**
 * Maps task types to form types
 */
export function getFormTypeFromTaskType(taskType: string): FormType | null {
  // Map task types to form types
  const taskTypeMap: Record<string, FormType> = {
    'kyb': 'kyb',
    'company_kyb': 'kyb',
    'ky3p': 'ky3p',
    'sp_ky3p_assessment': 'ky3p',
    'security': 'ky3p',
    'security_assessment': 'ky3p',
    'open_banking': 'open_banking',
    'open_banking_survey': 'open_banking'
  };
  
  return taskTypeMap[taskType] || null;
}
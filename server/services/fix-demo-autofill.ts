/**
 * Demo Auto-Fill Fix
 * 
 * This script provides a direct fix for the demo auto-fill functionality
 * to ensure that form data is properly generated, saved, and retrieved.
 */

import { db } from '../../db';
import { 
  tasks,
  kybFields,
  kybResponses,
  ky3pFields,
  ky3pResponses,
  openBankingFields,
  openBankingResponses,
  companies
} from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { broadcastTaskUpdate } from './websocket';

const logger = new Logger('DemoAutoFillFix');

// Form type configuration
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

// Configuration for different form types
const formTypeConfigs: Record<FormType, FormTypeConfig> = {
  kyb: {
    fieldsTable: kybFields,
    responsesTable: kybResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    demoAutofillColumn: 'demo_autofill',
    fieldTypeColumn: 'field_type',
    responseValueColumn: 'response_value',
    groupColumn: 'group'
  },
  ky3p: {
    fieldsTable: ky3pFields,
    responsesTable: ky3pResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    demoAutofillColumn: 'demo_autofill',
    fieldTypeColumn: 'field_type',
    responseValueColumn: 'response_value',
    groupColumn: 'group'
  },
  open_banking: {
    fieldsTable: openBankingFields,
    responsesTable: openBankingResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    demoAutofillColumn: 'demo_autofill',
    fieldTypeColumn: 'field_type',
    responseValueColumn: 'response_value',
    groupColumn: 'group'
  }
};

/**
 * Enhanced demo data generation and application
 */
export async function enhancedDemoAutoFill(taskId: number, formType: FormType, userId?: number) {
  logger.info('Starting enhanced demo auto-fill', { taskId, formType, userId });
  
  // Get task information
  const [task] = await db.select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  
  // Get company information to verify demo status
  const [company] = await db.select()
    .from(companies)
    .where(eq(companies.id, task.company_id));
    
  if (!company || company.is_demo !== true) {
    throw new Error('Auto-fill is only available for demo companies');
  }
  
  // Get user information if available
  let userEmail = '';
  if (userId) {
    try {
      const [user] = await db.select({ email: sql<string>`email` })
        .from(sql`users`)
        .where(sql`id = ${userId}`);
        
      if (user) {
        userEmail = user.email;
      }
    } catch (error) {
      logger.warn('Could not retrieve user email for personalization', { 
        userId, error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Get configuration for the requested form type
  const config = formTypeConfigs[formType];
  if (!config) {
    throw new Error(`Unsupported form type: ${formType}`);
  }
  
  // Get all fields for this form type
  const fields = await db.select()
    .from(config.fieldsTable)
    .orderBy(sql`${config.groupColumn} ASC, "order" ASC`);
    
  logger.info('Retrieved fields for demo auto-fill', { count: fields.length });
  
  // Generate demo data for each field
  const demoData: Record<string, any> = {};
  
  // Store field IDs for reference
  const fieldIds = new Map<string, number>();
  
  // Create a demo value for each field
  for (const field of fields) {
    const fieldKey = field[config.fieldKeyColumn];
    fieldIds.set(fieldKey, field.id);
    
    let demoValue: string;
    
    // Special cases that should always use current user/company data
    if (fieldKey === 'legalEntityName') {
      demoValue = company.name || 'Demo Company';
    }
    else if (fieldKey === 'contactEmail' && userEmail) {
      demoValue = userEmail;
    }
    // Use the demo_autofill value from the database
    else if (field[config.demoAutofillColumn] !== null && field[config.demoAutofillColumn] !== undefined && field[config.demoAutofillColumn] !== '') {
      // Check for template variables that need replacement
      if (typeof field[config.demoAutofillColumn] === 'string' && 
          field[config.demoAutofillColumn].includes('{{COMPANY_NAME}}')) {
        demoValue = field[config.demoAutofillColumn].replace('{{COMPANY_NAME}}', company.name);
      } else {
        demoValue = field[config.demoAutofillColumn];
      }
    } 
    // Generate a fallback value if no demo value is defined
    else {
      const fieldType = field[config.fieldTypeColumn];
      const displayName = field[config.displayNameColumn];
      
      switch (fieldType) {
        case 'TEXT':
        case 'TEXTAREA':
          demoValue = `Demo ${displayName}`;
          break;
          
        case 'DATE':
          const date = new Date();
          date.setFullYear(date.getFullYear() - 2);
          demoValue = date.toISOString().split('T')[0];
          break;
          
        case 'NUMBER':
          demoValue = '10000';
          break;
          
        case 'BOOLEAN':
          demoValue = 'true';
          break;
          
        case 'SELECT':
        case 'MULTI_SELECT':
        case 'MULTIPLE_CHOICE':
          demoValue = 'Option A';
          break;
          
        case 'EMAIL':
          demoValue = `demo@${displayName.toLowerCase().replace(/\s/g, '')}.com`;
          break;
          
        default:
          demoValue = `Demo value for ${displayName}`;
      }
    }
    
    // Ensure we never set undefined or null values
    if (demoValue === undefined || demoValue === null) {
      demoValue = `Demo ${field[config.displayNameColumn] || fieldKey}`;
    }
    
    // Store the demo value
    demoData[fieldKey] = demoValue;
  }
  
  // Get all existing responses for this task
  const responses = await db.select()
    .from(config.responsesTable)
    .where(eq(config.responsesTable.task_id, taskId));
    
  logger.info(`Found ${responses.length} existing responses for task ${taskId}`);
  
  // Create a map of field keys to existing responses for quick lookup
  const responseMap = new Map();
  for (const response of responses) {
    // Find the field key for this response's field_id
    const fieldKey = [...fieldIds.entries()]
      .find(([key, id]) => id === response.field_id)?.[0];
      
    if (fieldKey) {
      responseMap.set(fieldKey, response);
    }
  }
  
  // Counters for operation stats
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  // Track fields with actual values
  const fieldsWithValues = [];
  const fieldsWithEmptyValues = [];
  
  // Get current timestamp for all operations
  const timestamp = new Date();
  
  // Loop through all demo data and update or insert responses
  for (const [fieldKey, value] of Object.entries(demoData)) {
    try {
      const fieldId = fieldIds.get(fieldKey);
      
      if (!fieldId) {
        logger.warn(`Field not found for key: ${fieldKey}`);
        continue;
      }
      
      // Clean and validate the value
      const cleanValue = value === null || value === undefined ? '' : value;
      const isEmpty = cleanValue === '';
      
      // Track fields with values vs empty
      if (isEmpty) {
        fieldsWithEmptyValues.push(fieldKey);
      } else {
        fieldsWithValues.push(fieldKey);
      }
      
      // Determine the status
      const status = isEmpty ? 'EMPTY' : 'FILLED';
      
      // Update or insert response
      const existingResponse = responseMap.get(fieldKey);
      
      if (existingResponse) {
        // Update existing response
        await db.update(config.responsesTable)
          .set({
            [config.responseValueColumn]: cleanValue,
            status: status,
            updated_at: timestamp,
            version: existingResponse.version + 1
          })
          .where(eq(config.responsesTable.id, existingResponse.id));
          
        // Verify update worked correctly
        const [updatedResponse] = await db.select()
          .from(config.responsesTable)
          .where(eq(config.responsesTable.id, existingResponse.id));
          
        if (updatedResponse && updatedResponse[config.responseValueColumn] === cleanValue) {
          updatedCount++;
          logger.info(`Successfully updated field ${fieldKey} with value: ${cleanValue}`);
        } else {
          errorCount++;
          logger.error(`Failed to update field ${fieldKey} - verification failed`);
        }
      } else {
        // Insert new response
        const [insertResult] = await db.insert(config.responsesTable)
          .values({
            task_id: taskId,
            field_id: fieldId,
            [config.responseValueColumn]: cleanValue,
            status: status,
            created_at: timestamp,
            updated_at: timestamp,
            version: 1
          })
          .returning();
          
        if (insertResult && insertResult.id) {
          insertedCount++;
          logger.info(`Successfully inserted field ${fieldKey} with value: ${cleanValue}`);
        } else {
          errorCount++;
          logger.error(`Failed to insert field ${fieldKey}`);
        }
      }
    } catch (error) {
      errorCount++;
      logger.error(`Error processing field ${fieldKey}:`, error);
    }
  }
  
  // Calculate progress based on filled fields
  const totalFields = Object.keys(demoData).length;
  const filledFields = fieldsWithValues.length;
  const progress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  
  // Update task with new progress and status
  const updatedStatus = fieldsWithValues.length > 0 ? 'in_progress' : task.status;
  
  await db.update(tasks)
    .set({
      progress: progress,
      status: updatedStatus,
      updated_at: timestamp
    })
    .where(eq(tasks.id, taskId));
  
  // Broadcast update via WebSocket for real-time UI updates
  broadcastTaskUpdate({
    id: taskId,
    progress: progress,
    status: updatedStatus,
    updated_at: timestamp.toISOString()
  });
  
  logger.info('Demo data application completed', {
    taskId,
    formType,
    inserted: insertedCount,
    updated: updatedCount,
    errors: errorCount,
    progress,
    fieldsWithValues: fieldsWithValues.length,
    fieldsWithEmptyValues: fieldsWithEmptyValues.length,
    valuesRatio: `${fieldsWithValues.length}/${fieldsWithValues.length + fieldsWithEmptyValues.length}`
  });
  
  // Construct the form data object to return to client
  const formData: Record<string, string> = {};
  
  // Get the latest responses for this task
  const finalResponses = await db.select()
    .from(config.responsesTable)
    .where(eq(config.responsesTable.task_id, taskId));
    
  // Build the form data object from responses
  for (const response of finalResponses) {
    const fieldKey = [...fieldIds.entries()]
      .find(([key, id]) => id === response.field_id)?.[0];
      
    if (fieldKey) {
      formData[fieldKey] = response[config.responseValueColumn];
    }
  }
  
  // Also update task.savedFormData
  await db.update(tasks)
    .set({
      savedFormData: formData as any
    })
    .where(eq(tasks.id, taskId));
  
  // Return results
  return {
    success: true,
    message: `Successfully applied demo data to ${insertedCount + updatedCount} fields`,
    fieldCount: insertedCount + updatedCount,
    fieldsWithValues: fieldsWithValues.length,
    fieldsWithEmptyValues: fieldsWithEmptyValues.length,
    formData: formData
  };
}

/**
 * Maps task types to form types
 */
export function getFormTypeFromTaskType(taskType: string): FormType | null {
  // Map task types to form types
  if (taskType === 'kyb' || taskType === 'company_kyb') {
    return 'kyb';
  } else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment' || 
             taskType === 'security' || taskType === 'security_assessment') {
    return 'ky3p';
  } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
    return 'open_banking';
  }
  
  return null;
}
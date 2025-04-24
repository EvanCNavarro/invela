/**
 * Universal Demo Auto-Fill Service
 * 
 * This service provides a unified approach for generating and applying demo data
 * across different form types (KYB, KY3P, Open Banking) while maintaining consistent
 * behavior and eliminating code duplication.
 * 
 * The service uses a configuration-based approach rather than inheritance to handle
 * form-specific variations.
 */

import { db } from '../../db';
import { tasks, companies, kybFields, kybResponses, ky3pFields, ky3pResponses, openBankingFields, openBankingResponses } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { broadcastTaskUpdate } from './websocket';
import { Logger } from '../utils/logger';

const logger = new Logger('UniversalDemoAutoFillService');

/**
 * Supported form types for auto-fill functionality
 */
export type FormType = 'kyb' | 'ky3p' | 'open_banking';

/**
 * Configuration interface for form-specific behavior
 */
interface FormTypeConfig {
  fieldsTable: any;
  responsesTable: any;
  fieldKeyColumn: string;
  displayNameColumn: string;
  fieldTypeColumn: string;
  groupColumn: string;
  requiredColumn: string;
  demoAutofillColumn: string;
  taskTypes: string[];
  responseValueColumn: string;
}

/**
 * Configuration object for different form types
 * This allows us to use the same code with different database tables
 * and handle slight variations between form structures
 */
const formTypeConfigs: Record<FormType, FormTypeConfig> = {
  kyb: {
    fieldsTable: kybFields,
    responsesTable: kybResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    fieldTypeColumn: 'field_type',
    groupColumn: 'group',
    requiredColumn: 'required',
    demoAutofillColumn: 'demo_autofill',
    taskTypes: ['kyb', 'kyb_form', 'onboarding'],
    responseValueColumn: 'response_value',
  },
  ky3p: {
    fieldsTable: ky3pFields,
    responsesTable: ky3pResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    fieldTypeColumn: 'field_type',
    groupColumn: 'group',
    requiredColumn: 'required',
    demoAutofillColumn: 'demo_autofill',
    taskTypes: ['ky3p', 'sp_ky3p_assessment', 'security_assessment'],
    responseValueColumn: 'response_value',
  },
  open_banking: {
    fieldsTable: openBankingFields,
    responsesTable: openBankingResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    fieldTypeColumn: 'field_type', 
    groupColumn: 'group',
    requiredColumn: 'required',
    demoAutofillColumn: 'demo_autofill',
    taskTypes: ['open_banking', 'open_banking_assessment', '1033_assessment'],
    responseValueColumn: 'response_value',
  }
};

/**
 * Determine form type from task type
 * This is used to automatically detect the appropriate form type for a task
 */
export function getFormTypeFromTaskType(taskType: string): FormType | null {
  if (!taskType) return null;
  
  // Normalize task type for comparison
  const normalizedType = taskType.toLowerCase().trim();
  
  // Check each form type configuration for matching task types
  for (const [formType, config] of Object.entries(formTypeConfigs)) {
    if (config.taskTypes.some(type => normalizedType.includes(type.toLowerCase()))) {
      return formType as FormType;
    }
  }
  
  return null;
}

export class UniversalDemoAutoFillService {
  /**
   * Generate demo data for a specific task
   * 
   * @param taskId The ID of the task
   * @param formType The type of form (kyb, ky3p, open_banking)
   * @param userId Optional user ID for customization
   * @returns A record containing field keys mapped to demo values
   */
  async generateDemoData(
    taskId: number,
    formType: FormType,
    userId?: number
  ): Promise<Record<string, any>> {
    logger.info('Generating demo data', { taskId, formType, userId });
    
    // Get task information to verify ownership and demo status
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
    
    for (const field of fields) {
      const fieldKey = field[config.fieldKeyColumn];
      let demoValue: string;
      
      // Special cases that should always use current user/company data
      if (fieldKey === 'legalEntityName') {
        demoValue = company.name || 'Demo Company';
        logger.info(`Using company name for legalEntityName: ${demoValue}`);
      }
      else if (fieldKey === 'contactEmail' && userEmail) {
        demoValue = userEmail;
        logger.info(`Using user email for contactEmail: ${demoValue}`);
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
        logger.info(`Using demo_autofill column value for ${fieldKey}: "${demoValue}"`);
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
        
        logger.info(`Generated fallback demo value for ${fieldKey}: "${demoValue}"`);
      }
      
      // Ensure we never set undefined or null values
      if (demoValue === undefined || demoValue === null) {
        logger.warn(`Fixing null/undefined demo value for ${fieldKey}`);
        demoValue = `Demo ${field[config.displayNameColumn] || fieldKey}`;
      }
      
      // Actually set the value in our demo data object
      demoData[fieldKey] = demoValue;
    }
    
    logger.info('Successfully generated demo data', {
      taskId,
      formType,
      fieldCount: Object.keys(demoData).length
    });
    
    return demoData;
  }
  
  /**
   * Apply generated demo data directly to the database
   * This is a more efficient approach than generating data and then
   * making separate API calls to update each field
   * 
   * @param taskId The ID of the task
   * @param formType The type of form (kyb, ky3p, open_banking)
   * @param userId Optional user ID for tracking who made the changes
   * @returns Object containing operation results
   */
  async applyDemoData(
    taskId: number,
    formType: FormType,
    userId?: number
  ): Promise<{ success: boolean; message: string; fieldCount: number; fieldsWithValues?: number; fieldsWithEmptyValues?: number }> {
    logger.info('Applying demo data directly to database', { taskId, formType, userId });
    
    // Generate the demo data first
    const demoData = await this.generateDemoData(taskId, formType, userId);
    
    // Add sample debugging information for demo data
    const demoKeys = Object.keys(demoData);
    logger.info(`Generated demo data with ${demoKeys.length} fields`, {
      taskId,
      formType,
      sampleKeys: demoKeys.slice(0, 5),
      sampleValues: demoKeys.slice(0, 5).map(key => ({
        key,
        value: demoData[key],
        type: typeof demoData[key]
      }))
    });
    
    // Get configuration for the requested form type
    const config = formTypeConfigs[formType];
    
    // Get task information
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Get all existing responses for this task
    const existingResponses = await db.select()
      .from(config.responsesTable)
      .where(eq(config.responsesTable.task_id, taskId));
      
    logger.info('Found existing responses', { count: existingResponses.length });
    
    // Create a map of field key to response record for quick lookups
    const responseMap = new Map();
    
    // Get field information for field ID mapping
    const fields = await db.select()
      .from(config.fieldsTable);
      
    logger.info(`Found ${fields.length} field definitions for ${formType}`, {
      taskId,
      formType
    });
    
    // Create a map of field key to field record for quick lookups
    const fieldMap = new Map();
    for (const field of fields) {
      fieldMap.set(field[config.fieldKeyColumn], field);
    }
    
    // Map existing responses by field key
    for (const response of existingResponses) {
      const field = fields.find(f => f.id === response.field_id);
      if (field) {
        responseMap.set(field[config.fieldKeyColumn], response);
      }
    }
    
    // Process each field in the demo data
    const timestamp = new Date();
    let updatedCount = 0;
    let insertedCount = 0;
    let errorCount = 0;
    
    // Log all demo data before processing
    logger.info(`Processing ${Object.keys(demoData).length} demo data fields`, {
      taskId,
      fieldKeys: Object.keys(demoData).slice(0, 10),
      someValues: Object.entries(demoData).slice(0, 5).map(([k, v]) => `${k}: ${v}`)
    });
    
    // Track fields with actual values to debug empty fields issue
    const fieldsWithValues = [];
    const fieldsWithEmptyValues = [];
    
    for (const [fieldKey, value] of Object.entries(demoData)) {
      try {
        const field = fieldMap.get(fieldKey);
        
        if (!field) {
          logger.warn(`Field not found for key: ${fieldKey}`);
          continue;
        }
        
        // Debug log field value
        logger.info(`Processing field ${fieldKey}:`, { 
          value,
          valueType: typeof value,
          isEmpty: value === null || value === undefined || value === '',
          fieldId: field.id
        });
        
        // Track fields with values vs empty
        if (value === null || value === undefined || value === '') {
          fieldsWithEmptyValues.push(fieldKey);
        } else {
          fieldsWithValues.push(fieldKey);
        }
        
        // Make sure we're working with clean values
        // Convert null/undefined to empty string to avoid DB errors
        const cleanValue = value === null || value === undefined ? '' : value;
        
        // Check if response already exists
        const existingResponse = responseMap.get(fieldKey);
        
        if (existingResponse) {
          // Update existing response - ensure status is properly set
          // Fixed status determination to ensure non-empty values are correctly marked as FILLED
          const status = (cleanValue !== null && cleanValue !== undefined && cleanValue !== '') ? 'FILLED' : 'EMPTY';
          
          logger.info(`Updating existing response for ${fieldKey}:`, {
            value: cleanValue,
            valueType: typeof cleanValue,
            valueLength: typeof cleanValue === 'string' ? cleanValue.length : 'N/A',
            status,
            responseId: existingResponse.id
          });
          
          await db.update(config.responsesTable)
            .set({
              [config.responseValueColumn]: cleanValue,
              status: status,
              updated_at: timestamp,
              version: existingResponse.version + 1
            })
            .where(eq(config.responsesTable.id, existingResponse.id));
          
          // Verify the update worked
          const [updatedResponse] = await db.select()
            .from(config.responsesTable)
            .where(eq(config.responsesTable.id, existingResponse.id));
            
          if (updatedResponse) {
            logger.info(`Verified update for ${fieldKey}:`, {
              expectedValue: cleanValue,
              actualValue: updatedResponse[config.responseValueColumn],
              matched: updatedResponse[config.responseValueColumn] === cleanValue
            });
          }
          
          updatedCount++;
        } else {
          // Create new response - ensure status is properly set
          // Fixed status determination to ensure non-empty values are correctly marked as FILLED
          const status = (cleanValue !== null && cleanValue !== undefined && cleanValue !== '') ? 'FILLED' : 'EMPTY';
          
          logger.info(`Creating new response for ${fieldKey}:`, {
            value: cleanValue,
            valueType: typeof cleanValue,
            valueLength: typeof cleanValue === 'string' ? cleanValue.length : 'N/A',
            status,
            fieldId: field.id
          });
          
          await db.insert(config.responsesTable)
            .values({
              task_id: taskId,
              field_id: field.id,
              [config.responseValueColumn]: cleanValue,
              status: status,
              created_at: timestamp,
              updated_at: timestamp,
              version: 1
            });
            
          insertedCount++;
        }
      } catch (error) {
        logger.error(`Error processing field ${fieldKey}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        errorCount++;
      }
    }
    
    // Update task progress in database
    const progress = Math.min(Math.round((insertedCount + updatedCount) / fields.length * 100), 100);
    
    await db.update(tasks)
      .set({
        progress: progress,
        updated_at: timestamp
      })
      .where(eq(tasks.id, taskId));
      
    // Broadcast update via WebSocket for real-time UI updates
    broadcastTaskUpdate({
      id: taskId,
      progress: progress,
      status: task.status,
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
    
    // Check if we actually have any fields with values
    if (fieldsWithValues.length === 0 && fieldsWithEmptyValues.length > 0) {
      logger.error('Critical error: All demo values were empty!', {
        taskId,
        formType,
        emptyFieldSample: fieldsWithEmptyValues.slice(0, 5)
      });
    }
    
    return {
      success: true,
      message: `Successfully applied demo data to ${insertedCount + updatedCount} fields`,
      fieldCount: insertedCount + updatedCount,
      fieldsWithValues: fieldsWithValues.length,
      fieldsWithEmptyValues: fieldsWithEmptyValues.length
    };
  }
  
  /**
   * Convenience method that takes a task ID, determines its form type,
   * and calls the appropriate demo auto-fill method
   * 
   * @param taskId The ID of the task
   * @param userId Optional user ID for tracking changes
   * @returns The result of the auto-fill operation
   */
  async autoFillTask(
    taskId: number,
    userId?: number
  ): Promise<{ success: boolean; message: string; fieldCount: number; fieldsWithValues?: number; fieldsWithEmptyValues?: number }> {
    // First, get the task to determine its type
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Determine form type from task type
    const formType = getFormTypeFromTaskType(task.task_type);
    
    if (!formType) {
      throw new Error(`Could not determine form type for task type: ${task.task_type}`);
    }
    
    logger.info('Auto-detected form type from task', { taskId, taskType: task.task_type, formType });
    
    // Apply demo data for the detected form type
    return this.applyDemoData(taskId, formType, userId);
  }
}

// Export a singleton instance for use throughout the application
export const universalDemoAutoFillService = new UniversalDemoAutoFillService();
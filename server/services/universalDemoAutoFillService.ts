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
import { broadcastTaskUpdate } from '../utils/unified-websocket';
import { logger } from '../utils/logger';
import { determineStatusFromProgress } from '../utils/progress';
import { FieldStatus } from '../utils/field-status';

// Add namespace context to logs
const logContext = { service: 'UniversalDemoAutoFillService' };

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
      
      // Special cases that should always use current user/company data
      if (fieldKey === 'legalEntityName') {
        demoData[fieldKey] = company.name;
      }
      else if (fieldKey === 'contactEmail' && userEmail) {
        demoData[fieldKey] = userEmail;
      }
      // Use the demo_autofill value from the database
      else if (field[config.demoAutofillColumn] !== null && field[config.demoAutofillColumn] !== undefined) {
        // Check for template variables that need replacement
        if (typeof field[config.demoAutofillColumn] === 'string' && 
            field[config.demoAutofillColumn].includes('{{COMPANY_NAME}}')) {
          demoData[fieldKey] = field[config.demoAutofillColumn].replace('{{COMPANY_NAME}}', company.name);
        } else {
          demoData[fieldKey] = field[config.demoAutofillColumn];
        }
      } 
      // Generate a fallback value if no demo value is defined
      else {
        const fieldType = field[config.fieldTypeColumn];
        const displayName = field[config.displayNameColumn];
        
        switch (fieldType) {
          case 'TEXT':
          case 'TEXTAREA':
            demoData[fieldKey] = `Demo ${displayName}`;
            break;
            
          case 'DATE':
            const date = new Date();
            date.setFullYear(date.getFullYear() - 2);
            demoData[fieldKey] = date.toISOString().split('T')[0];
            break;
            
          case 'NUMBER':
            demoData[fieldKey] = '10000';
            break;
            
          case 'BOOLEAN':
            demoData[fieldKey] = 'true';
            break;
            
          case 'SELECT':
          case 'MULTI_SELECT':
          case 'MULTIPLE_CHOICE':
            demoData[fieldKey] = 'Option A';
            break;
            
          case 'EMAIL':
            demoData[fieldKey] = `demo@${displayName.toLowerCase().replace(/\s/g, '')}.com`;
            break;
            
          default:
            demoData[fieldKey] = `Demo value for ${displayName}`;
        }
      }
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
  ): Promise<{ success: boolean; message: string; fieldCount: number }> {
    logger.info('Applying demo data directly to database', { taskId, formType, userId });
    
    // Get configuration for the requested form type
    const config = formTypeConfigs[formType];
    
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
    
    // Get all fields for this form type including demo_autofill values
    const fields = await db.select()
      .from(config.fieldsTable)
      .orderBy(sql`${config.groupColumn} ASC, "order" ASC`);
      
    logger.info('Retrieved fields for demo auto-fill', { count: fields.length });
    
    // Get all existing responses for this task
    const existingResponses = await db.select()
      .from(config.responsesTable)
      .where(eq(config.responsesTable.task_id, taskId));
      
    logger.info('Found existing responses', { count: existingResponses.length });
    
    // Create a map of field key to response record for quick lookups
    const responseMap = new Map();
    
    // Map existing responses by field key
    for (const response of existingResponses) {
      const field = fields.find(f => f.id === response.field_id);
      if (field) {
        responseMap.set(field[config.fieldKeyColumn], response);
      }
    }
    
    // Create a map of field key to field record for quick lookups
    const fieldMap = new Map();
    for (const field of fields) {
      fieldMap.set(field[config.fieldKeyColumn], field);
    }
    
    // Process each field and apply demo values
    const timestamp = new Date();
    let updatedCount = 0;
    let insertedCount = 0;
    let errorCount = 0;
    
    // First check if we have any demo values actually defined
    const fieldsWithDemoValues = fields.filter(field => 
      field[config.demoAutofillColumn] !== null && 
      field[config.demoAutofillColumn] !== undefined &&
      field[config.demoAutofillColumn] !== '');
      
    logger.info('Found fields with demo values', { 
      count: fieldsWithDemoValues.length,
      sampleFields: fieldsWithDemoValues.slice(0, 3).map(f => ({
        key: f[config.fieldKeyColumn],
        demoValue: f[config.demoAutofillColumn]
      }))
    });
    
    if (fieldsWithDemoValues.length === 0) {
      logger.warn('No demo values found in database for this form type', { formType });
    }
    
    // Apply demo values field by field
    for (const field of fields) {
      try {
        const fieldKey = field[config.fieldKeyColumn];
        let demoValue = field[config.demoAutofillColumn];
        
        // Special cases that should always use current user/company data
        if (fieldKey === 'legalEntityName') {
          demoValue = company.name;
        }
        else if (fieldKey === 'contactEmail' && userEmail) {
          demoValue = userEmail;
        }
        // Replace template variables
        else if (typeof demoValue === 'string' && demoValue.includes('{{COMPANY_NAME}}')) {
          demoValue = demoValue.replace('{{COMPANY_NAME}}', company.name);
        }
        
        // Skip if no demo value
        if (demoValue === null || demoValue === undefined) {
          logger.debug(`No demo value for field ${fieldKey}, skipping`);
          continue;
        }
        
        // Debug info
        logger.info(`Setting demo value for field "${fieldKey}"`, { 
          value: demoValue, 
          fieldId: field.id
        });
        
        // Check if response already exists
        const existingResponse = responseMap.get(fieldKey);
        
        if (existingResponse) {
          // Update existing response
          await db.update(config.responsesTable)
            .set({
              [config.responseValueColumn]: demoValue,
              status: demoValue && String(demoValue).trim().length > 0 ? FieldStatus.COMPLETE : FieldStatus.EMPTY,
              updated_at: timestamp,
              version: existingResponse.version + 1
            })
            .where(eq(config.responsesTable.id, existingResponse.id));
            
          logger.debug(`Updated field ${fieldKey} with demo value`, { 
            oldValue: existingResponse[config.responseValueColumn],
            newValue: demoValue
          });
          
          updatedCount++;
        } else {
          // Create new response
          await db.insert(config.responsesTable)
            .values({
              task_id: taskId,
              field_id: field.id,
              [config.responseValueColumn]: demoValue,
              status: demoValue && String(demoValue).trim().length > 0 ? FieldStatus.COMPLETE : FieldStatus.EMPTY,
              created_at: timestamp,
              updated_at: timestamp,
              version: 1
            });
            
          logger.debug(`Created new response for field ${fieldKey} with demo value`, {
            value: demoValue
          });
          
          insertedCount++;
        }
      } catch (error) {
        logger.error(`Error processing field ${field[config.fieldKeyColumn]}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        errorCount++;
      }
    }
    
    // Update task progress in database
    const progress = Math.min(Math.round((insertedCount + updatedCount) / fields.length * 100), 100);
    
    // Determine the appropriate status based on the new progress value
    // This fixes the issue where demo auto-fill would update progress but not status
    const newStatus = determineStatusFromProgress(
      progress,
      task.status as any, // Cast to match the expected type
      [], // No form responses needed for simple progress update
      task.metadata || {}
    );
    
    logger.info('Demo auto-fill progress calculation result', {
      taskId,
      fieldCount: fields.length,
      completedCount: insertedCount + updatedCount,
      calculatedProgress: progress,
      oldStatus: task.status,
      newStatus
    });
    
    // Update both progress and status in the database
    await db.update(tasks)
      .set({
        progress: progress,
        status: newStatus,
        // Update the status_changed_at timestamp if status is changing
        ...(task.status !== newStatus ? { status_changed_at: timestamp } : {}),
        updated_at: timestamp
      })
      .where(eq(tasks.id, taskId));
      
    // Broadcast update via WebSocket for real-time UI updates
    // Now sending the new status instead of the original one
    broadcastTaskUpdate({
      id: taskId,
      progress: progress,
      status: newStatus,
      // Include metadata with the timestamp for consistent behavior
      metadata: {
        updated_at: timestamp.toISOString()
      }
    });
    
    logger.info('Demo data application completed', {
      taskId,
      formType,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount,
      progress
    });
    
    return {
      success: true,
      message: `Successfully applied demo data to ${insertedCount + updatedCount} fields`,
      fieldCount: insertedCount + updatedCount
    };
  }
  
  /**
   * Get demo data for a task without applying it to the database
   * This is used by the standardized GET API endpoint
   * 
   * @param taskId The ID of the task
   * @param formType The type of form
   * @param userId Optional user ID for personalization
   * @returns The demo data and metadata
   */
  async getDemoData(
    taskId: number,
    formType: FormType,
    userId?: number
  ): Promise<{
    formData: Record<string, any>;
    progress: number;
    status: string;
  }> {
    logger.info('Getting demo data for task', { taskId, formType, userId });
    
    // Get task information
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Generate the demo data
    const demoData = await this.generateDemoData(taskId, formType, userId);
    
    // Calculate approximate progress
    const progress = 100; // We consider demo data as 100% complete
    
    return {
      formData: demoData,
      progress,
      status: 'demo',
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
  ): Promise<{ success: boolean; message: string; fieldCount: number }> {
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
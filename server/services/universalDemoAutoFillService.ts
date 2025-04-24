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

import { db } from '@db';
import { 
  tasks, 
  companies, 
  kybFields, 
  kybResponses,
  ky3pFields,
  ky3pResponses,
  openBankingFields,
  openBankingResponses
} from '@db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { broadcastTaskUpdate } from './websocket';

// Create logger instance for this service
const logger = new Logger('UniversalDemoAutoFill');

// Define the form type string literals for type safety
export type FormType = 'kyb' | 'ky3p' | 'open_banking';

// Define the configuration interface for form-specific settings
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
const formConfigs: Record<FormType, FormTypeConfig> = {
  'kyb': {
    fieldsTable: kybFields,
    responsesTable: kybResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    fieldTypeColumn: 'field_type',
    groupColumn: 'group',
    requiredColumn: 'required',
    demoAutofillColumn: 'demo_autofill',
    taskTypes: ['company_kyb', 'kyb', 'kyb_assessment'],
    responseValueColumn: 'response_value'
  },
  'ky3p': {
    fieldsTable: ky3pFields,
    responsesTable: ky3pResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name', // Could also be 'label' depending on schema
    fieldTypeColumn: 'field_type',
    groupColumn: 'group', // Could also be 'section' in older schemas
    requiredColumn: 'is_required', // This differs from KYB's 'required'
    demoAutofillColumn: 'demo_autofill',
    taskTypes: ['sp_ky3p_assessment', 'ky3p', 'security_assessment'],
    responseValueColumn: 'response_value'
  },
  'open_banking': {
    fieldsTable: openBankingFields,
    responsesTable: openBankingResponses,
    fieldKeyColumn: 'field_key',
    displayNameColumn: 'display_name',
    fieldTypeColumn: 'field_type',
    groupColumn: 'group',
    requiredColumn: 'required',
    demoAutofillColumn: 'demo_autofill',
    taskTypes: ['open_banking', 'open_banking_survey'],
    responseValueColumn: 'response_value'
  }
};

// Helper function to determine form type based on task type
export function getFormTypeFromTaskType(taskType: string): FormType | null {
  for (const [formType, config] of Object.entries(formConfigs)) {
    if (config.taskTypes.includes(taskType)) {
      return formType as FormType;
    }
  }
  
  logger.warn('Unknown task type for demo auto-fill', { taskType });
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
    
    // Get the configuration for this form type
    const config = formConfigs[formType];
    if (!config) {
      throw new Error(`Invalid form type: ${formType}`);
    }
    
    try {
      // Get task details
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        logger.error('Task not found for demo auto-fill', { taskId });
        throw new Error('Task not found');
      }
      
      // Get company details for personalization
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, task.company_id));
      
      if (!company) {
        logger.error('Company not found for task', { taskId, companyId: task.company_id });
        throw new Error('Company not found');
      }
      
      // Safety check: ensure this is a demo company
      if (company.is_demo !== true) {
        logger.error('Company is not marked as demo', { 
          companyId: company.id,
          name: company.name,
          isDemo: company.is_demo
        });
        throw new Error('Auto-fill is only available for demo companies');
      }
      
      // Get all fields with their demo_autofill values
      const fields = await db.select()
        .from(config.fieldsTable)
        .orderBy(asc(config.fieldsTable.order));
      
      logger.info('Fetched fields for demo auto-fill', {
        fieldCount: fields.length,
        taskId
      });
      
      // Create demo data for each field
      const demoData: Record<string, any> = {};
      
      // Get current user information for personalized values (if provided)
      let userEmail = '';
      if (userId) {
        // This would get the user email if needed for personalization
        // Left as placeholder for now
      }
      
      // Process each field to generate demo data
      for (const field of fields) {
        const fieldKey = field[config.fieldKeyColumn];
        const fieldType = field[config.fieldTypeColumn];
        const displayName = field[config.displayNameColumn];
        const demoValue = field[config.demoAutofillColumn];
        
        // Special cases that should always use current company/user data 
        if (fieldKey === 'legalEntityName') {
          // Always use the actual company name
          demoData[fieldKey] = company.name;
          logger.debug(`Using company name for legalEntityName: ${company.name}`);
        }
        else if (fieldKey === 'contactEmail' && userEmail) {
          // Use current user's email if available
          demoData[fieldKey] = userEmail;
          logger.debug(`Using current user email for contactEmail: ${userEmail}`);
        }
        // Use the demo_autofill value from the database if available
        else if (demoValue !== null && demoValue !== undefined) {
          // For fields that might contain company name references
          if (typeof demoValue === 'string' && demoValue.includes('{{COMPANY_NAME}}')) {
            demoData[fieldKey] = demoValue.replace('{{COMPANY_NAME}}', company.name);
            logger.debug(`Replaced template in ${fieldKey}: ${demoData[fieldKey]}`);
          } else {
            // Use the predefined value from the database
            demoData[fieldKey] = demoValue;
            logger.debug(`Used database value for ${fieldKey}: ${demoData[fieldKey]}`);
          }
        } 
        // Generate fallback values based on field type if no demo value defined
        else {
          logger.debug(`No demo_autofill value found for ${fieldKey}`);
          
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
          logger.debug(`Generated fallback value for ${fieldKey}: ${demoData[fieldKey]}`);
        }
      }
      
      logger.info('Generated demo data for auto-fill', {
        fieldCount: Object.keys(demoData).length,
        taskId,
        formType
      });
      
      return demoData;
    } catch (error) {
      logger.error('Error generating demo data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        taskId,
        formType
      });
      throw error;
    }
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
  ): Promise<{
    success: boolean;
    fieldCount: number;
    message: string;
  }> {
    logger.info('Applying demo data directly to database', { taskId, formType, userId });
    
    // Get the configuration for this form type
    const config = formConfigs[formType];
    if (!config) {
      throw new Error(`Invalid form type: ${formType}`);
    }
    
    try {
      // First generate the demo data
      const demoData = await this.generateDemoData(taskId, formType, userId);
      
      // Get the fields to ensure we have the correct field IDs
      const fields = await db.select()
        .from(config.fieldsTable);
      
      // Create a mapping of field_key to field_id for easier lookup
      const fieldKeyToId: Record<string, number> = {};
      fields.forEach(field => {
        fieldKeyToId[field[config.fieldKeyColumn]] = field.id;
      });
      
      // Get existing responses to determine if we need to update or insert
      const existingResponses = await db.select()
        .from(config.responsesTable)
        .where(eq(config.responsesTable.task_id, taskId));
      
      // Create a mapping of field_id to existing response
      const fieldIdToResponse: Record<number, any> = {};
      existingResponses.forEach(response => {
        fieldIdToResponse[response.field_id] = response;
      });
      
      // Current timestamp for all operations
      const timestamp = new Date();
      let updatedCount = 0;
      let insertedCount = 0;
      
      // Process each demo data field
      for (const [fieldKey, responseValue] of Object.entries(demoData)) {
        const fieldId = fieldKeyToId[fieldKey];
        
        // Skip if field ID not found
        if (!fieldId) {
          logger.warn(`Field key "${fieldKey}" not found in database`, { taskId });
          continue;
        }
        
        const existingResponse = fieldIdToResponse[fieldId];
        
        if (existingResponse) {
          // Update existing response
          await db.update(config.responsesTable)
            .set({
              [config.responseValueColumn]: responseValue,
              status: 'complete',
              version: existingResponse.version + 1,
              updated_at: timestamp
            })
            .where(eq(config.responsesTable.id, existingResponse.id));
          
          updatedCount++;
        } else {
          // Insert new response
          await db.insert(config.responsesTable)
            .values({
              task_id: taskId,
              field_id: fieldId,
              [config.responseValueColumn]: responseValue,
              status: 'complete',
              version: 1,
              created_at: timestamp,
              updated_at: timestamp
            });
          
          insertedCount++;
        }
      }
      
      // Send a WebSocket broadcast to notify clients of the change
      try {
        await broadcastTaskUpdate(taskId);
        logger.info('Broadcast task update for demo auto-fill', { taskId });
      } catch (broadcastError) {
        logger.warn('Failed to broadcast task update', { 
          error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error',
          taskId
        });
      }
      
      // Update task status to 'in_progress' if it was 'not_started'
      const [taskStatus] = await db.select({ status: tasks.status })
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (taskStatus && taskStatus.status === 'not_started') {
        await db.update(tasks)
          .set({
            status: 'in_progress',
            updated_at: timestamp
          })
          .where(eq(tasks.id, taskId));
        
        logger.info('Updated task status to in_progress', { taskId });
      }
      
      logger.info('Successfully applied demo data', {
        taskId,
        formType,
        fields: Object.keys(demoData).length,
        updated: updatedCount,
        inserted: insertedCount
      });
      
      return {
        success: true,
        fieldCount: updatedCount + insertedCount,
        message: `Successfully auto-filled ${updatedCount + insertedCount} fields (${updatedCount} updated, ${insertedCount} inserted)`
      };
    } catch (error) {
      logger.error('Error applying demo data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        taskId,
        formType
      });
      
      throw error;
    }
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
  ): Promise<{
    success: boolean;
    formType?: FormType;
    fieldCount?: number;
    message: string;
  }> {
    try {
      // Get task details to determine form type
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        logger.error('Task not found', { taskId });
        return { success: false, message: 'Task not found' };
      }
      
      // Determine form type from task type
      const formType = getFormTypeFromTaskType(task.task_type);
      
      if (!formType) {
        logger.error('Unknown form type for task', { taskId, taskType: task.task_type });
        return { success: false, message: `Unknown form type for task type: ${task.task_type}` };
      }
      
      // Apply the demo data
      const result = await this.applyDemoData(taskId, formType, userId);
      
      return {
        success: result.success,
        formType,
        fieldCount: result.fieldCount,
        message: result.message
      };
    } catch (error) {
      logger.error('Error in autoFillTask', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        taskId
      });
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export a singleton instance
export const universalDemoAutoFillService = new UniversalDemoAutoFillService();
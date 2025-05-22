/**
 * Unified Demo Auto-Fill Service
 * 
 * This service provides a standardized approach to auto-filling forms with demo data
 * across all form types (KYB, KY3P, Open Banking).
 * 
 * It uses consistent patterns for handling responses and updating progress,
 * eliminating the inconsistencies between different form types.
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
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { ResponseStatus } from '../utils/status-constants';
import { updateTaskProgress } from '../utils/task-update';

// Form types supported by this service
export type FormType = 'kyb' | 'ky3p' | 'open_banking';

// Configuration for each form type
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

// Form type configurations
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
    taskTypes: ['kyb', 'kyb_form', 'onboarding', 'company_kyb'],
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
 * Get form type from task type
 * 
 * @param taskType Task type string
 * @returns Normalized form type or null if not supported
 */
export function getFormTypeFromTaskType(taskType: string): FormType | null {
  if (!taskType) return null;
  
  // Normalize task type for comparison
  const normalizedType = taskType.toLowerCase().trim();
  
  // Find matching form type
  for (const [formType, config] of Object.entries(formTypeConfigs)) {
    if (config.taskTypes.some(type => normalizedType.includes(type.toLowerCase()))) {
      return formType as FormType;
    }
  }
  
  return null;
}

/**
 * Demo Auto-Fill result interface
 */
interface DemoAutoFillResult {
  success: boolean;
  message: string;
  fieldCount: number;
  progress?: number;
  status?: string;
  formData?: Record<string, any>;
}

/**
 * Unified Demo Auto-Fill Service class
 * 
 * This class provides methods for generating and applying demo data
 * across all form types using a consistent approach.
 */
class UnifiedDemoAutoFillService {
  /**
   * Get demo data for a task
   * 
   * @param taskId Task ID
   * @param formType Form type
   * @param userId Optional user ID for personalization
   * @returns Demo data with form state
   */
  async getDemoData(
    taskId: number,
    formType: FormType,
    userId?: number
  ): Promise<{
    success: boolean;
    message: string;
    formData: Record<string, any>;
    progress: number;
    status: string;
  }> {
    // Validate task and check demo status
    const { task, company } = await this.validateTaskForDemoAutoFill(taskId);
    
    // Get configuration for the form type
    const config = formTypeConfigs[formType];
    if (!config) {
      throw new Error(`Unsupported form type: ${formType}`);
    }
    
    // Get user info for personalization
    const userEmail = await this.getUserEmail(userId);
    
    // Get all fields for this form type
    const fields = await db.select()
      .from(config.fieldsTable)
      .orderBy(sql`${config.groupColumn} ASC, "order" ASC`);
      
    logger.info('Retrieved fields for demo auto-fill', { count: fields.length });
    
    // Generate demo data
    const formData: Record<string, any> = {};
    const demoResponses: Array<{
      fieldKey: string;
      fieldId: number;
      value: any;
    }> = [];
    
    for (const field of fields) {
      const fieldKey = field[config.fieldKeyColumn];
      let demoValue = field[config.demoAutofillColumn];
      
      // Special case handling
      if (fieldKey === 'legalEntityName') {
        demoValue = company.name;
      }
      else if (fieldKey === 'contactEmail' && userEmail) {
        demoValue = userEmail;
      }
      else if (typeof demoValue === 'string' && demoValue.includes('{{COMPANY_NAME}}')) {
        demoValue = demoValue.replace('{{COMPANY_NAME}}', company.name);
      } 
      // Generate fallback value if no demo value is defined
      else if (demoValue === null || demoValue === undefined) {
        const fieldType = field[config.fieldTypeColumn];
        const displayName = field[config.displayNameColumn];
        
        demoValue = this.generateFallbackDemoValue(fieldType, displayName);
      }
      
      formData[fieldKey] = demoValue;
      demoResponses.push({
        fieldKey,
        fieldId: field.id,
        value: demoValue
      });
    }
    
    // Get existing responses to calculate current status
    const existingResponses = await db.select()
      .from(config.responsesTable)
      .where(eq(config.responsesTable.task_id, taskId));
      
    // Calculate progress as completed / total
    const completeCount = existingResponses.filter(
      r => r.status.toLowerCase() === ResponseStatus.COMPLETE.toLowerCase()
    ).length;
    
    const progress = fields.length > 0 
      ? Math.min(Math.round((completeCount / fields.length) * 100), 100)
      : 0;
    
    return {
      success: true,
      message: 'Demo data generated successfully',
      formData,
      progress,
      status: task.status
    };
  }
  
  /**
   * Apply demo data to a task
   * 
   * @param taskId Task ID
   * @param formType Form type
   * @param userId Optional user ID for personalization
   * @returns Result of the operation
   */
  async applyDemoData(
    taskId: number,
    formType: FormType,
    userId?: number
  ): Promise<DemoAutoFillResult> {
    try {
      // Set up logging context
      const logContext = {
        taskId,
        formType,
        userId,
        transactionId: `demo-autofill-${Date.now()}`
      };
      
      logger.info('Applying demo data to task', logContext);
      
      // Validate task and check demo status
      const { task, company } = await this.validateTaskForDemoAutoFill(taskId);
      
      // Get configuration for the form type
      const config = formTypeConfigs[formType];
      if (!config) {
        throw new Error(`Unsupported form type: ${formType}`);
      }
      
      // Get user info for personalization
      const userEmail = await this.getUserEmail(userId);
      
      // Get all fields and existing responses
      const fields = await db.select()
        .from(config.fieldsTable)
        .orderBy(sql`${config.groupColumn} ASC, "order" ASC`);
        
      const existingResponses = await db.select()
        .from(config.responsesTable)
        .where(eq(config.responsesTable.task_id, taskId));
        
      // Create maps for efficient lookups
      const responseMap = new Map();
      for (const response of existingResponses) {
        responseMap.set(response.field_id, response);
      }
      
      // Process each field
      const timestamp = new Date();
      let updatedCount = 0;
      let insertedCount = 0;
      let errorCount = 0;
      
      for (const field of fields) {
        try {
          const fieldId = field.id;
          const fieldKey = field[config.fieldKeyColumn];
          
          // Generate demo value
          let demoValue = field[config.demoAutofillColumn];
          
          // Special case handling
          if (fieldKey === 'legalEntityName') {
            demoValue = company.name;
          }
          else if (fieldKey === 'contactEmail' && userEmail) {
            demoValue = userEmail;
          }
          else if (typeof demoValue === 'string' && demoValue.includes('{{COMPANY_NAME}}')) {
            demoValue = demoValue.replace('{{COMPANY_NAME}}', company.name);
          }
          
          // Skip if no demo value
          if (demoValue === null || demoValue === undefined) {
            const fieldType = field[config.fieldTypeColumn];
            const displayName = field[config.displayNameColumn];
            demoValue = this.generateFallbackDemoValue(fieldType, displayName);
          }
          
          // IMPORTANT: Use consistent response status handling
          // Always use lowercase status values for comparisons,
          // but store in the case expected by the database
          const responseStatus = demoValue && String(demoValue).trim().length > 0 
            ? ResponseStatus.COMPLETE 
            : ResponseStatus.EMPTY;
          
          // Check if response exists
          const existingResponse = responseMap.get(fieldId);
          
          if (existingResponse) {
            // Update existing response
            await db.update(config.responsesTable)
              .set({
                [config.responseValueColumn]: demoValue,
                field_key: fieldKey, // Ensure field_key is always set/updated
                status: responseStatus,
                updated_at: timestamp,
                version: existingResponse.version + 1
              })
              .where(eq(config.responsesTable.id, existingResponse.id));
              
            updatedCount++;
          } else {
            // Create new response
            await db.insert(config.responsesTable)
              .values({
                task_id: taskId,
                field_id: fieldId,
                field_key: fieldKey, // Include field_key for all response types for consistency
                [config.responseValueColumn]: demoValue,
                status: responseStatus,
                created_at: timestamp,
                updated_at: timestamp,
                version: 1
              });
              
            insertedCount++;
          }
        } catch (fieldError) {
          logger.error(`Error processing field ${field[config.fieldKeyColumn]}`, {
            taskId,
            formType,
            fieldId: field.id,
            error: fieldError instanceof Error ? fieldError.message : String(fieldError)
          });
          
          errorCount++;
        }
      }
      
      // Use the appropriate task update function based on form type
      // For KY3P tasks, we need to use the fixed implementation to ensure progress persists
      let updateResult;
      
      if (formType === 'ky3p') {
        // Import the fixed version for KY3P tasks
        const { updateKy3pProgressFixed } = await import('../utils/ky3p-progress.utils');
        
        logger.info('Using KY3P fixed progress update for demo auto-fill', {
          ...logContext,
          formType,
          taskType: task.task_type
        });
        
        // Use the fixed KY3P progress update function
        const fixedResult = await updateKy3pProgressFixed(taskId, {
          debug: true,
          metadata: {
            lastProgressUpdate: new Date().toISOString(),
            updatedVia: 'demo-autofill'
          },
          forceUpdate: true
        });
        
        // Convert to standard format
        updateResult = {
          id: taskId,
          progress: fixedResult.progress || 0,
          status: 'ready_for_submission',
          task_type: task.task_type
        };
      } else {
        // Use standard update for other form types
        updateResult = await updateTaskProgress(taskId, {
          recalculate: true,
          debug: true
        });
      }
      
      logger.info('Successfully applied demo data and updated task', {
        ...logContext,
        insertedCount,
        updatedCount,
        errorCount,
        progress: updateResult.progress,
        status: updateResult.status
      });
      
      return {
        success: true,
        message: 'Demo data applied successfully',
        fieldCount: insertedCount + updatedCount,
        progress: updateResult.progress,
        status: updateResult.status
      };
    } catch (error) {
      logger.error(`Error applying demo data to task ${taskId}`, {
        taskId,
        formType,
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  }
  
  /**
   * Validate that a task is eligible for demo auto-fill
   * 
   * @param taskId Task ID
   * @returns Task and company objects if valid
   * @throws Error if task is not eligible
   */
  private async validateTaskForDemoAutoFill(taskId: number): Promise<{ task: any; company: any }> {
    // Get task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Get company
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));
      
    if (!company) {
      throw new Error(`Company not found: ${task.company_id}`);
    }
    
    // Check if company is a demo company
    if (!company.is_demo) {
      throw new Error('Auto-fill is only available for demo companies');
    }
    
    return { task, company };
  }
  
  /**
   * Get user email for personalization
   * 
   * @param userId User ID
   * @returns User email or empty string
   */
  private async getUserEmail(userId?: number): Promise<string> {
    if (!userId) return '';
    
    try {
      const [user] = await db.select({ email: sql<string>`email` })
        .from(sql`users`)
        .where(sql`id = ${userId}`);
        
      return user?.email || '';
    } catch (error) {
      logger.warn('Could not retrieve user email for personalization', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return '';
    }
  }
  
  /**
   * Generate fallback demo value when none is defined
   * 
   * @param fieldType Type of field
   * @param displayName Display name of field
   * @returns Generated demo value
   */
  private generateFallbackDemoValue(fieldType: string, displayName: string): any {
    switch (fieldType?.toUpperCase()) {
      case 'TEXT':
      case 'TEXTAREA':
        return `Demo ${displayName}`;
        
      case 'DATE':
        const date = new Date();
        date.setFullYear(date.getFullYear() - 1); // Use previous year
        return date.toISOString().split('T')[0];
        
      case 'NUMBER':
        return '10000';
        
      case 'BOOLEAN':
        return 'true';
        
      case 'SELECT':
      case 'MULTI_SELECT':
      case 'MULTIPLE_CHOICE':
        return 'Option A';
        
      case 'EMAIL':
        return `demo@${displayName.toLowerCase().replace(/\s/g, '')}.com`;
        
      default:
        return `Demo value for ${displayName}`;
    }
  }
}

// Export a singleton instance
export const unifiedDemoAutoFillService = new UnifiedDemoAutoFillService();

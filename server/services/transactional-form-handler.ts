/**
 * Transactional Form Submission Handler
 * 
 * This service provides transactional processing of form submissions to ensure
 * atomicity across all related operations:
 * 1. Saving form responses
 * 2. Generating files
 * 3. Updating task metadata and status
 * 4. Unlocking features/tabs
 * 
 * Using database transactions ensures that either all operations succeed or
 * all operations fail together, maintaining data consistency and preventing
 * situations where a form appears to be submitted but files are missing.
 */

import { db } from '@db';
import { 
  tasks, 
  companies, 
  kybResponses, 
  ky3pResponses, 
  openBankingResponses 
} from '@db/schema';
import { eq } from 'drizzle-orm';
import createLogger from '../utils/logger';
import { withTransaction } from './transaction-manager';
import { fileCreationService } from './fileCreation';
import { UnifiedTabService } from './unified-tab-service';
import { broadcastTaskUpdate, broadcastFileVaultUpdate } from './websocket';

// Create a logger for this service
const logger = createLogger('TransactionalFormHandler');

// Interface for form submission options
export interface FormSubmissionOptions {
  taskId: number;
  formData: Record<string, any>;
  userId: number;
  companyId: number;
  formType: string;
}

// Interface for form submission results
export interface FormSubmissionResult {
  success: boolean;
  message?: string;
  error?: string;
  fileId?: number;
  fileName?: string;
  unlockedTabs?: string[];
}

/**
 * Process a form submission with guaranteed atomicity
 * 
 * This function ensures that all operations related to form submission are executed
 * within a single database transaction, providing all-or-nothing guarantees.
 * 
 * @param options Form submission options
 * @returns Promise resolving to the submission result
 */
export async function processFormSubmission(options: FormSubmissionOptions): Promise<FormSubmissionResult> {
  const { taskId, formData, userId, companyId, formType } = options;
  
  logger.info(`Processing form submission with transactional guarantees`, {
    taskId,
    userId,
    companyId,
    formType,
    dataKeysCount: Object.keys(formData).length
  });
  
  try {
    // Execute all operations in a transaction
    const result = await withTransaction(async (tx) => {
      // 1. Validate task exists and belongs to the correct company
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      if (task.company_id !== companyId) {
        throw new Error(`Task ${taskId} does not belong to company ${companyId}`);
      }
      
      // 2. Get company information for file creation
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
      });
      
      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }
      
      // 3. Process form responses based on form type
      await saveFormResponses(tx, taskId, formData, formType);
      
      // 4. Generate file from form data
      const standardizedTaskType = mapFormTypeToStandardType(formType);
      
      const fileResult = await fileCreationService.createTaskFile(
        userId,
        companyId,
        formData,
        {
          taskType: standardizedTaskType,
          taskId,
          companyName: company.name,
          additionalData: {
            submissionTime: new Date().toISOString(),
            originalFormType: formType
          }
        }
      );
      
      if (!fileResult.success) {
        throw new Error(`File creation failed: ${fileResult.error?.message || 'Unknown error'}`);
      }
      
      // 5. Update task status and metadata with file information
      const currentMetadata = task.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        fileId: fileResult.fileId,
        fileName: fileResult.fileName,
        fileGenerated: true,
        fileGeneratedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        submittedBy: userId,
        status: 'submitted',
        statusFlow: [...(currentMetadata.statusFlow || []), 'submitted']
      };
      
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          metadata: updatedMetadata,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      // 6. Determine which tabs to unlock
      const unlockedTabs = determineTabsToUnlock(formType);
      
      // Return the complete result object
      return {
        success: true,
        fileId: fileResult.fileId,
        fileName: fileResult.fileName,
        unlockedTabs
      };
    });
    
    // Post-transaction operations (non-critical operations that don't need to be in the transaction)
    
    // 1. Unlock tabs if needed (already in the database, just notifying the UI)
    if (result.unlockedTabs && result.unlockedTabs.length > 0) {
      try {
        await UnifiedTabService.unlockTabs(companyId, result.unlockedTabs);
        logger.info(`Unlocked tabs for company ${companyId}`, {
          tabs: result.unlockedTabs
        });
      } catch (error) {
        // Log but don't fail the submission - tabs are already unlocked in the database
        logger.warn(`Error notifying clients about tab changes`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // 2. Send WebSocket notifications
    try {
      // Notify about task update
      broadcastTaskUpdate({
        id: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          fileId: result.fileId,
          fileName: result.fileName,
          lastUpdated: new Date().toISOString()
        }
      });
      
      // Notify about file creation
      broadcastFileVaultUpdate(companyId, result.fileId, 'added');
      
      // Send a refresh event as well to ensure all clients update
      setTimeout(() => {
        broadcastFileVaultUpdate(companyId, undefined, 'refresh');
      }, 500);
      
      logger.info(`Sent WebSocket notifications for form submission`, {
        taskId,
        fileId: result.fileId
      });
    } catch (error) {
      // Log but don't fail the submission - these are just notifications
      logger.warn(`Error sending WebSocket notifications`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Return the final successful result
    return {
      success: true,
      message: 'Form submitted successfully',
      fileId: result.fileId,
      fileName: result.fileName,
      unlockedTabs: result.unlockedTabs
    };
  } catch (error) {
    // Handle transaction errors
    logger.error(`Form submission failed`, {
      taskId,
      userId,
      companyId,
      formType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      message: 'Form submission failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Save form responses to the appropriate database table
 * 
 * @param tx Transaction object for database operations
 * @param taskId Task ID
 * @param formData Form data to save
 * @param formType Type of form being processed
 */
async function saveFormResponses(
  tx: any,
  taskId: number,
  formData: Record<string, any>,
  formType: string
): Promise<void> {
  if (formType === 'kyb' || formType === 'company_kyb') {
    await saveKybResponses(tx, taskId, formData);
  } else if (formType === 'ky3p' || formType === 'sp_ky3p_assessment' || formType === 'security_assessment') {
    await saveKy3pResponses(tx, taskId, formData);
  } else if (formType === 'open_banking' || formType === 'open_banking_survey') {
    await saveOpenBankingResponses(tx, taskId, formData);
  } else {
    // For other form types, we might just store the data in task metadata
    logger.info(`No specific response table for form type ${formType}, using task metadata`);
  }
}

/**
 * Save KYB responses to the database
 */
async function saveKybResponses(
  tx: any,
  taskId: number,
  formData: Record<string, any>
): Promise<void> {
  // Get all KYB fields to match with responses
  const fields = await db.query.kybFields.findMany();
  const fieldMap = new Map(fields.map((field: any) => [field.field_key, field]));
  
  // Prepare response objects for bulk insert
  const responses = [];
  
  for (const [key, value] of Object.entries(formData)) {
    const field = fieldMap.get(key);
    if (field) {
      responses.push({
        task_id: taskId,
        field_id: field.id,
        response_value: typeof value === 'string' ? value : JSON.stringify(value),
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  
  // Perform bulk insert if there are responses
  if (responses.length > 0) {
    await db.insert(kybResponses).values(responses);
    logger.info(`Saved ${responses.length} KYB responses for task ${taskId}`);
  }
}

/**
 * Save KY3P responses to the database
 */
async function saveKy3pResponses(
  tx: any,
  taskId: number,
  formData: Record<string, any>
): Promise<void> {
  // Get all KY3P fields to match with responses
  const fields = await db.query.ky3pFields.findMany();
  const fieldMap = new Map(fields.map((field: any) => [field.field_key, field]));
  
  // Prepare response objects for bulk insert
  const responses = [];
  
  for (const [key, value] of Object.entries(formData)) {
    const field = fieldMap.get(key);
    if (field) {
      responses.push({
        task_id: taskId,
        field_id: field.id,
        response_value: typeof value === 'string' ? value : JSON.stringify(value),
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  
  // Perform bulk insert if there are responses
  if (responses.length > 0) {
    await db.insert(ky3pResponses).values(responses);
    logger.info(`Saved ${responses.length} KY3P responses for task ${taskId}`);
  }
}

/**
 * Save Open Banking responses to the database
 */
async function saveOpenBankingResponses(
  tx: any,
  taskId: number,
  formData: Record<string, any>
): Promise<void> {
  // Get all Open Banking fields to match with responses
  const fields = await db.query.openBankingFields.findMany();
  const fieldMap = new Map(fields.map((field: any) => [field.field_key, field]));
  
  // Prepare response objects for bulk insert
  const responses = [];
  
  for (const [key, value] of Object.entries(formData)) {
    const field = fieldMap.get(key);
    if (field) {
      responses.push({
        task_id: taskId,
        field_id: field.id,
        response_value: typeof value === 'string' ? value : JSON.stringify(value),
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  
  // Perform bulk insert if there are responses
  if (responses.length > 0) {
    await db.insert(openBankingResponses).values(responses);
    logger.info(`Saved ${responses.length} Open Banking responses for task ${taskId}`);
  }
}

/**
 * Map client form type to standardized schema-compatible task type
 */
function mapFormTypeToStandardType(formType: string): string {
  if (formType === 'kyb' || formType === 'company_kyb') {
    return 'company_kyb';
  } else if (formType === 'ky3p' || formType === 'sp_ky3p_assessment' || formType === 'security_assessment') {
    return 'sp_ky3p_assessment';
  } else if (formType === 'open_banking' || formType === 'open_banking_survey') {
    return 'open_banking_survey';
  } else if (formType === 'card' || formType === 'company_card') {
    return 'company_card';
  }
  
  // Default fallback
  return formType;
}

/**
 * Determine which tabs should be unlocked based on form type
 */
function determineTabsToUnlock(formType: string): string[] {
  if (formType === 'kyb' || formType === 'company_kyb') {
    return ['file-vault'];
  } else if (formType === 'ky3p' || formType === 'sp_ky3p_assessment' || formType === 'security_assessment') {
    // KY3P forms don't unlock any tabs
    return [];
  } else if (formType === 'open_banking' || formType === 'open_banking_survey') {
    return ['dashboard', 'insights'];
  } else if (formType === 'card' || formType === 'company_card') {
    return ['dashboard'];
  }
  
  // Default to an empty array for unknown form types
  return [];
}

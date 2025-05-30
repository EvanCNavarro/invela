/**
 * Universal Form File Generator
 * 
 * This service provides a comprehensive solution for generating missing form files
 * for any task type. It addresses the root cause of the issue where files are not
 * properly created or linked during form submission.
 * 
 * Supported task types:
 * - KYB forms (company_kyb)
 * - KY3P forms (sp_ky3p_assessment)
 * - Open Banking forms (open_banking_survey)
 * - Card Industry forms (company_card)
 */

import { db } from '@db';
import { 
  files, 
  kybResponses, 
  kybFields,
  ky3pResponses,
  ky3pFields, 
  openBankingResponses,
  openBankingFields,
  tasks, 
  companies 
} from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { broadcastTaskUpdate } from "../utils/unified-websocket";
import * as fileCreationService from '../services/fileCreation';
import { logger } from '../utils/logger';

// Add namespace context to logs
const logContext = { service: 'FixMissingFile' };

async function generateMissingFileForTask(taskId: number) {
  try {
    // 1. Get the task info
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.error(`Task ${taskId} not found`);
      return { success: false, error: 'Task not found' };
    }
    
    // Get company info - ensure we're using numeric ID
    const companyId = task.company_id || 0;
    if (companyId <= 0) {
      logger.error(`Task ${taskId} has invalid company_id: ${companyId}`);
      return { success: false, error: 'Invalid company ID' };
    }

    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      logger.error(`Company ${task.company_id} not found for task ${taskId}`);
      return { success: false, error: 'Company not found' };
    }
    
    // Determine task type
    const taskType = task.task_type;
    logger.info(`Fixing missing file for task ${taskId} of type ${taskType}`);
    
    // Initialize variables
    let formData: Record<string, any> = {};
    let standardizedTaskType = '';
    let responseCount = 0;
    
    // Process based on task type
    if (taskType === 'company_kyb' || taskType === 'kyb') {
      // KYB form processing
      standardizedTaskType = 'company_kyb';
      
      // Get all the KYB fields
      const allFields = await db.select()
        .from(kybFields)
        .orderBy(kybFields.order);
      
      // Get all responses for this task
      const responses = await db.select()
        .from(kybResponses)
        .where(eq(kybResponses.task_id, taskId));
      
      responseCount = responses.length;
      
      // Map field definitions to response data
      const fieldMap = new Map(allFields.map(field => [field.id, field]));
      
      // Build form data object from responses
      for (const response of responses) {
        const field = fieldMap.get(response.field_id);
        if (field && field.field_key) {
          formData[field.field_key] = response.response_value;
        }
      }
    } else if (taskType === 'sp_ky3p_assessment' || taskType === 'ky3p' || taskType === 'security_assessment' || taskType === 'security') {
      // KY3P form processing
      standardizedTaskType = 'sp_ky3p_assessment';
      
      // Get all the KY3P fields
      const allFields = await db.select()
        .from(ky3pFields)
        .orderBy(ky3pFields.id);
      
      // Get all responses for this task
      const responses = await db.select()
        .from(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      responseCount = responses.length;
      
      // Map field definitions to response data
      const fieldMap = new Map(allFields.map(field => [field.id, field]));
      
      // Build form data object from responses
      for (const response of responses) {
        const field = fieldMap.get(response.field_id);
        if (field && field.field_key) {
          formData[field.field_key] = response.response_value;
        }
      }
    } else if (taskType === 'open_banking_survey' || taskType === 'open_banking') {
      // Open Banking form processing
      standardizedTaskType = 'open_banking_survey';
      
      // Get all the Open Banking fields
      const allFields = await db.select()
        .from(openBankingFields)
        .orderBy(openBankingFields.id);
      
      // Get all responses for this task
      const responses = await db.select()
        .from(openBankingResponses)
        .where(eq(openBankingResponses.task_id, taskId));
      
      responseCount = responses.length;
      
      // Map field definitions to response data
      const fieldMap = new Map(allFields.map(field => [field.id, field]));
      
      // Build form data object from responses
      for (const response of responses) {
        const field = fieldMap.get(response.field_id);
        if (field && field.field_key) {
          formData[field.field_key] = response.response_value;
        }
      }
    } else if (taskType === 'company_card' || taskType === 'card') {
      // Card Industry Questionnaire form processing
      standardizedTaskType = 'company_card';
      
      // For card forms, we may need more custom handling
      // Just use the task metadata as the form data
      formData = task.metadata || {};
      responseCount = Object.keys(formData).length;
    } else {
      logger.error(`Unsupported task type: ${taskType} for task ${taskId}`);
      return { success: false, error: `Unsupported task type: ${taskType}` };
    }
    
    logger.info(`Generated form data from ${responseCount} responses for task ${taskId} (${taskType})`, {
      fieldCount: Object.keys(formData).length
    });
    
    // Create a file for this form data
    const userId = task.assigned_to || task.created_by || 0; // Use assigned user or fallback to creator
    const fileResult = await fileCreationService.createTaskFile(
      taskId,
      standardizedTaskType,
      formData,
      companyId,
      userId
    );
    
    if (!fileResult.success) {
      logger.error(`Failed to create file for task ${taskId}`, {
        error: fileResult.error
      });
      return fileResult;
    }
    
    // 5. Link the file to the task using our unified file tracking service
    try {
      const { linkFileToTask } = require('../services/unified-file-tracking');
      await linkFileToTask(
        taskId,
        fileResult.fileId, 
        fileResult.fileName,
        companyId,
        standardizedTaskType
      );
      
      logger.info(`File linked to task using unified file tracking service:`, {
        taskId,
        fileId: fileResult.fileId,
        fileName: fileResult.fileName
      });
    } catch (linkError) {
      // If unified service fails, fall back to the old method
      logger.warn(`Could not use unified file tracking service, using fallback:`, {
        error: linkError instanceof Error ? linkError.message : 'Unknown error'
      });
      
      // Fallback: Update task metadata directly
      const currentMetadata = task.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        fileId: fileResult.fileId,
        fileGenerated: true,
        fileGeneratedAt: new Date().toISOString(),
        fileName: fileResult.fileName,
        submission: {
          timestamp: new Date().toISOString(),
          status: 'complete'
        }
      };
      
      await db.update(tasks)
        .set({
          metadata: updatedMetadata
        })
        .where(eq(tasks.id, taskId));
      
      // 6. Broadcast file vault update using standardized WebSocketService
      WebSocketService.broadcast('file_vault_update', {
        companyId,
        fileId: fileResult.fileId,
        action: 'added'
      });
      setTimeout(() => {
        WebSocketService.broadcast('file_vault_update', {
          companyId,
          action: 'refresh'
        });
      }, 500);
    }
    
    logger.info(`Successfully fixed missing file for task ${taskId}`, {
      fileId: fileResult.fileId,
      fileName: fileResult.fileName
    });
    
    // Ensure we're returning a consistent type
    return {
      success: true,
      fileId: fileResult.fileId,
      fileName: fileResult.fileName
    } as const;
  } catch (error) {
    logger.error(`Error fixing missing file for task ${taskId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fileId: undefined,
      fileName: undefined
    };
  }
}

// Define the return type for better type safety
export type FileFixResult = {
  success: boolean;
  fileId?: number;
  fileName?: string;
  error?: string;
};

// Export the function for direct use in the router
export { generateMissingFileForTask };

/**
 * File Creation Service
 * 
 * This module provides functions for creating files from form data.
 * It standardizes file creation across different form types.
 * 
 * @module fileCreation
 */

import getLogger from '../utils/logger';
// Import the database connection
let db: { query: (sql: string, params?: any[]) => Promise<any> };

try {
  db = require('../db').db;
} catch (error) {
  console.error('Database module not found, creating a mock implementation');
  // Create a mock implementation for development/testing
  db = {
    query: async () => ({ rows: [{ id: 123 }] })
  };
}

const logger = getLogger('FileCreation');

/**
 * Create a file from form data
 * 
 * This function creates a file in the database based on form data.
 * It handles different form types and generates appropriate file content.
 * 
 * @param taskId The ID of the task associated with the file
 * @param formType The type of form (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param formData The form data to use for file creation
 * @param companyId The ID of the company the file belongs to
 * @returns The result of the file creation operation
 */
export async function createTaskFile(
  userId: number,
  companyId: number,
  formData: Record<string, any>,
  options: {
    taskType: string;
    taskId: number;
    companyName?: string;
    originalType?: string;
    additionalData?: Record<string, any>;
  }
): Promise<{ success: boolean; fileId?: number; fileName?: string; error?: string }> {
  try {
    // Forward to our implementation of createFileFromFormData for backward compatibility
    const { taskId, taskType: formType } = options;
    const result = await createFileFromFormData(taskId, formType, formData, companyId);
    
    // Generate standard file name
    const fileName = `${formType}_Form_Task_${taskId}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    
    // If file creation was successful, link it to the task with the unified tracking service
    if (result.success && result.fileId) {
      try {
        // Dynamically import the unified file tracking service
        // This avoids circular dependency issues
        const { linkFileToTask } = require('./unified-file-tracking');
        
        await linkFileToTask(
          taskId,
          result.fileId,
          fileName,
          companyId,
          formType
        );
        
        logger.info(`File ${result.fileId} linked to task ${taskId} successfully`);
      } catch (linkError) {
        // Log the error but don't fail the overall operation
        logger.error(`Error linking file to task via unified tracking service:`, {
          error: linkError instanceof Error ? linkError.message : 'Unknown error',
          stack: linkError instanceof Error ? linkError.stack : undefined,
          fileId: result.fileId,
          taskId
        });
      }
    }
    
    // Add fileName to the result for the caller
    return {
      ...result,
      fileName: fileName
    };
  } catch (error) {
    logger.error(`Error in createTaskFile:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      options
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createFileFromFormData(
  taskId: number,
  formType: string,
  formData: Record<string, any>,
  companyId: number
): Promise<{ success: boolean; fileId?: number; error?: string }> {
  try {
    // Log the start of file creation
    logger.info(`Creating file for task ${taskId}`, {
      taskId,
      formType,
      companyId
    });
    
    // Generate file name based on form type
    const fileName = generateFileName(formType, taskId);
    
    // Determine file type based on form type
    const fileType = determineFileType(formType);
    
    // Create file metadata
    const metadata = {
      taskId,
      formType,
      created: new Date().toISOString(),
      source: 'form_submission'
    };
    
    // Insert file record into database
    const result = await db.query(
      `INSERT INTO files 
       (name, status, company_id, type, metadata, task_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [fileName, 'active', companyId, fileType, metadata, taskId]
    );
    
    // Get the ID of the newly created file
    const fileId = result.rows[0].id;
    
    // Log successful file creation
    logger.info(`Successfully created file for task ${taskId}`, {
      taskId,
      formType,
      companyId,
      fileId
    });
    
    // Return success result with file ID
    return {
      success: true,
      fileId
    };
  } catch (error: any) {
    // Log error
    logger.error(`Error creating file for task ${taskId}`, {
      taskId,
      formType,
      companyId,
      error: error.message
    });
    
    // Return error result
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate a file name based on form type and task ID
 */
function generateFileName(formType: string, taskId: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  switch (formType) {
    case 'kyb':
    case 'company_kyb':
      return `KYB_Form_Task_${taskId}_${timestamp}.pdf`;
    case 'sp_ky3p_assessment':
      return `KY3P_Assessment_Task_${taskId}_${timestamp}.pdf`;
    case 'open_banking':
    case 'open_banking_survey':
      return `Open_Banking_Survey_Task_${taskId}_${timestamp}.pdf`;
    default:
      return `Form_Submission_Task_${taskId}_${timestamp}.pdf`;
  }
}

/**
 * Determine file type based on form type
 */
function determineFileType(formType: string): string {
  switch (formType) {
    case 'kyb':
    case 'company_kyb':
      return 'KYB_FORM';
    case 'sp_ky3p_assessment':
      return 'KY3P_ASSESSMENT';
    case 'open_banking':
    case 'open_banking_survey':
      return 'OPEN_BANKING_SURVEY';
    default:
      return 'OTHER';
  }
}

export default {
  createFileFromFormData,
  createTaskFile
};

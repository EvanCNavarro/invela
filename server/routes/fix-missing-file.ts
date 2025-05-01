/**
 * Fix Missing KYB File Script
 * 
 * This emergency script directly generates the missing file for task 709 (KYB form)
 * by fetching the form responses from the database and creating a proper file record.
 */

import { db } from '@db';
import { files, kybResponses, kybFields, tasks, companies } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { broadcastFileVaultUpdate } from '../services/websocket';
import { fileCreationService } from '../services/fileCreation';
import { Logger } from '../utils/logger';

const logger = new Logger('FixMissingFile');

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
    
    // 2. Get all the KYB fields
    const allFields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);
    
    // 3. Get all responses for this task
    const responses = await db.select()
      .from(kybResponses)
      .where(eq(kybResponses.task_id, taskId));
    
    // Map field definitions to response data
    const fieldMap = new Map(allFields.map(field => [field.id, field]));
    
    // Build form data object from responses
    const formData: Record<string, any> = {};
    for (const response of responses) {
      const field = fieldMap.get(response.field_id);
      if (field && field.field_key) {
        formData[field.field_key] = response.response_value;
      }
    }
    
    logger.info(`Generated form data from ${responses.length} responses for task ${taskId}`, {
      fieldCount: Object.keys(formData).length
    });
    
    // 4. Create a file for this form data
    const userId = task.assigned_to || task.created_by || 0; // Use assigned user or fallback to creator
    const fileResult = await fileCreationService.createTaskFile(
      userId, 
      companyId,
      formData,
      {
        taskType: 'kyb',
        taskId: taskId,
        companyName: company.name,
        originalType: 'kyb',
        additionalData: {
          submissionTime: new Date().toISOString()
        }
      }
    );
    
    if (!fileResult.success) {
      logger.error(`Failed to create file for task ${taskId}`, {
        error: fileResult.error
      });
      return fileResult;
    }
    
    // 5. Update task metadata with file information
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
    
    // 6. Broadcast file vault update
    broadcastFileVaultUpdate(companyId, fileResult.fileId, 'added');
    setTimeout(() => {
      broadcastFileVaultUpdate(companyId, undefined, 'refresh');
    }, 500);
    
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

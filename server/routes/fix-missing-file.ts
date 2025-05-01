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
    
    // Get company info
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));
    
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
    const fileResult = await fileCreationService.createTaskFile(
      task.assigned_to || task.created_by, // Use assigned user or fallback to creator
      task.company_id,
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
    broadcastFileVaultUpdate(task.company_id, fileResult.fileId, 'added');
    setTimeout(() => {
      broadcastFileVaultUpdate(task.company_id, undefined, 'refresh');
    }, 500);
    
    logger.info(`Successfully fixed missing file for task ${taskId}`, {
      fileId: fileResult.fileId,
      fileName: fileResult.fileName
    });
    
    return {
      success: true,
      fileId: fileResult.fileId,
      fileName: fileResult.fileName
    };
  } catch (error) {
    logger.error(`Error fixing missing file for task ${taskId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export the function for direct use in the router
export { generateMissingFileForTask };

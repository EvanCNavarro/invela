/**
 * Direct Fix for Missing Files - TypeScript Version
 * 
 * This script directly invokes the fixed file creation service to generate missing
 * files for tasks that have been submitted but don't show up in the file vault.
 * 
 * Usage: tsx fix-missing-file-direct.ts <taskId>
 */

import * as fileCreation from './server/services/fileCreation.fixed';
import { db } from './db/index';
import { tasks, files, kybResponses, ky3pResponses, openBankingResponses } from './db/schema';
import { eq } from 'drizzle-orm';

type FileFixResult = {
  success: boolean;
  fileId?: string | number;
  fileName?: string;
  error?: string;
};

async function fixMissingFileForTask(taskId: string | number): Promise<FileFixResult> {
  if (!taskId || isNaN(parseInt(String(taskId)))) {
    console.error('Error: Please provide a valid task ID');
    console.log('Usage: tsx fix-missing-file-direct.ts <taskId>');
    return { success: false, error: 'Invalid task ID' };
  }
  
  try {
    const taskIdNum = parseInt(String(taskId));
    console.log(`Checking task ${taskIdNum}...`);
    
    // 1. Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskIdNum)
    });
    
    if (!task) {
      console.error(`Task ${taskIdNum} not found in database`);
      return { success: false, error: 'Task not found' };
    }
    
    console.log(`Found task: ${task.title} (${task.task_type})`);
    console.log(`Status: ${task.status}, Progress: ${task.progress}%`);
    
    // 2. Check if task is submitted
    if (task.status !== 'submitted') {
      console.error(`Task ${taskIdNum} is not submitted (status: ${task.status})`);
      return { success: false, error: 'Task not submitted' };
    }
    
    // 3. Check if file already exists
    const metadata = task.metadata as Record<string, any> || {};
    const existingFileId = metadata?.fileId;
    if (existingFileId) {
      const file = await db.query.files.findFirst({
        where: eq(files.id, existingFileId)
      });
      
      if (file) {
        console.log(`File already exists: ${file.name} (ID: ${file.id})`);
        console.log('No fix needed. Task already has a valid file.');
        return { success: true, fileId: file.id };
      } else {
        console.log(`Task has fileId ${existingFileId} but file doesn't exist in database`);
        console.log('Will generate a new file...');
      }
    }
    
    // 4. Get form data from responses table
    let formData: Record<string, any> = {};
    let taskType = task.task_type;
    let standardizedTaskType = taskType;
    let companyId = task.company_id;
    let userId = task.assigned_to || task.created_by;
    
    // Map task type to standardized form for file creation
    if (taskType === 'kyb') standardizedTaskType = 'company_kyb';
    if (taskType === 'ky3p') standardizedTaskType = 'sp_ky3p_assessment';
    if (taskType === 'open_banking') standardizedTaskType = 'open_banking_survey';
    
    console.log(`Task type: ${taskType} (standardized: ${standardizedTaskType})`);
    console.log(`Company ID: ${companyId}, User ID: ${userId}`);
    
    // 5. For KYB tasks
    if (taskType === 'kyb' || taskType === 'company_kyb') {
      const kybResponsesResult = await db.query.kybResponses.findMany({
        where: eq(kybResponses.task_id, taskIdNum)
      });
      
      kybResponsesResult.forEach(response => {
        formData[response.field_key] = response.response_value;
      });
      
      console.log(`Found ${kybResponsesResult.length} KYB responses`);
    }
    
    // 6. For KY3P tasks
    else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment') {
      const ky3pResponsesResult = await db.query.ky3pResponses.findMany({
        where: eq(ky3pResponses.task_id, taskIdNum)
      });
      
      ky3pResponsesResult.forEach(response => {
        formData[response.field_id] = response.response_value;
      });
      
      console.log(`Found ${ky3pResponsesResult.length} KY3P responses`);
    }
    
    // 7. For Open Banking tasks
    else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
      const obResponsesResult = await db.query.openBankingResponses.findMany({
        where: eq(openBankingResponses.task_id, taskIdNum)
      });
      
      obResponsesResult.forEach(response => {
        formData[response.field_id] = response.response_value;
      });
      
      console.log(`Found ${obResponsesResult.length} Open Banking responses`);
    }
    
    // 8. For Card Industry tasks
    else if (taskType === 'card' || taskType === 'company_card') {
      // Fetch card industry responses if the table exists
      // For now, let's just handle the other form types
      console.log('Card industry forms are not currently supported');
    }
    
    // 9. Check if we have form data
    if (Object.keys(formData).length === 0) {
      console.error(`No form data found for task ${taskIdNum}`);
      return { success: false, error: 'No form data found' };
    }
    
    console.log(`Form data found with ${Object.keys(formData).length} fields`);
    
    // 10. Create the file
    console.log('Creating file...');
    const fileResult = await fileCreation.createTaskFile(
      taskIdNum,
      standardizedTaskType,
      formData,
      companyId,
      userId
    );
    
    if (!fileResult.success) {
      console.error(`Failed to create file: ${fileResult.error}`);
      return { success: false, error: fileResult.error };
    }
    
    console.log(`File created successfully: ${fileResult.fileName} (ID: ${fileResult.fileId})`);
    
    // 11. Update task metadata with file reference
    const currentMetadata = task.metadata as Record<string, any> || {};
    const updatedMetadata = {
      ...currentMetadata,
      fileId: fileResult.fileId,
      fileGenerated: true,
      fileGeneratedAt: new Date().toISOString(),
      fileName: fileResult.fileName
    };
    
    await db.update(tasks)
      .set({
        metadata: updatedMetadata
      })
      .where(eq(tasks.id, taskIdNum));
    
    console.log('Task metadata updated with file reference');
    console.log(`\n✅ File creation complete! Check File Vault for: ${fileResult.fileName}`);
    
    return { 
      success: true, 
      fileId: fileResult.fileId,
      fileName: fileResult.fileName 
    };
  } catch (error: any) {
    console.error('Unexpected error during file creation:');
    console.error(error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// Run the script if invoked directly
// Import.meta.url and Node.js condition checking
if (import.meta.url === `file://${process.argv[1]}`) {
  const taskId = process.argv[2];
  fixMissingFileForTask(taskId);
}

export { fixMissingFileForTask };

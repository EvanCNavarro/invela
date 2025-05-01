/**
 * Direct Fix for Missing Files
 * 
 * This script directly invokes the fixed file creation service to generate missing
 * files for tasks that have been submitted but don't show up in the file vault.
 * 
 * Usage: node fix-missing-file-direct.cjs <taskId>
 */

const fileCreation = require('./server/services/fileCreation.fixed.js');
const { db } = require('./db');
const { tasks, files } = require('./db/schema');
const { eq } = require('drizzle-orm');

async function fixMissingFileForTask(taskId) {
  if (!taskId || isNaN(parseInt(taskId))) {
    console.error('Error: Please provide a valid task ID');
    console.log('Usage: node fix-missing-file-direct.cjs <taskId>');
    return { success: false, error: 'Invalid task ID' };
  }
  
  try {
    taskId = parseInt(taskId);
    console.log(`Checking task ${taskId}...`);
    
    // 1. Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      console.error(`Task ${taskId} not found in database`);
      return { success: false, error: 'Task not found' };
    }
    
    console.log(`Found task: ${task.title} (${task.task_type})`);
    console.log(`Status: ${task.status}, Progress: ${task.progress}%`);
    
    // 2. Check if task is submitted
    if (task.status !== 'submitted') {
      console.error(`Task ${taskId} is not submitted (status: ${task.status})`);
      return { success: false, error: 'Task not submitted' };
    }
    
    // 3. Check if file already exists
    const existingFileId = task.metadata?.fileId;
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
    let formData = {};
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
      const kybResponses = await db.query.kyb_responses.findMany({
        where: eq(db.kyb_responses.task_id, taskId)
      });
      
      kybResponses.forEach(response => {
        formData[response.field_key] = response.response_value;
      });
      
      console.log(`Found ${kybResponses.length} KYB responses`);
    }
    
    // 6. For KY3P tasks
    else if (taskType === 'ky3p' || taskType === 'sp_ky3p_assessment') {
      const ky3pResponses = await db.query.ky3p_responses.findMany({
        where: eq(db.ky3p_responses.task_id, taskId)
      });
      
      ky3pResponses.forEach(response => {
        formData[response.field_id] = response.response_value;
      });
      
      console.log(`Found ${ky3pResponses.length} KY3P responses`);
    }
    
    // 7. For Open Banking tasks
    else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
      const obResponses = await db.query.open_banking_responses.findMany({
        where: eq(db.open_banking_responses.task_id, taskId)
      });
      
      obResponses.forEach(response => {
        formData[response.field_id] = response.response_value;
      });
      
      console.log(`Found ${obResponses.length} Open Banking responses`);
    }
    
    // 8. For Card Industry tasks
    else if (taskType === 'card' || taskType === 'company_card') {
      const cardResponses = await db.query.card_responses.findMany({
        where: eq(db.card_responses.task_id, taskId)
      });
      
      cardResponses.forEach(response => {
        formData[response.field_id] = response.response_value;
      });
      
      console.log(`Found ${cardResponses.length} Card Industry responses`);
    }
    
    // 9. Check if we have form data
    if (Object.keys(formData).length === 0) {
      console.error(`No form data found for task ${taskId}`);
      return { success: false, error: 'No form data found' };
    }
    
    console.log(`Form data found with ${Object.keys(formData).length} fields`);
    
    // 10. Create the file
    console.log('Creating file...');
    const fileResult = await fileCreation.createTaskFile(
      taskId,
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
    const currentMetadata = task.metadata || {};
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
      .where(eq(tasks.id, taskId));
    
    console.log('Task metadata updated with file reference');
    console.log(`\n✅ File creation complete! Check File Vault for: ${fileResult.fileName}`);
    
    return { 
      success: true, 
      fileId: fileResult.fileId,
      fileName: fileResult.fileName 
    };
  } catch (error) {
    console.error('Unexpected error during file creation:');
    console.error(error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// Run the script if invoked directly
if (require.main === module) {
  const taskId = process.argv[2];
  fixMissingFileForTask(taskId);
}

module.exports = { fixMissingFileForTask };

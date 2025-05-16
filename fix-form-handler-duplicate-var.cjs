/**
 * Fix for Form Submission Handler - Duplicate Variable Declaration
 * 
 * This script fixes the duplicate declaration of 'now' variable in the form-submission-handler.ts file.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'services', 'form-submission-handler.ts');
console.log(`Reading file at: ${filePath}`);

// Read the file
try {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('Successfully read the file');
  
  // Replace the problematic section with a corrected version
  const updateSection = `
    // Update task status and progress atomically to prevent inconsistencies
    logger.info('Ensuring atomic update of task status and progress', { taskId, formType });
    
    // Always ensure both status and progress are updated in the same operation
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        completion_date: now,
        updated_at: now,
        metadata: updatedMetadata
      })
      .where(eq(tasks.id, taskId));
    
    // Verify the update was successful
    const [verifiedTask] = await db.select({
      id: tasks.id,
      status: tasks.status,
      progress: tasks.progress,
      metadata: tasks.metadata,
      task_type: tasks.task_type
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
    // Double-check if task was correctly updated
    if (verifiedTask.status !== 'submitted' || verifiedTask.progress !== 100) {
      logger.warn('Task not properly updated after submission, applying fix', {
        taskId,
        formType,
        currentStatus: verifiedTask.status,
        currentProgress: verifiedTask.progress
      });
      
      // One more attempt if the update failed
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          completion_date: now,
          updated_at: now
        })
        .where(eq(tasks.id, taskId));
        
      logger.info('Applied direct fix for task status/progress', { taskId, formType });
    }
  `;

  // Create a regex that will match from the first status update to the 3. Broadcast comment
  const regex = /logger\.info\('Updating task status to submitted'.*?\/\/ 3\. Broadcast the task update via WebSocket/s;
  
  // Replace the entire problematic section
  content = content.replace(regex, `logger.info('Updating task status to submitted', { taskId, formType });
    
    ${updateSection}
    
    // 3. Broadcast the task update via WebSocket`);
  
  // Write the fixed content back
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully fixed duplicate variable declaration in form submission handler');
  
} catch (error) {
  console.error('Error fixing form submission handler:', error);
  process.exit(1);
}
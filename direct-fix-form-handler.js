/**
 * Direct Fix for Form Submission Handler
 * 
 * This script directly modifies the form-submission-handler.ts file to fix
 * the status/progress consistency issues.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'services', 'form-submission-handler.ts');
console.log(`Reading file at: ${filePath}`);

// Read the file
try {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('Successfully read the file');
  
  // First fix: Remove any problematic code that looks like an import in the middle of a function
  content = content.replace(
    /\s+\/\/\s*Use the atomic task update service to ensure status and progress are updated together\s+import.*?from\s+['"]\.\/atomic-task-update['"];?/g,
    '\n    // Ensure status and progress are updated together atomically'
  );

  // Second fix: Replace the double status update section with a single atomic update
  const updateSection = `
    // Update task status and progress atomically
    logger.info('Ensuring atomic update of task status and progress', { taskId, formType });
    
    // Set completion date explicitly for submitted tasks
    const now = new Date();
    
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
    
    // Log success
    logger.info('Task updated to submitted with 100% progress', { taskId, formType });
  `;

  // Find the start of the problematic section
  const startMarker = `logger.info('Enhanced task status update with submission protection', {`;
  const endMarker = `// 3. Broadcast the task update via WebSocket with enhanced submission metadata`;

  // Split the content at these markers
  const parts = content.split(startMarker);
  if (parts.length < 2) {
    console.error('Could not find the start marker in the file');
    process.exit(1);
  }

  const prefix = parts[0] + startMarker;
  const remainingParts = parts[1].split(endMarker);
  
  if (remainingParts.length < 2) {
    console.error('Could not find the end marker in the file');
    process.exit(1);
  }
  
  const suffix = endMarker + remainingParts[1];
  
  // Reconstruct the file with our fixed section
  const fixedContent = prefix + `
      taskId, 
      status: 'submitted',
      progress: 100,
      formType,
      metadataKeys: Object.keys(updatedMetadata)
    });
    ${updateSection}
  ` + suffix;
  
  // Write the fixed content back
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log('Successfully updated form submission handler with atomic update fix');
  
} catch (error) {
  console.error('Error fixing form submission handler:', error);
  process.exit(1);
}
/**
 * Fix KY3P Submission Status
 * 
 * This script corrects the issue where KY3P form submissions don't get properly marked
 * as "submitted" with 100% progress, unlike KYB forms.
 */

const { db } = require('./server/db');
const { tasks } = require('./server/db/schema');
const { eq } = require('drizzle-orm');

// Get the task ID from command line arguments
const taskId = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (!taskId || isNaN(taskId)) {
  console.error('❌ Please provide a valid task ID as an argument.');
  console.log('Usage: node fix-ky3p-submission-status.js TASK_ID');
  process.exit(1);
}

async function fixKy3pSubmissionStatus(taskId) {
  console.log(`🔍 Checking task ${taskId} status...`);
  
  try {
    // Get the current task state
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      console.error(`❌ Task ${taskId} not found.`);
      return false;
    }
    
    console.log(`📊 Current task state:`, {
      id: task.id,
      title: task.title,
      type: task.task_type,
      status: task.status,
      progress: task.progress
    });
    
    // Check if this is a KY3P task
    if (!task.task_type.includes('ky3p')) {
      console.error(`❌ Task ${taskId} is not a KY3P task (type: ${task.task_type}).`);
      return false;
    }
    
    // Update the task status to submitted
    const now = new Date();
    const submissionDate = now.toISOString();
    
    // Update task with submitted status, 100% progress and metadata
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        metadata: {
          ...task.metadata,
          submitted: true,
          submissionDate: submissionDate,
          submittedAt: submissionDate,
        },
        updated_at: now
      })
      .where(eq(tasks.id, taskId));
    
    console.log(`✅ Successfully updated KY3P task ${taskId}:`, {
      status: 'submitted',
      progress: 100,
      submissionDate
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Error updating task status:`, error);
    return false;
  }
}

fixKy3pSubmissionStatus(taskId).then((success) => {
  if (success) {
    console.log(`✅ KY3P task ${taskId} has been successfully marked as submitted.`);
    console.log(`ℹ️ To make this fix permanent, modify the KY3P form submission code to properly set status to 'submitted'.`);
  } else {
    console.log(`❌ Failed to fix KY3P task ${taskId}.`);
  }
  
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
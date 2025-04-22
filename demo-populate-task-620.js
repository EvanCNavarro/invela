/**
 * Demo data population script for task 620
 * 
 * This script imports and uses the existing demo data generators 
 * from our server code to fill task 620 with demo data.
 */

const { db } = require('./db');
const { eq } = require('drizzle-orm');
const { tasks } = require('./db/schema');

// Import the demo data generators directly from our server utilities
const { generateKybDemoData } = require('./server/routes/kyb-demo-autofill');
const { generateKy3pDemoData } = require('./server/routes/ky3p-demo-autofill');
const { generateOpenBankingDemoData } = require('./server/routes/open-banking-demo-autofill');

async function populateTaskWithDemoData(taskId) {
  console.log(`[Demo Populate] Starting to populate task ID ${taskId} with demo data`);
  
  try {
    // 1. First, determine the task type
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title, 
        task_type: tasks.task_type,
        metadata: tasks.metadata
      })
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      console.error(`[Demo Populate] Task ID ${taskId} not found`);
      return;
    }
    
    console.log(`[Demo Populate] Found task: ${task.title} (${task.task_type})`);
    console.log(`[Demo Populate] Task metadata:`, task.metadata);
    
    // 2. Call the appropriate demo data generator
    if (task.task_type === 'company_kyb') {
      console.log(`[Demo Populate] Generating KYB demo data for task ID ${taskId}`);
      await generateKybDemoData(taskId);
    } else if (task.task_type === 'ky3p' || task.task_type === 'security_assessment') {
      console.log(`[Demo Populate] Generating KY3P demo data for task ID ${taskId}`);
      await generateKy3pDemoData(taskId);
    } else if (task.task_type === 'open_banking') {
      console.log(`[Demo Populate] Generating Open Banking demo data for task ID ${taskId}`);
      await generateOpenBankingDemoData(taskId);
    } else {
      console.error(`[Demo Populate] Unsupported task type: ${task.task_type}`);
      return;
    }
    
    // 3. Mark the task as submitted
    await db
      .update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        metadata: {
          ...task.metadata,
          submitted: true,
          submitted_at: new Date().toISOString()
        }
      })
      .where(eq(tasks.id, taskId));
    
    console.log(`[Demo Populate] Task ID ${taskId} marked as submitted`);
    
  } catch (error) {
    console.error(`[Demo Populate] Error:`, error);
  }
}

// Run the script for task ID 620
populateTaskWithDemoData(620)
  .then(() => console.log('[Demo Populate] Script completed'))
  .catch(error => console.error('[Demo Populate] Unhandled error:', error));
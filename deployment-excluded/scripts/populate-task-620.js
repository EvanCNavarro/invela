/**
 * Script to populate task ID 620 with demo auto-fill data
 * 
 * This script will first check what type of task we're dealing with,
 * then use the appropriate demo-autofill endpoint to populate it.
 */

const axios = require('axios');
const { db } = require('./db');
const { eq } = require('drizzle-orm');
const { tasks } = require('./db/schema');

async function run() {
  try {
    console.log(`[Task Populator] Starting to populate task ID 620 with demo data`);
    
    // 1. First, check what type of task this is (KYB, KY3P, or Open Banking)
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        task_type: tasks.task_type,
        metadata: tasks.metadata
      })
      .from(tasks)
      .where(eq(tasks.id, 620));
    
    if (!task) {
      console.error(`[Task Populator] Task ID 620 not found`);
      return;
    }
    
    console.log(`[Task Populator] Found task: ${task.title} (${task.task_type})`);
    console.log(`[Task Populator] Task metadata:`, task.metadata);
    
    // 2. Based on the task type, call the appropriate demo-autofill endpoint
    let demoEndpoint = '';
    
    if (task.task_type === 'company_kyb') {
      demoEndpoint = '/api/kyb/demo-autofill/620';
    } else if (task.task_type === 'ky3p' || task.task_type === 'security_assessment') {
      demoEndpoint = '/api/ky3p/demo-autofill/620';
    } else if (task.task_type === 'open_banking') {
      demoEndpoint = '/api/open-banking/demo-autofill/620';
    } else {
      console.error(`[Task Populator] Unsupported task type: ${task.task_type}`);
      return;
    }
    
    console.log(`[Task Populator] Using endpoint: ${demoEndpoint}`);
    
    // 3. Call the demo-autofill endpoint to populate the task with demo data
    const response = await axios.post(`http://localhost:5000${demoEndpoint}`);
    
    if (response.status === 200) {
      console.log(`[Task Populator] Successfully populated task with demo data`);
      console.log(`[Task Populator] Response:`, response.data);
    } else {
      console.error(`[Task Populator] Failed to populate task with demo data. Status: ${response.status}`);
      console.error(response.data);
    }
    
    // 4. Additional step: Mark task as complete if necessary
    if (response.data.success && task.task_type === 'company_kyb') {
      // For KYB forms, also call the submit endpoint to mark it as complete
      const submitResponse = await axios.post(`http://localhost:5000/api/kyb/submit/620`);
      console.log(`[Task Populator] Submission response:`, submitResponse.data);
    }

    // A slower, more reliable approach for KY3P and Open Banking tasks
    if ((task.task_type === 'ky3p' || task.task_type === 'security_assessment' || task.task_type === 'open_banking') && response.data.success) {
      console.log(`[Task Populator] Setting submit flag for task`);
      
      // Update the task record to mark it as submitted
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
        .where(eq(tasks.id, 620));
      
      console.log(`[Task Populator] Task marked as submitted`);
    }
    
  } catch (error) {
    console.error(`[Task Populator] Error:`, error.message);
    if (error.response) {
      console.error(`[Task Populator] Response data:`, error.response.data);
    }
  }
}

run()
  .then(() => console.log(`[Task Populator] Script completed`))
  .catch(err => console.error(`[Task Populator] Unhandled error:`, err));
/**
 * Test script for KY3P status updates with the new fix
 */
async function testKy3pStatusUpdate() {
  try {
    // First, get the KY3P fields to find one to update
    console.log('Fetching KY3P fields...');
    const fieldsResponse = await fetch('/api/ky3p-fields');
    if (!fieldsResponse.ok) {
      throw new Error(`Failed to fetch KY3P fields: ${fieldsResponse.status} ${fieldsResponse.statusText}`);
    }
    
    const fields = await fieldsResponse.json();
    console.log(`Found ${fields.length} KY3P fields`);
    
    if (fields.length === 0) {
      throw new Error('No KY3P fields found');
    }
    
    // Next, get a list of tasks
    console.log('Fetching tasks...');
    const tasksResponse = await fetch('/api/tasks');
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Found ${tasks.length} tasks`);
    
    // Find a KY3P task
    const ky3pTask = tasks.find(t => t.task_type === 'ky3p' || t.task_type === 'security_assessment');
    if (!ky3pTask) {
      throw new Error('No KY3P task found');
    }
    
    console.log(`Found KY3P task: ID=${ky3pTask.id}, Type=${ky3pTask.task_type}`);
    
    // Get the first 5 fields
    const testFields = fields.slice(0, 5);
    console.log(`Using first ${testFields.length} fields for testing`);
    
    // Create a batch update with proper field status
    const updates = testFields.map(field => ({
      field_id: field.id,
      value: 'Test Value ' + Math.random().toString(36).substring(2, 7),
      status: 'COMPLETE', // Using uppercase status value
    }));
    
    console.log('Preparing batch update:', updates);
    
    // Send the batch update
    console.log(`Sending batch update to task ${ky3pTask.id}...`);
    const batchResponse = await fetch(`/api/ky3p-fields/${ky3pTask.id}/batch-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updates }),
    });
    
    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      throw new Error(`Batch update failed: ${batchResponse.status} ${batchResponse.statusText}\n${errorText}`);
    }
    
    const result = await batchResponse.json();
    console.log('Batch update result:', result);
    
    // Wait a moment for progress calculation
    console.log('Waiting for progress calculation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the task progress
    console.log(`Checking task ${ky3pTask.id} progress...`);
    const taskResponse = await fetch(`/api/tasks/${ky3pTask.id}`);
    if (!taskResponse.ok) {
      throw new Error(`Failed to fetch task: ${taskResponse.status} ${taskResponse.statusText}`);
    }
    
    const updatedTask = await taskResponse.json();
    console.log('Updated task:', {
      id: updatedTask.id,
      task_type: updatedTask.task_type,
      progress: updatedTask.progress,
      status: updatedTask.status,
    });
    
    return updatedTask;
  } catch (error) {
    console.error('Error in test script:', error);
    return null;
  }
}

// Execute the test
testKy3pStatusUpdate().then(result => {
  console.log('Test completed. Final progress:', result ? result.progress : 'N/A');
});

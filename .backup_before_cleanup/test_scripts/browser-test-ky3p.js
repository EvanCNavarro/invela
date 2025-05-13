// Browser Test Script for KY3P Progress Calculation
// Run this script in your browser console while logged in

async function testKy3pProgressCalculation() {
  try {
    console.log('=== KY3P Progress Calculation Test ===');
    
    // Step 1: Find a KY3P task
    console.log('Fetching tasks...');
    const tasksResponse = await fetch('/api/tasks');
    const tasks = await tasksResponse.json();
    
    const ky3pTask = tasks.find(t => t.task_type === 'ky3p' || t.task_type === 'security_assessment');
    if (!ky3pTask) {
      console.error('No KY3P task found. Please create a KY3P task and try again.');
      return;
    }
    
    console.log(`Found KY3P task: ID=${ky3pTask.id}, Type=${ky3pTask.task_type}, Progress=${ky3pTask.progress}`);
    
    // Step 2: Get KY3P fields
    console.log('Fetching KY3P fields...');
    const fieldsResponse = await fetch('/api/ky3p-fields');
    const fields = await fieldsResponse.json();
    
    console.log(`Found ${fields.length} KY3P fields`);
    
    // Step 3: Get 5 random fields to update
    const testFields = [];
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * fields.length);
      testFields.push(fields[randomIndex]);
    }
    
    console.log(`Selected ${testFields.length} random fields for testing`);
    
    // Step 4: Create a batch update
    const updates = testFields.map(field => ({
      field_id: field.id,
      value: `Test Value ${Math.random().toString(36).substring(2, 7)}`,
      status: 'COMPLETE', // Using uppercase status value
    }));
    
    console.log('Preparing batch update with these fields:', updates);
    
    // Step 5: Send the batch update
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
    
    // Step 6: Wait for progress calculation
    console.log('Waiting for progress calculation (2 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 7: Check task progress
    console.log(`Checking task ${ky3pTask.id} updated progress...`);
    const taskResponse = await fetch(`/api/tasks/${ky3pTask.id}`);
    const updatedTask = await taskResponse.json();
    
    console.log('Updated task progress:', {
      id: updatedTask.id,
      task_type: updatedTask.task_type,
      original_progress: ky3pTask.progress,
      new_progress: updatedTask.progress,
      status: updatedTask.status,
      difference: updatedTask.progress - ky3pTask.progress,
    });
    
    console.log('=== KY3P Progress Calculation Test Complete ===');
    return updatedTask;
    
  } catch (error) {
    console.error('Error during test:', error);
    return null;
  }
}

// Run the test
testKy3pProgressCalculation().then(result => {
  console.log('Test final result:', result ? `Progress ${result.progress}%` : 'Failed');
});

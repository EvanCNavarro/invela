/**
 * Emergency Fix Script for Task 709
 * 
 * This script fixes the missing file issue for task 709 by calling the fix-missing-file API endpoint
 * directly from the browser with proper authentication.
 */

// First try to identify what type of task we're dealing with
const taskId = 709;

console.log(`📋 Fixing missing file for task ${taskId}...`);

// Step 1: Check if the task exists and is submitted
fetch(`/api/tasks/${taskId}`)
  .then(response => response.json())
  .then(task => {
    if (!task) {
      console.error(`❌ Task ${taskId} not found`);
      return;
    }
    
    console.log('Found task:', task);
    console.log(`Task type: ${task.task_type}`);
    console.log(`Task status: ${task.status}`);
    
    // Step 2: Now call the fix-missing-file endpoint
    return fetch(`/api/forms/fix-missing-file/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
  })
  .then(response => response.json())
  .then(data => {
    console.log('Fix result:', data);
    
    if (data.success) {
      console.log(`✅ SUCCESS: File fixed successfully!`);
      console.log(`📄 File ID: ${data.fileId}`);
      console.log(`📄 File Name: ${data.fileName}`);
      console.log('\n🔍 The file should now appear in the File Vault tab. Please refresh the page to see it.');
      
      // Ask if user wants to navigate to file vault
      if (confirm('File fixed successfully! Would you like to view it in File Vault?')) {
        window.location.href = '/file-vault';
      }
    } else {
      console.error(`❌ ERROR: Failed to fix file: ${data.error || 'Unknown error'}`);
    }
  })
  .catch(error => {
    console.error(`❌ ERROR: Request failed: ${error.message}`);
  });

console.log('\n📡 Request sent. Waiting for response...');

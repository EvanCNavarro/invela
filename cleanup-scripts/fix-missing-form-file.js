/**
 * Fix Missing Form File for Any Task Type
 * 
 * This utility script calls the universal fix-missing-file endpoint to regenerate missing files
 * for any task type, solving the issue where files don't appear in the File Vault UI despite
 * forms being successfully submitted.
 * 
 * Usage: Run this script with a taskId parameter.
 * Example: fix-missing-form-file.js?taskId=709
 */

// Parse taskId from URL or prompt for it
const urlParams = new URLSearchParams(window.location.search);
let taskId = urlParams.get('taskId');

if (!taskId) {
  taskId = prompt('Enter the task ID for the missing file:');
}

if (!taskId || isNaN(parseInt(taskId)) || parseInt(taskId) <= 0) {
  console.error('⚠️ Invalid task ID provided. Please provide a valid task ID.');
} else {
  taskId = parseInt(taskId);
  console.log(`🔄 Fixing missing file for task ${taskId}...`);

  // Use the API endpoint we created
  fetch(`/api/forms/fix-missing-file/${taskId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      console.log(`✅ SUCCESS: File fixed successfully!`);
      console.log(`📄 File ID: ${data.fileId}`);
      console.log(`📄 File Name: ${data.fileName}`);
      console.log('\n🔍 The file should now appear in the File Vault tab.');
      
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
}

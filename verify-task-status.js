/**
 * Verify task status after form submission
 * 
 * This script checks the task status after a form submission to ensure
 * that the database updates were properly committed in the transaction.
 */

async function verifyTaskStatus() {
  const taskId = 762;
  
  try {
    console.log(`Verifying status for task ${taskId}...`);
    
    // Make the request to fetch the task
    const baseUrl = 'https://9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev';
    const response = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'  // Important to include cookies for auth
    });
    
    // Get the response data
    let taskData;
    try {
      taskData = await response.json();
    } catch (e) {
      taskData = { error: 'Failed to parse response JSON' };
    }
    
    // Print the full response
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log('Task data:', JSON.stringify(taskData, null, 2));
    
    // Analyze the task data to verify transaction success
    if (response.ok && taskData) {
      console.log('\n=== Task Status Analysis ===');
      
      // Check submission status
      const status = taskData.status;
      const progress = taskData.progress;
      const metadata = taskData.metadata || {};
      
      console.log(`Status: ${status}`);
      console.log(`Progress: ${progress}%`);
      console.log(`Metadata:`, metadata);
      
      // Verify that the task was marked as submitted
      if (status === 'submitted') {
        console.log('✅ Task status correctly set to "submitted"');
      } else {
        console.log(`❌ Unexpected task status: ${status} (expected "submitted")`);
      }
      
      // Verify progress is 100%
      if (progress === 100) {
        console.log('✅ Task progress correctly set to 100%');
      } else {
        console.log(`❌ Unexpected task progress: ${progress}% (expected 100%)`);
      }
      
      // Verify submission metadata
      if (metadata.submitted === true) {
        console.log('✅ Metadata "submitted" flag correctly set to true');
      } else {
        console.log(`❌ Missing or incorrect "submitted" flag in metadata`);
      }
      
      if (metadata.submissionDate) {
        console.log(`✅ Submission date recorded: ${metadata.submissionDate}`);
      } else {
        console.log(`❌ Missing submission date in metadata`);
      }
      
      // Check for file ID if applicable
      if (metadata.fileId) {
        console.log(`✅ File ID found in metadata: ${metadata.fileId}`);
      } else {
        console.log(`ℹ️ No file ID found in metadata (may be normal for some submissions)`);
      }
      
      // Overall success check
      const isSuccessful = status === 'submitted' && progress === 100 && metadata.submitted === true;
      
      if (isSuccessful) {
        console.log('\n✅ VERIFICATION SUCCESSFUL: Task transaction was properly committed!');
      } else {
        console.log('\n❌ VERIFICATION FAILED: Task transaction was not properly committed.');
      }
    } else {
      console.log(`❌ Failed to fetch task ${taskId}`);
      console.log('Error:', taskData);
    }
  } catch (error) {
    console.error(`❌ Error during verification:`, error);
  }
}

// Run the verification
verifyTaskStatus().then(() => {
  console.log('\nVerification completed.');
}).catch(err => {
  console.error('Verification failed with error:', err);
});
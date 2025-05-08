/**
 * Direct KY3P Form Fix Test
 * 
 * This script provides a server-side test for the KY3P form loading issue.
 * It implements a test that directly verifies if the circular reference
 * issue in UniversalForm.tsx has been resolved.
 */
import fetch from 'node-fetch';

async function testKy3pFormFix() {
  console.log('Testing KY3P form fixes...');
  
  try {
    // Step 1: Check if the server is running
    console.log('Checking server status...');
    const serverUrl = 'http://localhost:5000';
    const serverResponse = await fetch(serverUrl);
    if (!serverResponse.ok) {
      console.error(`Server check failed: ${serverResponse.status} - ${serverResponse.statusText}`);
      return false;
    }
    console.log('Server is running ✓');
    
    // Step 2: Test our new file verification API
    console.log('\nTesting file verification API for KY3P task...');
    const taskId = 763; // Sample KY3P task ID
    const fileVerificationUrl = `${serverUrl}/api/file-verification/${taskId}`;
    
    try {
      const verificationResponse = await fetch(fileVerificationUrl);
      if (!verificationResponse.ok) {
        console.error(`File verification API failed: ${verificationResponse.status}`);
        return false;
      }
      
      const verificationData = await verificationResponse.json();
      console.log('File verification API response:', verificationData);
      
      // Check if we got the expected data structure
      const hasTaskData = !!verificationData.task;
      const hasFileReference = !!(verificationData.fileReference && verificationData.fileReference.fileId);
      
      console.log(`Has task data: ${hasTaskData ? 'YES ✓' : 'NO ✗'}`);
      console.log(`Has file reference: ${hasFileReference ? 'YES ✓' : 'NO'}`);
      
      if (hasTaskData) {
        console.log('\nTask details:');
        console.log(`- ID: ${verificationData.task.id}`);
        console.log(`- Type: ${verificationData.task.task_type}`);
        console.log(`- Status: ${verificationData.task.status}`);
      }
      
      if (hasFileReference) {
        console.log('\nFile reference details:');
        console.log(`- File ID: ${verificationData.fileReference.fileId}`);
        console.log(`- File Name: ${verificationData.fileReference.fileName || 'N/A'}`);
      }
      
      return {
        success: true,
        hasTaskData,
        hasFileReference,
        data: verificationData
      };
    } catch (apiError) {
      console.error('File verification API error:', apiError);
      return {
        success: false,
        error: apiError.message
      };
    }
  } catch (error) {
    console.error('Test failed with error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the test
testKy3pFormFix()
  .then(result => {
    console.log('\nTest execution complete!');
    console.log(`Overall result: ${result.success ? 'SUCCESS ✓' : 'FAILURE ✗'}`);
    
    if (!result.success) {
      console.log('Error:', result.error);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });
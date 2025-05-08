/**
 * File Reference Test
 * 
 * This script tests our file reference fix by directly accessing the database
 * and verifying that the file reference is correctly retrieved for task 762.
 * 
 * Using CommonJS format to avoid ES module issues.
 */

// Import database client and schema
const { db } = require('./db');
const { tasks, files } = require('./db/schema');
const { eq } = require('drizzle-orm');

// Import the standardized file reference service
const fileReferenceService = require('./server/services/standardized-file-reference');
const { getFileReference, verifyFileReference } = fileReferenceService;

async function testFileReference() {
  console.log('Testing file reference fix...');
  
  try {
    // Test task ID
    const taskId = 762;
    
    // Get task data
    const taskData = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskData) {
      console.error(`Task ${taskId} not found.`);
      return;
    }
    
    console.log('Task metadata:', JSON.stringify(taskData.metadata, null, 2));
    
    // Get file reference
    console.log(`\nTesting getFileReference for task ${taskId}...`);
    const fileReference = await getFileReference(taskId);
    console.log('File reference:', fileReference);
    
    if (fileReference) {
      // Verify file exists
      const fileData = await db.query.files.findFirst({
        where: eq(files.id, fileReference.fileId)
      });
      
      console.log(`\nFile data for ID ${fileReference.fileId}:`, fileData ? {
        id: fileData.id,
        name: fileData.name,
        type: fileData.type
      } : 'File not found');
    }
    
    // Verify file reference
    console.log(`\nTesting verifyFileReference for task ${taskId}...`);
    const verificationResult = await verifyFileReference(taskId);
    console.log('Verification result:', verificationResult);
    
    console.log('\nTest completed successfully.');
  } catch (error) {
    console.error('Error testing file reference:', error);
  }
}

// Run the test
testFileReference();
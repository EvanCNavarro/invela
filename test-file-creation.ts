/**
 * Test script to create a file for company 256 (DevTest5) in the File Vault
 *
 * This script uses the FileCreationService directly to create a test file
 * for the current company, so we can verify that the file shows up in the File Vault.
 */

import { FileCreationService } from './server/services/file-creation';
import { db } from '@db';
import { Logger } from './server/utils/logger';

const logger = new Logger('TestFileCreation');

async function createTestFile() {
  logger.info('Creating test file for company 256 (DevTest5) and user 298...');

  // Create a simple CSV content
  const csvContent = 'Field,Response\nQuestion 1,Test answer 1\nQuestion 2,Test answer 2\nQuestion 3,Test answer 3';

  // Create the file using our service
  const result = await FileCreationService.createFile({
    name: 'test_file_devtest5_company.csv',
    content: csvContent,
    type: 'text/csv',
    userId: 298,  // Current user ID
    companyId: 256, // DevTest5 company ID
    metadata: {
      taskId: 832,
      taskType: 'kyb',
      formVersion: '1.0',
      submissionDate: new Date().toISOString(),
      companyId: 256, // Explicitly include companyId in metadata
      fields: ['question1', 'question2', 'question3']
    },
    status: 'uploaded'
  });

  logger.info('File creation result:', result);

  // Check if file was created successfully
  if (result.success && result.fileId) {
    logger.info(`File created successfully with ID ${result.fileId}`);
  } else {
    logger.error('File creation failed:', result.error);
  }
}

// Run the function
createTestFile().then(() => {
  logger.info('Test completed!');
  process.exit(0);
}).catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});

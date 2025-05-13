/**
 * Enhanced KY3P Form Service Test
 * 
 * This test file demonstrates how to use the EnhancedKY3PFormService
 * with string-based field keys for form operations.
 */

import { EnhancedKY3PFormService } from './enhanced-ky3p-form-service';

// Demo field data for testing
const mockFieldData = {
  'securityPolicy': 'Yes',
  'policyReviewFrequency': 'Annual',
  'cipherStrength': '256-bit',
  'dataEncryptionAtRest': 'Yes',
  'dataEncryptionInTransit': 'Yes',
  'strongCipherEnforcement': 'Yes',
};

/**
 * Run a basic test of the enhanced KY3P form service functionality
 * 
 * @param taskId The task ID to test with
 */
export async function testEnhancedKY3PService(taskId: number): Promise<void> {
  console.log(`[EnhancedKY3PService Test] Starting test for task ${taskId}`);
  
  // Create an instance of the enhanced service
  const service = new EnhancedKY3PFormService();
  
  // Initialize with the task ID
  service.initialize(taskId);
  
  // Load form data
  await service.loadFormData();
  
  console.log('[EnhancedKY3PService Test] Form data loaded');
  
  // Generate and log field statistics
  const fields = service.getFields();
  const sections = service.getSections();
  
  console.log(`[EnhancedKY3PService Test] Form has ${fields.length} fields and ${sections.length} sections`);
  
  // Test if the form is complete
  const isComplete = service.isFormComplete();
  console.log(`[EnhancedKY3PService Test] Form complete status: ${isComplete}`);
  
  // Test getting form progress
  const progress = service.getFormProgress();
  console.log(`[EnhancedKY3PService Test] Form progress: ${progress}%`);
  
  // Test bulk update with the mock field data
  console.log('[EnhancedKY3PService Test] Performing bulk update with test data');
  try {
    const bulkUpdateResult = await service.bulkUpdate(taskId, mockFieldData);
    console.log(`[EnhancedKY3PService Test] Bulk update result: ${bulkUpdateResult ? 'Success' : 'Failed'}`);
  } catch (error) {
    console.error('[EnhancedKY3PService Test] Bulk update error:', error);
  }
  
  // Test saving progress
  console.log('[EnhancedKY3PService Test] Saving form progress');
  try {
    await service.saveProgress(taskId);
    console.log('[EnhancedKY3PService Test] Progress saved successfully');
  } catch (error) {
    console.error('[EnhancedKY3PService Test] Save progress error:', error);
  }
  
  // Test getting the first section
  const firstSection = service.getFirstSection();
  console.log('[EnhancedKY3PService Test] First section:', firstSection?.title || 'None');
  
  // Test clearing fields
  console.log('[EnhancedKY3PService Test] Testing clear fields functionality');
  try {
    const clearResult = await service.clearFields(taskId);
    console.log(`[EnhancedKY3PService Test] Clear fields result: ${clearResult ? 'Success' : 'Failed'}`);
  } catch (error) {
    console.error('[EnhancedKY3PService Test] Clear fields error:', error);
  }
  
  console.log('[EnhancedKY3PService Test] Test completed');
}

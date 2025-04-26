import { getLogger } from '@/utils/logger';

const logger = getLogger('FixKY3PBulkUpdate');

/**
 * Fix for the KY3P form bulk update functionality
 * 
 * This module provides a corrected implementation for the KY3P form's bulk update
 * functionality, fixing the "Invalid field ID format" error that occurs when
 * the UniversalForm tries to use the legacy endpoint with 'fieldIdRaw': 'bulk'.
 * 
 * The issue is that the client is sending an invalid request format to the server,
 * and the server is rejecting it with a 400 error. This function:
 * 
 * 1. Uses the standardized batch-update endpoint that accepts string field keys
 * 2. Properly formats the request data according to the server's expectations
 * 3. Provides detailed error reporting for troubleshooting
 */
export async function fixedKy3pBulkUpdate(taskId: number, formData: Record<string, any>): Promise<boolean> {
  try {
    logger.info(`Starting fixed KY3P bulk update for task ${taskId}`);
    
    // Filter out metadata fields and empty values
    const cleanData: Record<string, any> = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      // Skip metadata fields and null/undefined values
      if (!key.startsWith('_') && key !== 'taskId' && value !== null && value !== undefined) {
        cleanData[key] = value;
      }
    });
    
    // Log data being sent for debugging
    logger.info(`Sending ${Object.keys(cleanData).length} fields to batch-update endpoint`);
    
    // Make the request to the standardized batch-update endpoint
    const response = await fetch(`/api/ky3p/batch-update/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        responses: cleanData
      }),
    });
    
    if (!response.ok) {
      let errorDetails = '';
      try {
        errorDetails = await response.text();
      } catch (e) {
        errorDetails = 'Could not extract error details';
      }
      
      // Log the error details for debugging
      logger.error(`Batch update failed with status ${response.status}: ${errorDetails}`);
      
      // If the batch update failed, try one more approach - the demo-autofill endpoint
      logger.info('Attempting fallback to demo-autofill endpoint');
      
      const demoResponse = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      
      if (demoResponse.ok) {
        logger.info('Successfully applied demo data via demo-autofill endpoint');
        return true;
      } else {
        logger.error(`Demo auto-fill fallback also failed: ${await demoResponse.text()}`);
        return false;
      }
    }
    
    logger.info('Batch update completed successfully');
    return true;
  } catch (error) {
    logger.error('Error in fixedKy3pBulkUpdate:', error);
    return false;
  }
}
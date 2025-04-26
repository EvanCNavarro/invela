/**
 * Standardized KY3P Update Utility
 * 
 * This module provides a standardized approach to updating KY3P form data,
 * which addresses the "Invalid field ID format" error that occurs when
 * the client sends fieldIdRaw: "bulk" in the request.
 * 
 * It provides a function that implements the correct way to do batch updates
 * using the string-based field keys.
 */

import getLogger from '@/utils/logger';

const logger = getLogger('KY3P-Update');

/**
 * Perform a standardized bulk update for KY3P forms using string-based field keys
 * 
 * @param taskId The task ID
 * @param formData Form data as a record of field keys to values
 * @returns Promise<boolean> indicating success or failure
 */
export async function standardizedBulkUpdate(
  taskId: number,
  formData: Record<string, any>
): Promise<boolean> {
  logger.info(`Using standardized batch update for task ${taskId} with ${Object.keys(formData).length} fields`);

  try {
    // Skip metadata fields (starting with _)
    const cleanData = { ...formData };
    Object.keys(cleanData).forEach(key => {
      if (key.startsWith('_') || key === 'taskId') {
        delete cleanData[key];
      }
    });

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
      const errorText = await response.text();
      logger.error(`Standardized bulk update failed with status ${response.status}: ${errorText}`);
      
      // Try the demo autofill endpoint as a fallback if we're likely in an autofill scenario
      if (Object.keys(cleanData).length === 0 || 
          (formData.responseValue === 'undefined' && formData.fieldIdRaw === 'bulk')) {
        logger.info('Detected potential demo autofill request, redirecting to demo-autofill endpoint');
        
        const demoResponse = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (demoResponse.ok) {
          logger.info('Successfully used demo-autofill fallback');
          return true;
        } else {
          logger.error(`Demo autofill fallback failed: ${await demoResponse.text()}`);
        }
      }
      
      return false;
    }

    logger.info(`Successfully updated form data using standardized batch update for task ${taskId}`);
    return true;
  } catch (error) {
    logger.error('Error in standardized bulk update:', error);
    return false;
  }
}

/**
 * Legacy compatibility function that matches the signature expected by KY3PFormService
 * This allows us to swap in our implementation without changing the calling code
 */
export async function fixedKy3pBulkUpdate(
  taskId: number,
  formData: Record<string, any>
): Promise<boolean> {
  return standardizedBulkUpdate(taskId, formData);
}
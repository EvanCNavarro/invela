/**
 * Standardized KY3P Bulk Update
 * 
 * This module provides a standardized approach for bulk updating KY3P form fields
 * using string-based field keys. It resolves the "Invalid field ID format" error 
 * by properly formatting the request and handling the special bulk update case.
 */

import getLogger from "@/utils/logger";

const logger = getLogger('KY3P-Standardized-Update');

/**
 * Perform a bulk update for KY3P form using the proper field ID format
 * 
 * This function provides a fix for the "Invalid field ID format" error
 * that occurs when using fieldIdRaw: "bulk" in the request.
 * 
 * It attempts multiple approaches, with preference for the most standardized method:
 * 1. First, tries the batch-update endpoint with string field keys
 * 2. If that fails, formats the fields into proper request objects with field IDs
 * 3. As a last resort, falls back to individual field updates
 * 
 * @param taskId The task ID
 * @param formData The form data to bulk update
 * @returns Promise<boolean> Success or failure status
 */
export async function standardizedBulkUpdate(taskId: number, formData: Record<string, any>): Promise<boolean> {
  logger.info(`Performing standardized bulk update for task ${taskId} with ${Object.keys(formData).length} fields`);
  
  if (Object.keys(formData).length === 0) {
    logger.warn('No fields to update, skipping bulk update');
    return true;
  }
  
  // First, try the batch-update endpoint which accepts string field keys
  try {
    logger.info('Attempting batch update with string field keys');
    
    const response = await fetch(`/api/tasks/${taskId}/ky3p-batch-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        responses: formData
      }),
    });
    
    if (response.ok) {
      logger.info('Batch update successful');
      return true;
    }
    
    logger.warn(`Batch update failed: ${await response.text()}`);
  } catch (error) {
    logger.error('Error during batch update:', error);
  }
  
  // Second approach: Try the responses/bulk endpoint with properly formatted data
  try {
    logger.info('Attempting bulk update with formatted response array');
    
    // Format the data into an array of { fieldKey, value } objects
    const formattedResponses = Object.entries(formData).map(([fieldKey, value]) => ({
      fieldKey,
      value
    }));
    
    const response = await fetch(`/api/tasks/${taskId}/ky3p-responses/bulk-format`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        responses: formattedResponses
      }),
    });
    
    if (response.ok) {
      logger.info('Bulk update with formatted responses successful');
      return true;
    }
    
    logger.warn(`Bulk update with formatted responses failed: ${await response.text()}`);
  } catch (error) {
    logger.error('Error during bulk update with formatted responses:', error);
  }
  
  // Last resort: Update fields individually
  try {
    logger.info('Falling back to individual field updates');
    
    let successCount = 0;
    const totalFields = Object.keys(formData).length;
    
    for (const [fieldKey, value] of Object.entries(formData)) {
      if (fieldKey.startsWith('_') || fieldKey === 'taskId') {
        continue; // Skip metadata fields
      }
      
      try {
        const response = await fetch(`/api/ky3p/responses/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fieldIdRaw: fieldKey,
            responseValue: value,
            responseValueType: typeof value
          }),
        });
        
        if (response.ok) {
          successCount++;
        } else {
          logger.warn(`Failed to update field ${fieldKey}: ${await response.text()}`);
        }
      } catch (fieldError) {
        logger.error(`Error updating field ${fieldKey}:`, fieldError);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const successRate = (successCount / totalFields) * 100;
    logger.info(`Individual updates completed: ${successCount}/${totalFields} fields updated (${successRate.toFixed(1)}%)`);
    
    return successCount > 0;
  } catch (error) {
    logger.error('Error during individual field updates:', error);
    return false;
  }
}
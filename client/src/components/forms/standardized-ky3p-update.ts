/**
 * Standardized KY3P Batch Update
 * 
 * This module provides a standardized approach to updating KY3P form fields
 * using string-based field keys, ensuring compatibility with the universal
 * form components.
 */

import { apiRequest } from "@/lib/queryClient";
import getLogger from "@/utils/logger";

const logger = getLogger('StandardizedKY3PUpdate');

/**
 * Perform a standardized bulk update for a KY3P form
 * 
 * This function handles both single field updates and bulk updates
 * with proper error handling and fallback logic.
 * 
 * @param taskId The task ID
 * @param formData The form data to update (field keys to values)
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function standardizedBulkUpdate(
  taskId: number,
  formData: Record<string, any>
): Promise<boolean> {
  try {
    logger.info(`Performing standardized bulk update for task ${taskId} with ${Object.keys(formData).length} fields`);
    
    // First attempt: Use the batch update endpoint
    try {
      const batchResponse = await apiRequest('POST', `/api/ky3p-task/${taskId}/batch-update`, {
        fields: formData
      });
      
      if (batchResponse.ok) {
        logger.info(`Batch update successful for task ${taskId}`);
        return true;
      }
    } catch (error) {
      logger.warn('Batch update failed, falling back to individual updates:', error);
    }
    
    // Second attempt: Convert to individual field updates
    try {
      // Create an array of field update promises
      const updatePromises = Object.entries(formData).map(async ([fieldKey, value]) => {
        try {
          const response = await apiRequest('POST', `/api/ky3p-task/${taskId}/update-field`, {
            fieldKey,
            value
          });
          
          return response.ok;
        } catch (fieldError) {
          logger.error(`Error updating field ${fieldKey}:`, fieldError);
          return false;
        }
      });
      
      // Wait for all update promises to resolve
      const results = await Promise.all(updatePromises);
      
      // Check if all updates were successful
      const allSuccessful = results.every(result => result === true);
      
      if (allSuccessful) {
        logger.info(`Individual field updates successful for task ${taskId}`);
        return true;
      } else {
        logger.warn(`Some individual field updates failed for task ${taskId}`);
        return false;
      }
    } catch (error) {
      logger.error('Individual updates failed:', error);
      return false;
    }
  } catch (error) {
    logger.error(`Error in standardized bulk update for task ${taskId}:`, error);
    return false;
  }
}